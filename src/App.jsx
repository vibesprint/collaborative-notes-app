import './styles.css'

import { Routes, Route, useNavigate, Outlet } from 'react-router'
import { AppShell } from './components/AppShell.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { LogoutPage } from './pages/LogoutPage.jsx'
import { SignUpPage } from './pages/SignUpPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { HomePage, HomePageNotLoggedIn } from './pages/HomePage.jsx'
import { Workspaces, CreateWorkspace, AddWorkspaceMember } from './pages/Workspaces.jsx'
import { CreateNote, EditNote, Note } from './pages/Notes.jsx'
import { ViewFolder, CreateFolder } from './pages/Folders.jsx'
import { FoldersShell } from './pages/FoldersShell.jsx'
import { KeyboardHelp } from './pages/KeyboardHelp.jsx'
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
                        { path: routes.WORKSPACES, Component: Workspaces },
                        { path: routes.WORKSPACES_CREATE, Component: CreateWorkspace },
                        { path: routes.ADD_MEMBER, Component: AddWorkspaceMember },
                        { path: routes.NOTES_CREATE, Component: CreateNote },
                        { path: routes.EDIT_NOTE, Component: EditNote },
                        { path: routes.NOTE, Component: Note },
                        { Component: FoldersShell,
                            children: [
                                { path: routes.FOLDERS_CREATE, Component: CreateFolder },
                                { path: routes.FOLDER, Component: ViewFolder },
                            ]},
                    ]},

                { index: true, Component: HomePage },
                { path: "/login", Component: LoginPage },
                { path: "/logout", Component: LogoutPage },
                { path: routes.KEYBOARD_HELP, Component: KeyboardHelp },
                { path: "/signup", Component: SignUpPage },
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

    return <Outlet />
}
