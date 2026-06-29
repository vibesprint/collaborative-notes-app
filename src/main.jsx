import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './queryClient.js'
import { RouterProvider } from 'react-router/dom'
import { createBrowserRouter } from 'react-router'
import { ROUTES } from './App.jsx'

const router = createBrowserRouter(ROUTES)

const root = ReactDOM.createRoot(document.getElementById('root'))

root.render(
    <QueryClientProvider client={queryClient} >
        <RouterProvider router={router} />
    </QueryClientProvider>
);
