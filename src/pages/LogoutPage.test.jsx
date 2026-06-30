import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

const authRef = vi.hoisted(() => ({ current: null }))

vi.mock('../features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

import { LogoutPage } from './LogoutPage.jsx'

function setAuth(overrides = {}) {
    authRef.current = {
        session: null,
        login:  vi.fn(),
        signUp: vi.fn(),
        logout: vi.fn().mockResolvedValue([true, null]),
        ...overrides,
    }
}

beforeEach(() => { setAuth() })

describe('LogoutPage', () => {
    it('calls logout on mount', () => {
        const logout = vi.fn().mockResolvedValue([true, null])
        setAuth({ logout })
        renderWithProviders(<LogoutPage />)
        expect(logout).toHaveBeenCalledTimes(1)
    })

    it('shows "Logging out ..." while logout is in flight', () => {
        const logout = vi.fn(() => new Promise(() => {})) // never resolves
        setAuth({ logout })
        renderWithProviders(<LogoutPage />)
        expect(screen.getByRole('heading', { name: /logging out/i })).toBeInTheDocument()
    })

    it('renders the error message when logout returns [false, msg]', async () => {
        const logout = vi.fn().mockResolvedValue([false, 'network down'])
        setAuth({ logout })
        renderWithProviders(<LogoutPage />)
        expect(await screen.findByText(/error while logging out: network down/i)).toBeInTheDocument()
    })

    // Real timers — LogoutPage uses setTimeout(..., 1000) before navigating.
    it('navigates to "/" about a second after a successful logout', async () => {
        const logout = vi.fn().mockResolvedValue([true, null])
        setAuth({ logout })
        renderWithProviders(null, {
            initialEntries: ['/logout'],
            routes: [
                { path: '/logout', element: <LogoutPage /> },
                { path: '/',       element: <div>HOME</div> },
            ],
        })

        await waitFor(() => {
            expect(screen.getByText('HOME')).toBeInTheDocument()
        }, { timeout: 2000 })
    }, 4000)
})
