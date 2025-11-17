import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Login from './Components/Login/Login.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Navbar />
      <Login />
    </AuthProvider>
  </StrictMode>,
)
