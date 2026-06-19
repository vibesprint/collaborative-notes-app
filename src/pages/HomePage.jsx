import { Link } from 'react-router'
import styles from './styles/HomePage.module.css'
import * as routes from '../routes.jsx'

export function HomePage() {
    return (
        <div className={styles.main} >
          <div className={styles.container} >
            <Link to={routes.WORKSPACES}>Workspaces</Link>
            <Link to={routes.NOTES}>Notes</Link>
          </div>
        </div>
    )
}


export function HomePageNotLoggedIn() {
    return (
        <div className="main" >
          <div className="container" >
            <h1>Login to view the homepage</h1>
          </div>
        </div>
    )
}
