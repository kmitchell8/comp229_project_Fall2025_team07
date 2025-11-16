import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Services from './Components/Services/Services.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navbar/>
    <Services/>
  </StrictMode>,
)
