import styles from './styles/LoginPage.module.css'
import { useState } from 'react'
import { Navigate } from 'react-router'

export function LoginPage({ onLogin, loggedIn }) {

    if (loggedIn) {
        return <Navigate to="/" replace />
    }

    return (
        <div className={styles.main} >
          <LoginForm onLogin={onLogin} />
        </div>
    )
}

function LoginForm({ onLogin }) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    return (
        <form className={styles.form} onSubmit={(event) => {event.preventDefault(); onLogin(username, password)}} >
          <div className={styles.inputFields} >
            <input type="text" placeholder="Username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} />
            <input type="password" placeholder="Password" name="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
            <button type="submit">Login</button>

        </form>
    )
}
