import { useCallback, useReducer } from 'react'
import { uploadPhoto } from '@/utils/upload'
import { generateQRCode } from '@/utils/qr'
import { GALLERY_BASE_PATH } from '@/lib/constants'
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
  | { type: 'RESTORE_PHOTO'; photo: CapturedPhoto; index: number }
  | { type: 'SET_STEP'; step: BoothStep }
  | { type: 'SET_SESSION'; boothToken: string; secureToken: string }
  | { type: 'UPDATE_PHOTO_UPLOAD'; localId: string; status: PhotoUploadStatus; progress: number; dbId?: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'RESET' }

const INITIAL_STATE: BoothSessionState = {
  step: 'capture',
  boothToken: null,
  secureToken: null,
  photos: [],
  overallError: null,
}

function reducer(state: BoothSessionState, action: Action): BoothSessionState {
  switch (action.type) {
    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.photo] }

    // The preview URL is kept alive so the removal can be undone; call discardPhoto to free it.
    case 'REMOVE_PHOTO':
      return { ...state, photos: state.photos.filter((p) => p.localId !== action.localId) }

    case 'RESTORE_PHOTO': {
      const photos = [...state.photos]
      photos.splice(Math.min(action.index, photos.length), 0, action.photo)
      return { ...state, photos }
    }

    case 'SET_STEP':
      return { ...state, step: action.step, overallError: null }

    case 'SET_SESSION':
      return { ...state, boothToken: action.boothToken, secureToken: action.secureToken }

    case 'UPDATE_PHOTO_UPLOAD':
      return {
        ...state,
        photos: state.photos.map((p) =>
          p.localId === action.localId
            ? {
                ...p,
                uploadStatus: action.status,
                uploadProgress: action.progress,
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

  const restorePhoto = useCallback((photo: CapturedPhoto, index: number) => {
    dispatch({ type: 'RESTORE_PHOTO', photo, index })
  }, [])

  const discardPhoto = useCallback((photo: CapturedPhoto) => {
    URL.revokeObjectURL(photo.previewUrl)
  }, [])

  const finishSession = useCallback(
    async (photos: CapturedPhoto[]): Promise<{ galleryUrl: string; qrDataUrl: string }> => {
      dispatch({ type: 'SET_STEP', step: 'uploading' })

      // 1. Create session (tokens are generated server-side)
      let boothToken: string
      let secureToken: string
      try {
        const res = await fetch('/api/booth/session', { method: 'POST' })
        if (!res.ok) throw new Error(`Session creation failed (${res.status})`)
        ;({ boothToken, secureToken } = (await res.json()) as {
          boothToken: string
          secureToken: string
        })
      } catch (err) {
        dispatch({ type: 'SET_ERROR', error: 'Could not create session. Please try again.' })
        throw err
      }

      dispatch({ type: 'SET_SESSION', boothToken, secureToken })

      // 2. Upload photos sequentially
      let successCount = 0

      for (const [order, photo] of photos.entries()) {
        dispatch({
          type: 'UPDATE_PHOTO_UPLOAD',
          localId: photo.localId,
          status: 'uploading',
          progress: 0,
        })

        try {
          const { photoId } = await uploadPhoto(
            {
              boothToken,
              localId: photo.localId,
              blob: photo.blob,
              mimeType: photo.mimeType,
              captureOrder: order,
              width: photo.width,
              height: photo.height,
            },
            (pct) => {
              dispatch({
                type: 'UPDATE_PHOTO_UPLOAD',
                localId: photo.localId,
                status: 'uploading',
                progress: pct,
              })
            }
          )

          dispatch({
            type: 'UPDATE_PHOTO_UPLOAD',
            localId: photo.localId,
            status: 'success',
            progress: 100,
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
      const completeRes = await fetch('/api/booth/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boothToken, status: finalStatus }),
      }).catch(() => null)

      if (finalStatus === 'failed' || !completeRes?.ok) {
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
    restorePhoto,
    discardPhoto,
    finishSession,
    resetSession,
  }
}
