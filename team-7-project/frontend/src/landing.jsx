import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Landing from './Components/Landing/Landing.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Landing/>
  </StrictMode>,
)
