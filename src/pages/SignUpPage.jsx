import { useAuth } from '../features/auth/auth.jsx'
import { useState, useEffect } from 'react'
import styles from './styles/SignUpPage.module.css'
import { Navigate } from 'react-router'

export function SignUpPage() {
    const loggedIn = useAuth(state => !!state.session)

    if (loggedIn) {
        return (
            <Navigate to="/" />
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
    const [first_name, setFirstName] = useState('')
    const [last_name, setLastName] = useState('')

    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')

    useEffect(() => {
        if (error === '') return;
        const timer = setTimeout(() => setError(''), 3000)
        return () => clearTimeout(timer)
    }, [error, setError])


    function handleSubmit(event) {
        event.preventDefault()
        signUp(email, password, { options: { data: { first_name, last_name } } }).then(([success, errmsg]) => {
            if (!success) {
                setError(errmsg)
                setNotice('')
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
            <label>
             First Name:
             <input required type="text" value={first_name} name="first_name" onChange={(event) => setFirstName(event.target.value)} />
            </label>

            <label>
             Last Name:
             <input type="text" value={last_name} name="last_name" onChange={(event) => setLastName(event.target.value)} />
            </label>

            <label >
              Email:
              <input type="email" value={email} name="email" onChange={(event) => setEmail(event.target.value)} />
           </label>
            <label>
             Password:
             <input type="password" value={password} name="password" onChange={(event) => setPassword(event.target.value)} />
            </label>
            <button type="submit">Make an account </button>
          </form>
         </div>
        </div>
    )
}
