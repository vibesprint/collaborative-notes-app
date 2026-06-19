import { App } from './App.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient.js'

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
    <QueryClientProvider client={queryClient} >
        <BrowserRouter>
          <App />
        </BrowserRouter>
    </QueryClientProvider>
);
