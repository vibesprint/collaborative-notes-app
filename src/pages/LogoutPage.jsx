import { Navigate } from 'react-router'
import { useEffect } from 'react'

export function LogoutPage({ onLogout }) {
    useEffect(() => {
        onLogout()

    }, [onLogout])

    return (
        <Navigate to="/" replace />
    )
}
