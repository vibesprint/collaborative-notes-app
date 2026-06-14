import styles from './styles/AppShell.module.css'

import { Routes, Route, Outlet, Link } from 'react-router'
import { getSidebarByLogIn } from './Sidebar.jsx'

export function AppShell({ loggedIn }) {
    const Sidebar = getSidebarByLogIn(loggedIn)

    return (
        <>

        <div className={styles.body}>
            <div className={styles.nav} >
                 <div className={styles.links}>
                  <Link to="/">Home</Link>
                  { !loggedIn && <Link to="/login">Login</Link> }
                  { loggedIn && <Link to="/logout">Logout</Link> }
                 </div>
            </div>

            <Sidebar />
            <Outlet />
        </div>

        </>
    )
}
