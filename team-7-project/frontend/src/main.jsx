import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './App.jsx'
import Home from './Components/Home/Home.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import LogOrReg from './Components/Access/LogOrReg.jsx'
//import ResetPassword from './Components/Access/ResetPassword.jsx'
import { AuthProvider } from './Components/StateProvider/authState/authProvider.jsx'
import Footer from './Components/Footer/Footer.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Navbar />
      <Home />
      <LogOrReg />
      <Footer/>
    </AuthProvider>
  </StrictMode>,
)
