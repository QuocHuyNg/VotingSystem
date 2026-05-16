import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')).render(
  <>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#1E1E35',
          color: '#E8E8F5',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          fontFamily: 'Inter, sans-serif',
        },
        success: { iconTheme: { primary: '#2ED573', secondary: '#1E1E35' } },
        error: { iconTheme: { primary: '#FF4757', secondary: '#1E1E35' } },
      }}
    />
  </>
)
