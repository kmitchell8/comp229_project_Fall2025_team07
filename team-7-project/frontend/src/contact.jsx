import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Contact from './Components/Contact/Contact.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/StateProvider/authState/authProvider.jsx'
import { UserProvider } from './Components/StateProvider/userState/userProvider.jsx'
import Footer from './Components/Footer/Footer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <UserProvider>
        <Navbar />
        <Contact />
        <Footer />
      </UserProvider>
    </AuthProvider>
  </StrictMode>,
)
