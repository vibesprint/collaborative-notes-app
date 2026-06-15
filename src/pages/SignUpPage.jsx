import { useAuth } from '../features/auth/auth.jsx'
import { useState, useEffect } from 'react'
import styles from './styles/SignUpPage.module.css'
import { Navigate } from 'react-router'

export function SignUpPage() {
    const loggedIn = useAuth(state => !!state.session)

    if (loggedIn) {
        return (
            <h1>Logout of this accout to sign up with a new account</h1>
        )
    }

    return (
        <SignUpForm />
    )
}

function SignUpForm() {
    const signUp = useAuth(state => state.signUp)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        if (error === '') return;
        const timer = setTimeout(() => setError(''), 3000)
        return () => clearTimeout(timer)
    }, [error, setError])

    if (success) {
        return <Navigate to="/login" />
    }


    function handleSubmit(event) {
        event.preventDefault()
        signUp().then(([success, errmsg]) => {
            if (!success) {
                setError(errmsg)
                setSuccess(false)
                setNotice('')
            } else {
                setTimeout(() => setSuccess(true), 2000)
                setNotice('Sign up successful, redirecting')
            }
        })

        setNotice('Signing up ...')
    }

    return (
        <div className={styles.main}>
         <div className={styles.content}>
          {error !== '' && <p style={{ color: 'red' }}>Error: {error}</p>}
          {notice !== '' && <p style={{ color: 'blue' }}>{notice}</p>}
          <form onSubmit={handleSubmit} className={styles.content} >
            <input type="email" value={email} name="email" onChange={(event) => setEmail(event.target.value)} />
            <input type="password" value={password} name="password" onChange={(event) => setPassword(event.target.value)} />
            <button type="submit">Make an account </button>
          </form>
         </div>
        </div>
    )
}
