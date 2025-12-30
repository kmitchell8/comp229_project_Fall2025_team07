import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import About from './Components/About/About.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx'
import Footer from './Components/Footer/Footer.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Navbar />
      <About />
      <Footer />
    </AuthProvider>
  </StrictMode>,
)
