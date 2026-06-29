import './styles.css'

import { useNavigate, useNavigation, Outlet } from 'react-router'
import { AppShell } from './components/AppShell.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { HomePage } from './pages/HomePage.jsx'
import { useCurrentWorkspaceSync } from './features/workspaces/workspace.js'

import { useInitAuth } from './features/auth/auth.jsx'
import { useInitCommandPalette, useCommandPalette } from './features/command_palette/command_palette.js'

import * as routes from './routes.jsx'

import { useMemo } from 'react'


const GLOBAL_PALETTE = (navigate) => [
    { key: ['Alt', 'w'], action: () => navigate(routes.WORKSPACES) },
    { key: ['Alt', 'h'], action: () => navigate(routes.KEYBOARD_HELP) },
    { key: ['Alt', 'p'], action: () => navigate(-1) },
    { key: ['Alt', 'n'], action: () => navigate(1) }
]

export const ROUTES = [{
    Component: App,
    children: [
        {
            Component: AppShell,
            children: [
                {
                Component: ProtectedRoute,
                    children: [
                        { path: routes.WORKSPACES,
                            lazy: { Component: async () => (await import('./pages/Workspaces.jsx')).Workspaces } },
                        { path: routes.WORKSPACES_CREATE,
                            lazy: { Component: async () => (await import('./pages/Workspaces.jsx')).CreateWorkspace } },
                        { path: routes.ADD_MEMBER,
                            lazy: { Component: async () => (await import('./pages/Workspaces.jsx')).AddWorkspaceMember } },
                        { path: routes.NOTES_CREATE,
                            lazy: { Component: async () => (await import('./pages/Notes.jsx')).CreateNote } },
                        { path: routes.EDIT_NOTE,
                            lazy: { Component: async () => (await import('./pages/Notes.jsx')).EditNote } },
                        { path: routes.NOTE,
                            lazy: { Component: async () => (await import('./pages/Notes.jsx')).Note } },
                        { lazy: { Component: async () => (await import('./pages/FoldersShell.jsx')).FoldersShell },
                            children: [
                                { path: routes.FOLDERS_CREATE,
                                    lazy: { Component: async () => (await import('./pages/Folders.jsx')).CreateFolder } },
                                { path: routes.FOLDER,
                                    lazy: { Component: async () => (await import('./pages/Folders.jsx')).ViewFolder } },
                            ]},
                    ]},

                { index: true, Component: HomePage },
                { path: "/login", lazy: {
                    Component: async () => (await import('./pages/LoginPage.jsx')).LoginPage
                }},
                { path: "/logout", lazy: {
                    Component: async () => (await import('./pages/LogoutPage.jsx')).LogoutPage
                }},
                { path: routes.KEYBOARD_HELP, lazy: {
                    Component: async () => (await import('./pages/KeyboardHelp.jsx')).KeyboardHelp
                }},
                { path: '/signup', lazy: {
                    Component: async () => (await import('./pages/SignUpPage.jsx')).SignUpPage
                }},
                { path: '*', Component: NotFoundPage },
            ]
        }
    ]
}]

export function App() {

    useInitAuth()
    useCurrentWorkspaceSync()
    useInitCommandPalette()

    const navigate = useNavigate()
    const cmd_palette = useMemo(() => GLOBAL_PALETTE(navigate), [navigate])
    useCommandPalette(cmd_palette)
    const navigation = useNavigation()

    if (navigation.state === 'loading')
        return <h1>Loading ...</h1>

    return <Outlet />
}
