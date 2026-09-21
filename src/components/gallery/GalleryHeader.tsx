import { Clock } from 'lucide-react'

interface Props {
  photoCount: number
  createdAt: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function GalleryHeader({ photoCount, createdAt }: Props) {
  return (
    <div className="glass-dark border-b border-white/10 px-4 py-5 text-center">
      {/* Logo / Brand */}
      <div className="flex flex-col items-center justify-center gap-1 mb-2">
        <img src="/sdc-logo.png" alt="SDC – Student Developers Community" className="h-7 w-auto" draggable={false} />
        <span className="flex items-baseline gap-1.5"><span className="ux-bubble-word text-2xl">UXplosion</span><span className="ux-bubble-three text-xl">3.0</span></span>
      </div>
      <h1 className="text-xl font-bold gradient-text mb-1">Your Photos</h1>
      <div className="flex items-center justify-center gap-3 text-slate-400 text-xs">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {formatDate(createdAt)}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-600" />
        <span>{photoCount} photo{photoCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
