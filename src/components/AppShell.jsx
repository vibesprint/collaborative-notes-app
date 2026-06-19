import styles from './styles/AppShell.module.css'

import { Routes, Route, Outlet, Link } from 'react-router'
import { getSidebarByLogIn } from './Sidebar.jsx'

import { useAuth } from '../features/auth/auth.jsx'
import { useCurrentWorkspaceName } from '../features/workspaces/workspace.js'

import { useEffect } from 'react'

export function AppShell() {
    const loggedIn = useAuth(state => !!state.session)
    const Sidebar = getSidebarByLogIn(loggedIn)
    const curWs = useCurrentWorkspaceName()


    return (
        <>

        <div className={styles.body}>
            <div className={styles.nav} >
                 <div className={styles.links}>
        { curWs != null ? <p>Workspace: {curWs}</p> : <p>No workspace</p> }
                  <Link to="/">Home</Link>
                  { !loggedIn && <Link to="/login">Login</Link> }
                  { !loggedIn && <Link to="/signup">Sign up</Link> }
                  { loggedIn && <Link to="/logout">Logout</Link> }
                 </div>
            </div>

            <Sidebar />
            <Outlet />
        </div>

        </>
    )
}
