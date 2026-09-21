import { useCallback, useReducer } from 'react'
import { supabase } from '@/lib/supabase'
import { generateSecureToken } from '@/utils/token'
import { uploadPhoto } from '@/utils/upload'
import { generateQRCode } from '@/utils/qr'
import { GALLERY_BASE_PATH } from '@/lib/constants'
import type { DbSession, DbPhoto } from '@/types/database'
import type {
  BoothSessionState,
  BoothStep,
  CapturedPhoto,
  PhotoUploadStatus,
} from '@/types/photobooth'

// ─── State & Actions ──────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_PHOTO'; photo: CapturedPhoto }
  | { type: 'REMOVE_PHOTO'; localId: string }
  | { type: 'SET_STEP'; step: BoothStep }
  | { type: 'SET_SESSION'; sessionId: string; secureToken: string }
  | { type: 'UPDATE_PHOTO_UPLOAD'; localId: string; status: PhotoUploadStatus; progress: number; storagePath?: string; dbId?: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' }

const INITIAL_STATE: BoothSessionState = {
  step: 'capture',
  sessionId: null,
  secureToken: null,
  photos: [],
  overallError: null,
}

function reducer(state: BoothSessionState, action: Action): BoothSessionState {
  switch (action.type) {
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.photo] }

    case 'REMOVE_PHOTO': {
      const photo = state.photos.find((p) => p.localId === action.localId)
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      return { ...state, photos: state.photos.filter((p) => p.localId !== action.localId) }
    }

    case 'SET_STEP':
      return { ...state, step: action.step, overallError: null }

    case 'SET_SESSION':
      return { ...state, sessionId: action.sessionId, secureToken: action.secureToken }

    case 'UPDATE_PHOTO_UPLOAD':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.localId === action.localId
            ? {
                ...p,
                uploadStatus: action.status,
                uploadProgress: action.progress,
                storagePath: action.storagePath ?? p.storagePath,
                dbId: action.dbId ?? p.dbId,
              }
            : p
        ),
      }

    case 'SET_ERROR':
      return { ...state, step: 'error', overallError: action.error }

    case 'RESET': {
      state.photos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl)
      })
      return INITIAL_STATE
    }

    default:
      return state
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  const addPhoto = useCallback((photo: CapturedPhoto) => {
    dispatch({ type: 'ADD_PHOTO', photo })
  }, [])

  const removePhoto = useCallback((localId: string) => {
    dispatch({ type: 'REMOVE_PHOTO', localId })
  }, [])

  const finishSession = useCallback(
    async (photos: CapturedPhoto[]): Promise<{ galleryUrl: string; qrDataUrl: string }> => {
      dispatch({ type: 'SET_STEP', step: 'uploading' })

      const secureToken = generateSecureToken()

      // 1. Create session row
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sessionData, error: sessionError } = await (supabase
        .from('sessions') as any)
        .insert({ secure_token: secureToken, status: 'uploading', photo_count: 0 })
        .select('id')
        .single()

      if (sessionError || !sessionData) {
        dispatch({ type: 'SET_ERROR', error: 'Could not create session. Please try again.' })
        throw new Error(sessionError?.message ?? 'Session creation failed')
      }

      const sessionId = (sessionData as Pick<DbSession, 'id'>).id
      dispatch({ type: 'SET_SESSION', sessionId, secureToken })

      // 2. Upload photos sequentially
      let successCount = 0

      for (const photo of photos) {
        dispatch({
          type: 'UPDATE_PHOTO_UPLOAD',
          localId: photo.localId,
          status: 'uploading',
          progress: 0,
        })

        try {
          const { storagePath } = await uploadPhoto(
            sessionId,
            photo.localId,
            photo.blob,
            photo.mimeType,
            (pct) => {
              dispatch({
                type: 'UPDATE_PHOTO_UPLOAD',
                localId: photo.localId,
                status: 'uploading',
                progress: pct,
              })
            }
          )

          const ext = photo.mimeType === 'image/webp' ? 'webp' : 'jpg'
          const filename = `photo-${String(photo.captureOrder + 1).padStart(2, '0')}.${ext}`

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: photoData, error: photoError } = await (supabase
            .from('photos') as any)
            .insert({
              session_id: sessionId,
              storage_path: storagePath,
              filename,
              file_size: photo.blob.size,
              width: photo.width,
              height: photo.height,
              mime_type: photo.mimeType,
              capture_order: photo.captureOrder,
            })
            .select('id')
            .single()

          if (photoError || !photoData) throw new Error(photoError?.message ?? 'DB insert failed')

          const photoId = (photoData as Pick<DbPhoto, 'id'>).id

          dispatch({
            type: 'UPDATE_PHOTO_UPLOAD',
            localId: photo.localId,
            status: 'success',
            progress: 100,
            storagePath,
            dbId: photoId,
          })
          successCount++
        } catch (err) {
          console.error('Photo upload failed:', err)
          dispatch({
            type: 'UPDATE_PHOTO_UPLOAD',
            localId: photo.localId,
            status: 'failed',
            progress: 0,
          })
        }
      }

      // 3. Mark session complete or failed
      const finalStatus = successCount === photos.length ? 'complete' : 'failed'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('sessions') as any)
        .update({
          status: finalStatus,
          completed_at: new Date().toISOString(),
          photo_count: successCount,
        })
        .eq('id', sessionId)

      if (finalStatus === 'failed') {
        dispatch({ type: 'SET_ERROR', error: 'Some photos failed to upload. Please retry.' })
        throw new Error('One or more photos failed to upload')
      }

      // 4. Generate QR
      const appBaseUrl =
        (import.meta.env.VITE_APP_BASE_URL as string | undefined) ?? window.location.origin
      const galleryUrl = `${appBaseUrl}${GALLERY_BASE_PATH}/${secureToken}`
      const qrDataUrl = await generateQRCode(galleryUrl)

      dispatch({ type: 'SET_STEP', step: 'complete' })
      return { galleryUrl, qrDataUrl }
    },
    []
  )

  const resetSession = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  return {
    ...state,
    addPhoto,
    removePhoto,
    finishSession,
    resetSession,
  }
}
