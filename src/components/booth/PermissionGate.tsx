import { Camera, WifiOff, RefreshCw, Settings } from 'lucide-react'

interface Props {
  status: 'denied' | 'unavailable' | 'disconnected'
  error: string | null
  onRetry: () => void
}

const MESSAGES = {
  denied: {
    icon: <Settings size={40} className="text-amber-400" />,
    title: 'Camera Access Denied',
    body: 'Please allow camera access in your browser settings and refresh the page.',
    steps: [
      'Click the camera icon or lock icon in your browser address bar',
      'Set Camera to "Allow"',
      'Click the Retry button below',
    ],
  },
  unavailable: {
    icon: <Camera size={40} className="text-red-400" />,
    title: 'Camera Not Found',
    body: 'No camera was detected. Please connect a webcam and try again.',
    steps: [
      'Ensure a webcam is connected to this computer',
      'Close other applications that might be using the camera',
      'Click the Retry button below',
    ],
  },
  disconnected: {
    icon: <WifiOff size={40} className="text-orange-400" />,
    title: 'Camera Disconnected',
    body: 'The camera was disconnected. Please reconnect it and try again.',
    steps: [
      'Reconnect the webcam to this computer',
      'Click the Retry button below',
    ],
  },
}

export function PermissionGate({ status, error, onRetry }: Props) {
  const msg = MESSAGES[status]

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center fade-in">
      <div className="glass rounded-3xl p-10 max-w-md w-full shadow-card space-y-6">
        <div className="flex justify-center">{msg.icon}</div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">{msg.title}</h1>
          <p className="text-slate-300 text-sm leading-relaxed">{msg.body}</p>
          {error && (
            <p className="mt-2 text-xs text-red-400 font-mono bg-red-950/30 rounded px-3 py-1">
              {error}
            </p>
          )}
        </div>
        <ol className="text-left space-y-2">
          {msg.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-600/40 text-brand-300 text-xs flex items-center justify-center font-bold mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <button
          id="camera-retry-btn"
          onClick={onRetry}
          className="btn-primary w-full"
        >
          <RefreshCw size={16} />
          Retry Camera
        </button>
      </div>
    </div>
  )
}
