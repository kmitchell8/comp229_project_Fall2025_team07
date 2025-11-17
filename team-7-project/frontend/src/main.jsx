import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './App.jsx'
import Home from './Components/Home/Home.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import LogOrReg from './Components/LogOrReg/LogOrReg.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
    <Navbar/>
    <Home/>
    <LogOrReg/>
    </AuthProvider>
  </StrictMode>,
)
