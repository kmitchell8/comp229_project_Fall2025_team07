import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Library from './Components/Library/Library.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
    <Navbar/>
    <Library/>
    </AuthProvider>
  </StrictMode>,
)
