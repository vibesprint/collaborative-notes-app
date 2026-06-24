import styles from './styles/AppShell.module.css'

import { Routes, Route, Outlet, Link } from 'react-router'
import { getSidebarByLogIn } from './Sidebar.jsx'

import { useAuth } from '../features/auth/auth.jsx'
import { useCurrentWorkspace } from '../features/workspaces/workspace.js'

import { useEffect } from 'react'

export function AppShell() {
    const loggedIn = useAuth(state => !!state.session)
    const Sidebar = getSidebarByLogIn(loggedIn)
    const { isPending, isError, error, data }= useCurrentWorkspace()
    let curWs = isError ? 'Errored'
               : isPending ? 'Loading ...'
               : data != null ? data.name
               : 'No workspace'

    return (
        <>

        <div className={styles.body}>
            <div className={styles.nav} >
                 <div className={styles.links}>
        { loggedIn && <p>Workspace: {curWs}</p> }
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
