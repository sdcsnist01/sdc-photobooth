import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BoothPage } from '@/pages/BoothPage'
import { GalleryPage } from '@/pages/GalleryPage'
import UxplosionParticles from '@/components/UxplosionParticles'

export function App() {
  return (
    <BrowserRouter>
      <UxplosionParticles />
      <div className="relative z-10">
      <Routes>
        <Route path="/" element={<BoothPage />} />
        <Route path="/gallery/:token" element={<GalleryPage />} />
        {/* Catch-all: redirect unknown routes to booth */}
        <Route path="*" element={<BoothPage />} />
      </Routes>
      </div>
    </BrowserRouter>
  )
}
