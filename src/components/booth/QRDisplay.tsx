import { Download, ExternalLink } from 'lucide-react'

interface Props {
  qrDataUrl: string
  galleryUrl: string
}

export function QRDisplay({ qrDataUrl, galleryUrl }: Props) {
  const handleDownloadQR = () => {
    const a = document.createElement('a')
    a.href = qrDataUrl
    a.download = 'uxplosion-photobooth-qr.png'
    a.click()
  }

  return (
    <div className="flex flex-col items-center gap-5 fade-in">
      {/* QR code */}
      <div className="qr-container">
        <img
          id="qr-code-img"
          src={qrDataUrl}
          alt="Gallery QR code"
          width={260}
          height={260}
          className="block"
        />
      </div>

      {/* URL text */}
      <div className="text-center space-y-1">
        <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Scan to view photos</p>
        <a
          href={galleryUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-300 text-xs break-all hover:text-brand-200 transition-colors flex items-center gap-1 justify-center"
        >
          {galleryUrl}
          <ExternalLink size={10} className="flex-shrink-0" />
        </a>
      </div>

      {/* Download QR as fallback */}
      <button
        id="download-qr-btn"
        onClick={handleDownloadQR}
        className="btn-secondary text-sm py-2 px-4"
      >
        <Download size={14} />
        Download QR Code
      </button>
    </div>
  )
}
