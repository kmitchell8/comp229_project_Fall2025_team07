import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Services from './Components/Services/Services.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'
import Footer from './Components/Footer/Footer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
    <Navbar/>
    <Services/>
    <Footer/>
    </AuthProvider>
  </StrictMode>,
)
