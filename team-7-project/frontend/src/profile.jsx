import React, { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
//import App from './App.jsx'
//import Profile from './Components/Profile/Profile.jsx'
//import Admin from './Components/Admin/Admin.jsx'
//import Navbar from './Components/Navbar/Navbar.jsx'
import { AuthProvider } from './Components/authState/authProvider.jsx';
import { ProfileView } from './Components/Views/profileView.jsx';




createRoot(document.getElementById('root')).render(
    <StrictMode>
        <AuthProvider>
            <ProfileView/>
        </AuthProvider>
    </StrictMode>,

)