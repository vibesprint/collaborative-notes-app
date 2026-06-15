import styles from './styles/LoginPage.module.css'
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router'

import { useAuth } from '../features/auth/auth.jsx'

export function LoginPage() {
    const loggedIn = useAuth(state => state.loggedIn)

    if (loggedIn) {
        return <Navigate to="/" replace />
    }

    return (
        <div className={styles.main} >
          <LoginForm />
        </div>
    )
}

function LoginForm() {
    const onLogin = useAuth(state => state.login)

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    function handleSubmit() {
        const [success, msg] = onLogin(username, password)
        if (!success) {
            setError(msg)
        }
    }

    useEffect(() => {
        if (error === '') return;
        const timer = setTimeout(() => setError(''), 3000)
        return () => clearTimeout(timer)
    }, [error])

    return (
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); handleSubmit() }} >
          <div className={styles.inputFields} >
            <input type="text" placeholder="Username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <input type="password" placeholder="Password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
            <button type="submit">Login</button>
            { error !== '' && <p style={{ color: 'red' }}>Error: {error}</p> }

        </form>
    )
}
