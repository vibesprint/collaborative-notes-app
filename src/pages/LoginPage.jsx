import styles from './styles/LoginPage.module.css'
import { useState, useEffect } from 'react'
import { Navigate } from 'react-router'

import { useAuth } from '../features/auth/auth.jsx'

export function LoginPage() {
    const session = useAuth(state => state.session)
    const session_loading = useAuth(state => state.loading)

    if ((!session_loading) && session != null) {
        return <Navigate to="/" replace />
    }

    if (session_loading) {
        return (
            <h1>Checking if you are logged in ...</h1>
        )
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
    const [notice, setNotice] = useState('')

    function handleSubmit() {
        onLogin(username, password).then(([success, errmsg]) => {
            if (errmsg != null)
                setError(errmsg)
            setNotice('')
        })

        setNotice('Logging in ...')
    }

    useEffect(() => {
        if (error === '') return;
        const timer = setTimeout(() => setError(''), 3000)
        return () => clearTimeout(timer)
    }, [error])

    return (
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); handleSubmit() }} >
        { notice != '' && <h3>{notice}</h3> }
          <div className={styles.inputFields} >
            <input type="text" placeholder="Username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <input type="password" placeholder="Password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
            <button type="submit">Login</button>
            { error !== '' && <p style={{ color: 'red' }}>Error: {error}</p> }

        </form>
    )
}
