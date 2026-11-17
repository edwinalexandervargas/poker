import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Fonts are bundled with the app (not fetched from Google): no extra connection before the first
// paint, and they are cached forever like the rest of the hashed assets. Only the subsets a page
// uses are downloaded.
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
