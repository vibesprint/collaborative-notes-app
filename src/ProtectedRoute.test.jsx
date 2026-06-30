import { screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { render } from '@testing-library/react'

const authRef = vi.hoisted(() => ({ current: { session: null } }))

vi.mock('./features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

import { ProtectedRoute } from './ProtectedRoute.jsx'

// ProtectedRoute renders <Outlet/>, which requires a nested-route shape rather
// than the flat list our renderWithProviders helper produces.
function renderProtected({ session, path = '/secret' } = {}) {
    authRef.current = { session: session ?? null }
    return render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route element={<ProtectedRoute />}>
                    <Route path="/secret" element={<div>SECRET CONTENT</div>} />
                </Route>
            </Routes>
        </MemoryRouter>,
    )
}

describe('ProtectedRoute', () => {
    it('renders the Unauthorized page when the user is not logged in', () => {
        renderProtected({ session: null })
        expect(screen.getByRole('heading', { name: /unauthorized/i })).toBeInTheDocument()
        expect(screen.queryByText(/secret content/i)).not.toBeInTheDocument()
    })

    it('renders the nested Outlet route when the user is logged in', () => {
        renderProtected({ session: { user: { id: 'u1' } } })
        expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument()
        expect(screen.queryByText(/unauthorized/i)).not.toBeInTheDocument()
    })
})
