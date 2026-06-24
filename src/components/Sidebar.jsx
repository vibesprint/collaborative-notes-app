import styles from './styles/Sidebar.module.css'
import { Link } from 'react-router'

export function getSidebarByLogIn(loggedIn) {
    if (loggedIn)
        return LoggedInSidebar
    return NormalSidebar
}

export function NormalSidebar() {
    return (
        <div className={styles.sidebarNormal} >
         <div className={styles.content}>
         </div>
        </div>
    )
}


export function LoggedInSidebar() {
    return (
        <div className={styles.sidebarLoggedIn} >
         <div className={styles.content}>
         </div>
        </div>
    )
}
