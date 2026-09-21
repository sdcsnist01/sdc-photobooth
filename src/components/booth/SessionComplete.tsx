import { CheckCircle, PlusCircle, Smartphone } from 'lucide-react'
import { QRDisplay } from './QRDisplay'

interface Props {
  qrDataUrl: string
  galleryUrl: string
  photoCount: number
  onNewSession: () => void
}

export function SessionComplete({ qrDataUrl, galleryUrl, photoCount, onNewSession }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 text-center fade-in">
      {/* Success header */}
      <div className="flex flex-col items-center gap-2">
        <CheckCircle size={40} className="text-emerald-400" />
        <h2 className="text-2xl font-bold text-white">Session Complete!</h2>
        <p className="text-slate-300 text-sm">
          {photoCount} photo{photoCount !== 1 ? 's' : ''} uploaded successfully.
        </p>
      </div>

      {/* QR code */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 justify-center text-brand-300 text-sm font-semibold">
          <Smartphone size={16} />
          Scan with your phone
        </div>
        <QRDisplay qrDataUrl={qrDataUrl} galleryUrl={galleryUrl} />
      </div>

      {/* New session button */}
      <button
        id="new-session-btn"
        onClick={onNewSession}
        className="btn-primary w-full max-w-xs"
      >
        <PlusCircle size={16} />
        Start New Session
      </button>
    </div>
  )
}
