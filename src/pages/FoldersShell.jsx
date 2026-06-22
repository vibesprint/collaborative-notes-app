import { Outlet, Link } from 'react-router'

import * as Routes from '../routes.jsx'

export function FoldersShell() {
    return (
        <div>
        <Outlet />
        </div>
    )
}
