import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Library from './Components/Library/Library.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navbar/>
    <Library />
  </StrictMode>,
)
