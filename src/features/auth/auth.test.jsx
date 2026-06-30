import { act, renderHook } from '@testing-library/react'

vi.mock('../../lib/supabase/auth.js', () => ({
    loginWithEmail:  vi.fn(),
    logout:          vi.fn(),
    signUpWithEmail: vi.fn(),
}))

vi.mock('../../lib/supabase/client.js', () => ({
    supabase: {
        auth: {
            onAuthStateChange: vi.fn(),
        },
    },
}))

import { loginWithEmail, logout as supabaseLogout, signUpWithEmail } from '../../lib/supabase/auth.js'
import { supabase } from '../../lib/supabase/client.js'
import { useAuth, useInitAuth } from './auth.jsx'

beforeEach(() => {
    useAuth.setState({ session: null, user: null, loading: true })
    vi.resetAllMocks()
})

describe('useAuth — default state', () => {
    it('starts with session=null, user=null, loading=true', () => {
        const { session, user, loading } = useAuth.getState()
        expect(session).toBeNull()
        expect(user).toBeNull()
        expect(loading).toBe(true)
    })
})

describe('useAuth.login', () => {
    it('returns [true, null] on success', async () => {
        loginWithEmail.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

        const result = await useAuth.getState().login('a@b.com', 'pw')

        expect(result).toEqual([true, null])
        expect(loginWithEmail).toHaveBeenCalledExactlyOnceWith('a@b.com', 'pw')
    })

    it('returns [false, message] on supabase error', async () => {
        loginWithEmail.mockResolvedValue({ data: null, error: { message: 'invalid credentials' } })

        const result = await useAuth.getState().login('a@b.com', 'pw')

        expect(result).toEqual([false, 'invalid credentials'])
    })
})

describe('useAuth.logout', () => {
    it('returns [true, null] on success', async () => {
        supabaseLogout.mockResolvedValue({ error: null })
        expect(await useAuth.getState().logout()).toEqual([true, null])
    })

    it('returns [false, message] on supabase error', async () => {
        supabaseLogout.mockResolvedValue({ error: { message: 'network down' } })
        expect(await useAuth.getState().logout()).toEqual([false, 'network down'])
    })
})

describe('useAuth.signUp', () => {
    it('returns [true, null] when error is null', async () => {
        signUpWithEmail.mockResolvedValue({ error: null })

        const result = await useAuth.getState().signUp('a@b.com', 'pw', { foo: 1 })

        expect(result).toEqual([true, null])
        expect(signUpWithEmail).toHaveBeenCalledExactlyOnceWith('a@b.com', 'pw', { foo: 1 })
    })

    it('returns [true, null] when error is undefined (the guard uses != null)', async () => {
        signUpWithEmail.mockResolvedValue({})

        const result = await useAuth.getState().signUp('a@b.com', 'pw')

        expect(result).toEqual([true, null])
    })

    it('returns [false, message] on supabase error', async () => {
        signUpWithEmail.mockResolvedValue({ error: { message: 'email taken' } })

        const result = await useAuth.getState().signUp('a@b.com', 'pw', {})

        expect(result).toEqual([false, 'email taken'])
    })
})

describe('useInitAuth', () => {
    let unsubscribe
    let authCallback

    beforeEach(() => {
        unsubscribe = vi.fn()
        supabase.auth.onAuthStateChange.mockImplementation((cb) => {
            authCallback = cb
            return { data: { subscription: { unsubscribe } } }
        })
    })

    it('subscribes to auth state changes on mount', () => {
        renderHook(() => useInitAuth())
        expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1)
    })

    it('unsubscribes on unmount', () => {
        const { unmount } = renderHook(() => useInitAuth())
        expect(unsubscribe).not.toHaveBeenCalled()
        unmount()
        expect(unsubscribe).toHaveBeenCalledTimes(1)
    })

    it('writes session, user, and loading=false into the store on a SIGNED_IN event', () => {
        renderHook(() => useInitAuth())
        const session = { user: { id: 'u1', email: 'a@b.com' }, access_token: 'tok' }

        act(() => authCallback('SIGNED_IN', session))

        const state = useAuth.getState()
        expect(state.session).toBe(session)
        expect(state.user).toEqual({ id: 'u1', email: 'a@b.com' })
        expect(state.loading).toBe(false)
    })

    it('clears user when the session is null', () => {
        renderHook(() => useInitAuth())

        act(() => authCallback('SIGNED_OUT', null))

        const state = useAuth.getState()
        expect(state.session).toBeNull()
        expect(state.user).toBeNull()
        expect(state.loading).toBe(false)
    })

    it('clears user when a session arrives with no user field', () => {
        renderHook(() => useInitAuth())

        act(() => authCallback('TOKEN_REFRESHED', { access_token: 'tok' }))

        const state = useAuth.getState()
        expect(state.session).toEqual({ access_token: 'tok' })
        expect(state.user).toBeNull()
        expect(state.loading).toBe(false)
    })
})
