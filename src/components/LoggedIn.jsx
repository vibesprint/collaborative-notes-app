import { Outlet } from 'react-router'

import { useWorkspaceStore } from '../features/workspaces/workspace.js'

export function LoggedIn() {
    const isLoading = useWorkspaceStore(state => state.isPending)
    const isError = useWorkspaceStore(state => state.isError)
    const error = useWorkspaceStore(state => state.error)

    if (isLoading)
        return <p>Loading workspace ...</p>

    if (isError)
        return <p>Error loading workspace !</p>

    return <Outlet />
}
