import { Navigate } from 'react-router'
import { useState, useEffect } from 'react'

import { useAuth } from '../features/auth/auth.jsx'

export function LogoutPage() {
    const logout = useAuth(state => state.logout)
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false)

    useEffect(() => {

        logout().then(([success, errmsg]) => {
            if (!success) {
                setError(errmsg)
                return
            }
            setTimeout(() => setSuccess(success), 1000)
        })

    }, [])

    if(success) {
        return <Navigate to="/" />
    }

    if (error != null) {
        return (
            <p style={{ color: 'red' }}> Error while logging out: {error}, consider retrying </p>
        )
    }

    return (
        <h1>Logging out ...</h1>
    )
}
