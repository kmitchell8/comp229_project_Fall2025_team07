import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import Library from './Components/Library/Library.jsx'
import { LibraryView } from './Components/Views/libraryView.jsx'
//import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/StateProvider/authState/authProvider.jsx'
import { MediaProvider } from './Components/StateProvider/mediaState/mediaProvider.jsx'
import { LibraryProvider } from './Components/StateProvider/libraryState/libraryProvider.jsx'
import Footer from './Components/Footer/Footer.jsx'
import Media from './Components/Media/Media.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LibraryProvider>
        <MediaProvider>
          <LibraryView />
          <Media />
          <Footer />
        </MediaProvider>
      </LibraryProvider>
    </AuthProvider>
  </StrictMode>,
)
