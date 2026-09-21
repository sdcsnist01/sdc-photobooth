import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraState, CameraStatus } from '@/types/photobooth'

const PREFERRED_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: { ideal: 16 / 9 },
    facingMode: 'user',
  },
  audio: false,
}

const FALLBACK_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
  audio: false,
}

const BARE_CONSTRAINTS: MediaStreamConstraints = {
  video: true,
  audio: false,
}

const INITIAL_STATE: CameraState = {
  status: 'idle',
  error: null,
  stream: null,
  facingMode: 'user',
}

export function useCamera() {
  const [state, setState] = useState<CameraState>(INITIAL_STATE)
  const streamRef = useRef<MediaStream | null>(null)

  const setStatus = (status: CameraStatus, error: string | null = null) =>
    setState((prev) => ({ ...prev, status, error }))

  /** Stop all tracks on the current stream */
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setState((prev) => ({ ...prev, stream: null }))
  }, [])

  const requestCamera = useCallback(async (facingMode: 'user' | 'environment' = 'user') => {
    setStatus('requesting')

    const constraintsList = [
      { ...PREFERRED_CONSTRAINTS, video: { ...(PREFERRED_CONSTRAINTS.video as object), facingMode } },
      { ...FALLBACK_CONSTRAINTS, video: { ...(FALLBACK_CONSTRAINTS.video as object), facingMode } },
      BARE_CONSTRAINTS,
    ]

    let stream: MediaStream | null = null
    let lastError: Error | null = null

    for (const constraints of constraintsList) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        break
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
        if (lastError.name === 'NotAllowedError') break // Don't retry on denial
      }
    }

    if (!stream) {
      const errName = lastError?.name ?? ''
      if (errName === 'NotAllowedError') {
        setStatus('denied', 'Camera access was denied.')
      } else if (errName === 'NotFoundError') {
        setStatus('unavailable', 'No camera was found on this device.')
      } else if (errName === 'NotReadableError') {
        setStatus('unavailable', 'Camera is in use by another application.')
      } else {
        setStatus('unavailable', lastError?.message ?? 'Could not access camera.')
      }
      return
    }

    // Listen for track ending (camera disconnected or revoked)
    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        setStatus('disconnected', 'Camera was disconnected.')
        streamRef.current = null
      })
    })

    streamRef.current = stream
    setState({ status: 'active', stream, error: null, facingMode })
  }, [])

  const flipCamera = useCallback(() => {
    const next = state.facingMode === 'user' ? 'environment' : 'user'
    stopStream()
    void requestCamera(next)
  }, [state.facingMode, stopStream, requestCamera])

  // Listen for camera device changes (hot-plug / unplug)
  useEffect(() => {
    const handleDeviceChange = () => {
      if (state.status === 'disconnected' || state.status === 'unavailable') {
        // A new device might have been plugged in — try again
        void requestCamera(state.facingMode)
      }
    }
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
    }
  }, [state.status, state.facingMode, requestCamera])

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      stopStream()
    }
  }, [stopStream])

  return {
    ...state,
    requestCamera,
    stopStream,
    flipCamera,
  }
}
