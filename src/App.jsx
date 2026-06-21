import './styles.css'

import { Routes, Route, useNavigate } from 'react-router'
import { AppShell } from './components/AppShell.jsx'
import { NotFoundPage } from './pages/NotFoundPage.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import { LogoutPage } from './pages/LogoutPage.jsx'
import { SignUpPage } from './pages/SignUpPage.jsx'
import { ProtectedRoute } from './ProtectedRoute.jsx'
import { HomePage, HomePageNotLoggedIn } from './pages/HomePage.jsx'
import { Workspaces, CreateWorkspace } from './pages/Workspaces.jsx'
import { Notes, CreateNote, EditNote, Note } from './pages/Notes.jsx'
import { RootFolders, ViewFolder, CreateFolder } from './pages/Folders.jsx'
import { FoldersShell } from './pages/FoldersShell.jsx'

import { useInitializeWorkspace } from './features/workspaces/workspace.js'

import * as routes from './routes.jsx'

export function App() {

    useInitializeWorkspace()

    return (
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={
                <ProtectedRoute ifNotLoggedIn={<HomePageNotLoggedIn />}>
                  <HomePage />
                 </ProtectedRoute>
            }/>

            <Route path="/home" element={
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

        <Route path={routes.NOTES} element={
            <ProtectedRoute>
              <Notes />
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

            <Route path={routes.FOLDERS} element={
                  <RootFolders />
            } />

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
            <Route path="/dashboard" element={
                <ProtectedRoute>
                  <h1>Dashboard</h1>
                </ProtectedRoute>
            } />
            <Route path="*" element={<NotFoundPage />} />
          </Route>

        </Routes>
    )
}
