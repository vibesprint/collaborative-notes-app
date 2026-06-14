import { App } from './App.jsx'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const root = ReactDOM.createRoot(document.getElementById('root'))

const queryClient = new QueryClient();
root.render(
    <QueryClientProvider client={queryClient} >
        <BrowserRouter>
          <App />
        </BrowserRouter>
    </QueryClientProvider>
);
