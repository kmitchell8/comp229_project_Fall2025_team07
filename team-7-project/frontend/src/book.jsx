import React,{ StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Book from './Components/Book/Book.jsx'
import Navbar from './Components/Navbar/Navbar.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Navbar/>
    <Book/>
  </StrictMode>,
)
