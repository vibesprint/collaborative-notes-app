import styles from './styles/UnauthorizedPage.module.css'

export function ProtectedRoute({ loggedIn, children }) {
    if (!loggedIn) {
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
