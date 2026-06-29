import styles from './styles/UnauthorizedPage.module.css'
import { useAuth } from './features/auth/auth.jsx'
import { Outlet } from 'react-router'

export function ProtectedRoute({ ifNotLoggedIn, children }) {
    const loggedIn = useAuth(state => !!state.session)

    if (!loggedIn) {
        if(ifNotLoggedIn != null)
            return ifNotLoggedIn
        else
            return <UnauthorizedPage />
    }

    return <Outlet />
}


function UnauthorizedPage() {
    return (
        <div className={styles.main} >
          <h1>Unauthorized</h1>
        </div>
    )
}
