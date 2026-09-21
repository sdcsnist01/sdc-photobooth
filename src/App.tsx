import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { BoothPage } from '@/pages/BoothPage'
import { GalleryPage } from '@/pages/GalleryPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BoothPage />} />
        <Route path="/gallery/:token" element={<GalleryPage />} />
        {/* Catch-all: redirect unknown routes to booth */}
        <Route path="*" element={<BoothPage />} />
      </Routes>
    </BrowserRouter>
  )
}
