import { Routes, Route, useNavigate } from 'react-router'
import { AppShell } from './components/AppShell.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { LogoutPage } from './pages/LogoutPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'

import { useState } from 'react'

export function App() {
    const [loggedIn, setLoggedIn] = useState(false)

    function handleLogin() {
        setLoggedIn(true)
    }

    function handleLogout() {
        setLoggedIn(false)
    }

    return (
        <Routes>
          <Route element={<AppShell loggedIn={loggedIn} />}>
            <Route index element={<div />}/>
            <Route path="/login" element={<LoginPage loggedIn={loggedIn} onLogin={handleLogin} />}/>
            <Route path="/logout" element={<LogoutPage onLogout={handleLogout} />}/>
            <Route path="/dashboard" element={
                <ProtectedRoute loggedIn={loggedIn}>
                  <h1>Dashboard</h1>
                </ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

        </Routes>
    )
}
