import { Routes, Route, useNavigate } from 'react-router'
import { AppShell } from './components/AppShell.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { LogoutPage } from './pages/LogoutPage.jsx'
import { SignUpPage } from './pages/SignUpPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'

import { useState } from 'react'

export function App() {

    return (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<div />}/>
            <Route path="/login" element={<LoginPage />}/>
            <Route path="/logout" element={<LogoutPage />}/>
            <Route path="/signup" element={<SignUpPage />}/>
            <Route path="/dashboard" element={
                <ProtectedRoute>
                  <h1>Dashboard</h1>
                </ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

        </Routes>
    )
}
