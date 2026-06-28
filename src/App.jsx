import './styles.css'

import { Routes, Route, useNavigate } from 'react-router'
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
import { useCurrentWorkspaceSync } from './features/workspaces/workspace.js'

import { useInitAuth } from './features/auth/auth.jsx'
import { useInitCommandPalette, useGlobalCommandPalette } from './features/command_palette/command_palette.js'

import * as routes from './routes.jsx'


const GLOBAL_PALETTE = (navigate) => [
    { key: ['Alt', 'w'], action: () => navigate(routes.WORKSPACES) }
]

export function App() {

    useInitAuth()
    useCurrentWorkspaceSync()
    useInitCommandPalette()

    const navigate = useNavigate()
    useGlobalCommandPalette(GLOBAL_PALETTE(navigate))

    return (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={
                <ProtectedRoute ifNotLoggedIn={<HomePageNotLoggedIn />}>
                  <HomePage />
                 </ProtectedRoute>
            }/>

        <Route path={routes.WORKSPACES} element={
            <ProtectedRoute>
              <Workspaces />
            </ProtectedRoute>
        } />

        <Route path={routes.WORKSPACES_CREATE} element={
            <ProtectedRoute>
              <CreateWorkspace />
            </ProtectedRoute>
        } />

        <Route path={routes.ADD_MEMBER} element={
            <ProtectedRoute>
              <AddWorkspaceMember />
            </ProtectedRoute>
        } />

        <Route path={routes.NOTES_CREATE} element={
            <ProtectedRoute>
              <CreateNote />
            </ProtectedRoute>
        } />

        <Route path={routes.EDIT_NOTE} element={
            <ProtectedRoute>
              <EditNote />
            </ProtectedRoute>
        } />

        <Route path={routes.NOTE} element={
            <ProtectedRoute>
              <Note />
            </ProtectedRoute>
        } />

        <Route element={
            <ProtectedRoute>
              <FoldersShell />
            </ProtectedRoute>
        }>

            <Route path={routes.FOLDERS_CREATE} element={
                  <CreateFolder />
            } />

            <Route path={routes.FOLDER} element={
                  <ViewFolder />
            } />
        </Route>


            <Route path="/login" element={<LoginPage />}/>
            <Route path="/logout" element={<LogoutPage />}/>
            <Route path="/signup" element={<SignUpPage />}/>
            <Route path="*" element={<NotFoundPage />} />
          </Route>

        </Routes>
    )
}
