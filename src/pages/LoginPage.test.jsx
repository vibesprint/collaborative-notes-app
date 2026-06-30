import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'

// Hoisted ref so the vi.mock factory below can close over a mutable state object
// even though vi.mock is hoisted above the imports.
const authRef = vi.hoisted(() => ({ current: null }))

vi.mock('../features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

import { LoginPage } from './LoginPage.jsx'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

function setAuth(overrides = {}) {
    authRef.current = {
        session: null,
        loading: false,
        login:  vi.fn().mockResolvedValue([true, null]),
        logout: vi.fn(),
        signUp: vi.fn(),
        user:   null,
        ...overrides,
    }
}

beforeEach(() => { setAuth() })

describe('LoginPage routing', () => {
    it('shows the loading state while the session is being checked', () => {
        setAuth({ loading: true })
        renderWithProviders(<LoginPage />)
        expect(screen.getByText(/checking if you are logged in/i)).toBeInTheDocument()
    })

    it('redirects to "/" when the user is already logged in', () => {
        setAuth({ loading: false, session: { user: { id: 'u1' } } })
        renderWithProviders(null, {
            initialEntries: ['/login'],
            routes: [
                { path: '/login', element: <LoginPage /> },
                { path: '/',      element: <div>HOME</div> },
            ],
        })
        expect(screen.getByText('HOME')).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument()
    })

    it('renders the login form when not loading and not logged in', () => {
        renderWithProviders(<LoginPage />)
        expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument()
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    })
})

describe('LoginPage form submission', () => {
    it('calls login with the typed username and password', async () => {
        const login = vi.fn().mockResolvedValue([true, null])
        setAuth({ login })
        renderWithProviders(<LoginPage />)

        await userEvent.type(screen.getByPlaceholderText(/username/i), 'alice')
        await userEvent.type(screen.getByPlaceholderText(/password/i), 'pw123')
        await userEvent.click(screen.getByRole('button', { name: /login/i }))

        expect(login).toHaveBeenCalledExactlyOnceWith('alice', 'pw123')
    })

    it('shows "Logging in ..." after submit and clears it once login resolves', async () => {
        let resolveLogin
        const login = vi.fn(() => new Promise((r) => { resolveLogin = r }))
        setAuth({ login })
        renderWithProviders(<LoginPage />)

        await userEvent.type(screen.getByPlaceholderText(/username/i), 'a')
        await userEvent.type(screen.getByPlaceholderText(/password/i), 'b')
        await userEvent.click(screen.getByRole('button', { name: /login/i }))

        expect(screen.getByText(/logging in/i)).toBeInTheDocument()

        resolveLogin([true, null])
        await waitFor(() => {
            expect(screen.queryByText(/logging in/i)).not.toBeInTheDocument()
        })
    })

    it('shows the error message when login returns an error', async () => {
        const login = vi.fn().mockResolvedValue([false, 'bad credentials'])
        setAuth({ login })
        renderWithProviders(<LoginPage />)

        await userEvent.type(screen.getByPlaceholderText(/username/i), 'a')
        await userEvent.type(screen.getByPlaceholderText(/password/i), 'b')
        await userEvent.click(screen.getByRole('button', { name: /login/i }))

        expect(await screen.findByText(/error: bad credentials/i)).toBeInTheDocument()
    })

    // Uses real timers (3s wall-clock) — mixing fake timers with userEvent + RTL's
    // findBy* polling is fragile in this stack. The waitFor handles the 3 s clear.
    it('clears the error message after 3 seconds', async () => {
        const login = vi.fn().mockResolvedValue([false, 'nope'])
        setAuth({ login })
        renderWithProviders(<LoginPage />)

        await userEvent.click(screen.getByRole('button', { name: /login/i }))
        expect(await screen.findByText(/error: nope/i)).toBeInTheDocument()

        await waitFor(() => {
            expect(screen.queryByText(/error: nope/i)).not.toBeInTheDocument()
        }, { timeout: 4000 })
    }, 6000)
})
