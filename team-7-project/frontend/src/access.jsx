import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AccessView } from './Components/Views/accessView.jsx'
import { AuthProvider } from './Components/StateProvider/authState/authProvider.jsx'
import { LibraryProvider } from './Components/StateProvider/libraryState/libraryProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <LibraryProvider>
        <AccessView />
      </LibraryProvider>
    </AuthProvider>
  </StrictMode>,
)
