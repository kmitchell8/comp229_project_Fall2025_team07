import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import About from './Components/About/About.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navbar/>
    <About/>
  </StrictMode>,
)
