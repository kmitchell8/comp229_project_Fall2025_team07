import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Contact from './Components/Contact/Contact.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navbar/>
    <Contact/>
  </StrictMode>,
)
