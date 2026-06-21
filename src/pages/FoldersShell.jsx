import { Outlet, Link } from 'react-router'

import * as Routes from '../routes.jsx'

export function FoldersShell() {
    return (
        <div>
        <div>
          <Link to={Routes.FOLDERS_CREATE}>Create folder</Link>
        </div>
        <Outlet />
        </div>
    )
}
