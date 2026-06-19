import styles from './styles/UnauthorizedPage.module.css'
import { useAuth } from './features/auth/auth.jsx'

export function ProtectedRoute({ ifNotLoggedIn, children }) {
    const loggedIn = useAuth(state => !!state.session)

    if (!loggedIn) {
        if(ifNotLoggedIn != null)
            return ifNotLoggedIn
        else
            return <UnauthorizedPage />
    }

    return children
}


function UnauthorizedPage() {
    return (
        <div className={styles.main} >
          <h1>Unauthorized</h1>
        </div>
    )
}
