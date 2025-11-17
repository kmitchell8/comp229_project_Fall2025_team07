import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Register from './Components/Register/Register.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Navbar />
      <Register />
    </AuthProvider>
  </StrictMode>,
)
