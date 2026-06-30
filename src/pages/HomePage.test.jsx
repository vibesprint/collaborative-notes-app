import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

const authRef = vi.hoisted(() => ({ current: { session: null } }))

vi.mock('../features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

import { HomePage } from './HomePage.jsx'

beforeEach(() => { authRef.current = { session: null } })

describe('HomePage', () => {
    it('shows the not-logged-in copy when there is no session', () => {
        renderWithProviders(<HomePage />)
        expect(screen.getByText(/login to view the homepage/i)).toBeInTheDocument()
    })

    it('shows the workspace links when the user is logged in', () => {
        authRef.current = { session: { user: { id: 'u1' } } }
        renderWithProviders(<HomePage />)
        expect(screen.getByRole('link', { name: /workspaces/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /root/i })).toBeInTheDocument()
        expect(screen.queryByText(/login to view/i)).not.toBeInTheDocument()
    })
})
