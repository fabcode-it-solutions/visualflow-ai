import './styles/globals.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import AppBridgeProvider from '@/providers/AppBridgeProvider'
import QueryProvider from '@/providers/QueryProvider'
import App from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppBridgeProvider>
        <QueryProvider>
          <App />
        </QueryProvider>
      </AppBridgeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
