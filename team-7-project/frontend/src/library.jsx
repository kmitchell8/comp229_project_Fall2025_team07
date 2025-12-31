import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import Library from './Components/Library/Library.jsx'
import { LibraryView } from './Components/Views/libraryView.jsx'
//import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'
import Footer from './Components/Footer/Footer.jsx'
import Media from './Components/Media/Media.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>    
    <LibraryView/>
    <Media/>
    <Footer/>
    </AuthProvider>
  </StrictMode>,
)
