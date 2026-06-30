import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

const authRef = vi.hoisted(() => ({ current: null }))

vi.mock('../features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

import { SignUpPage } from './SignUpPage.jsx'

function setAuth(overrides = {}) {
    authRef.current = {
        session: null,
        login:  vi.fn(),
        logout: vi.fn(),
        signUp: vi.fn().mockResolvedValue([true, null]),
        ...overrides,
    }
}

beforeEach(() => { setAuth() })

describe('SignUpPage routing', () => {
    it('redirects to "/" when the user is already logged in', () => {
        setAuth({ session: { user: { id: 'u1' } } })
        renderWithProviders(null, {
            initialEntries: ['/signup'],
            routes: [
                { path: '/signup', element: <SignUpPage /> },
                { path: '/',       element: <div>HOME</div> },
            ],
        })
        expect(screen.getByText('HOME')).toBeInTheDocument()
    })

    it('renders the form when the user is not logged in', () => {
        renderWithProviders(<SignUpPage />)
        expect(screen.getByRole('button', { name: /make an account/i })).toBeInTheDocument()
    })
})

describe('SignUpPage form submission', () => {
    async function fillAndSubmit({ first = 'Alice', last = 'Smith', email = 'a@b.com', password = 'pw' } = {}) {
        await userEvent.type(screen.getByLabelText(/first name/i), first)
        if (last !== '') await userEvent.type(screen.getByLabelText(/last name/i), last)
        await userEvent.type(screen.getByLabelText(/email/i), email)
        await userEvent.type(screen.getByLabelText(/password/i), password)
        await userEvent.click(screen.getByRole('button', { name: /make an account/i }))
    }

    it('calls signUp with email, password, and the nested options.data payload', async () => {
        const signUp = vi.fn().mockResolvedValue([true, null])
        setAuth({ signUp })
        renderWithProviders(<SignUpPage />)

        await fillAndSubmit()

        expect(signUp).toHaveBeenCalledExactlyOnceWith('a@b.com', 'pw', {
            options: { data: { first_name: 'Alice', last_name: 'Smith' } },
        })
    })

    it('shows "Signing up ..." after submit (notice stays visible while pending)', async () => {
        // Hold signUp open so the notice doesn't get cleared in the success branch
        // (it wouldn't anyway on success — current code only clears on failure).
        const signUp = vi.fn(() => new Promise(() => {}))
        setAuth({ signUp })
        renderWithProviders(<SignUpPage />)

        await fillAndSubmit()
        expect(screen.getByText(/signing up/i)).toBeInTheDocument()
    })

    it('renders the error message when signUp returns [false, msg]', async () => {
        const signUp = vi.fn().mockResolvedValue([false, 'email taken'])
        setAuth({ signUp })
        renderWithProviders(<SignUpPage />)

        await fillAndSubmit()
        expect(await screen.findByText(/error: email taken/i)).toBeInTheDocument()
    })

    // Real timers (3 s wall-clock) — see the same comment in LoginPage.test.jsx.
    it('clears the error message after 3 seconds', async () => {
        const signUp = vi.fn().mockResolvedValue([false, 'nope'])
        setAuth({ signUp })
        renderWithProviders(<SignUpPage />)

        await fillAndSubmit()
        expect(await screen.findByText(/error: nope/i)).toBeInTheDocument()
        await waitFor(() => {
            expect(screen.queryByText(/error: nope/i)).not.toBeInTheDocument()
        }, { timeout: 4000 })
    }, 6000)
})
