import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeSupabaseMock } from '../../../test/utils/mockSupabase.js'

// Hoisted state so the vi.mock factories below can close over them despite hoisting.
const authRef = vi.hoisted(() => ({ current: null }))
const supabaseRef = vi.hoisted(() => ({ current: null }))

vi.mock('../../lib/supabase/client.js', () => ({
    get supabase() { return supabaseRef.current },
}))

vi.mock('../auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

import {
    useWorkspaceList,
    useCurrentWorkspace,
    useCreateWorkspace,
    useDeleteWorkspace,
    useAddWorkspaceMember,
    useWorkspaceStore,
    QUERY_KEYS,
} from './workspace.js'
import { queryClient } from '../../queryClient.js'

queryClient.setDefaultOptions({
    queries:   { retry: false },
    mutations: { retry: false },
})

const wrapper = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

function setLoggedIn(user = { id: 'u1', email: 'a@b.com' }) {
    authRef.current = { session: { user }, user, loading: false }
}
function setLoggedOut() {
    authRef.current = { session: null, user: null, loading: false }
}

beforeEach(() => {
    queryClient.clear()
    localStorage.clear()
    useWorkspaceStore.setState({ selectedId: null })
    supabaseRef.current = makeSupabaseMock()
    setLoggedIn()
})

describe('useWorkspaceList', () => {
    it('does not fetch when logged out (enabled: false)', async () => {
        setLoggedOut()

        const { result } = renderHook(() => useWorkspaceList(), { wrapper })

        // Give react-query a tick to settle. enabled:false means queryFn never runs.
        await act(async () => { await Promise.resolve() })
        expect(supabaseRef.current.from).not.toHaveBeenCalled()
        expect(result.current.data).toBeUndefined()
        expect(result.current.fetchStatus).toBe('idle')
    })

    it('fetches workspaces when logged in', async () => {
        const list = [{ id: 'w1', name: 'Alpha' }, { id: 'w2', name: 'Beta' }]
        supabaseRef.current._enqueue({ data: list, error: null })

        const { result } = renderHook(() => useWorkspaceList(), { wrapper })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(result.current.data).toEqual(list)
        expect(supabaseRef.current.from).toHaveBeenCalledWith('workspaces')
    })
})

describe('useCurrentWorkspace', () => {
    const setupList = (list) => {
        supabaseRef.current._enqueue({ data: list, error: null })
    }

    it('returns null when the workspace list is empty', async () => {
        setupList([])
        const { result } = renderHook(() => useCurrentWorkspace(), { wrapper })

        await waitFor(() => expect(result.current.isPending).toBe(false))
        expect(result.current.data).toBeNull()
    })

    it('returns the workspace matching selectedId', async () => {
        const list = [{ id: 'w1', name: 'A' }, { id: 'w2', name: 'B' }, { id: 'w3', name: 'C' }]
        setupList(list)
        useWorkspaceStore.setState({ selectedId: 'w2' })

        const { result } = renderHook(() => useCurrentWorkspace(), { wrapper })

        await waitFor(() => expect(result.current.data).not.toBeNull())
        expect(result.current.data).toEqual({ id: 'w2', name: 'B' })
    })

    it('falls back to the first workspace when selectedId is not in the list', async () => {
        const list = [{ id: 'w1', name: 'A' }, { id: 'w2', name: 'B' }]
        setupList(list)
        useWorkspaceStore.setState({ selectedId: 'w-missing' })

        const { result } = renderHook(() => useCurrentWorkspace(), { wrapper })

        await waitFor(() => expect(result.current.data).not.toBeNull())
        expect(result.current.data).toEqual({ id: 'w1', name: 'A' })
    })

    it('falls back to the first workspace when selectedId is null', async () => {
        const list = [{ id: 'w1', name: 'A' }, { id: 'w2', name: 'B' }]
        setupList(list)

        const { result } = renderHook(() => useCurrentWorkspace(), { wrapper })

        await waitFor(() => expect(result.current.data).not.toBeNull())
        expect(result.current.data).toEqual({ id: 'w1', name: 'A' })
    })
})

describe('useCreateWorkspace', () => {
    it('invalidates the workspace list on success', async () => {
        supabaseRef.current._enqueueRpc({ error: null })
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useCreateWorkspace(), { wrapper })
        act(() => { result.current.mutate('Gamma') })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(supabaseRef.current.rpc).toHaveBeenCalledWith('create_workspace', { name: 'Gamma' })
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: QUERY_KEYS.list() })
    })

    it('surfaces a supabase error', async () => {
        supabaseRef.current._enqueueRpc({ error: new Error('rpc failed') })

        const { result } = renderHook(() => useCreateWorkspace(), { wrapper })
        act(() => { result.current.mutate('Gamma') })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(result.current.error.message).toBe('rpc failed')
    })
})

describe('useDeleteWorkspace (via useOptimisticMutation)', () => {
    it('optimistically removes the workspace from the cached list', async () => {
        const list = [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }]
        queryClient.setQueryData(QUERY_KEYS.list(), list)

        // Hold the rpc open so we can observe the cache mid-flight.
        let resolveRpc
        supabaseRef.current.rpc.mockImplementationOnce(
            () => new Promise((r) => { resolveRpc = r })
        )

        const { result } = renderHook(() => useDeleteWorkspace(), { wrapper })
        act(() => { result.current.mutate('w2') })

        await waitFor(() => {
            expect(queryClient.getQueryData(QUERY_KEYS.list())).toEqual([{ id: 'w1' }, { id: 'w3' }])
        })

        // Complete the rpc so the mutation can finish and react-query stops complaining.
        await act(async () => {
            resolveRpc({ error: null })
        })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('rolls back when the rpc returns an error', async () => {
        const list = [{ id: 'w1' }, { id: 'w2' }]
        queryClient.setQueryData(QUERY_KEYS.list(), list)
        supabaseRef.current._enqueueRpc({ error: new Error('nope') })

        const { result } = renderHook(() => useDeleteWorkspace(), { wrapper })
        act(() => { result.current.mutate('w1') })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(queryClient.getQueryData(QUERY_KEYS.list())).toEqual(list)
    })
})

describe('useAddWorkspaceMember', () => {
    it('invalidates membership_list for the given workspace on settle', async () => {
        supabaseRef.current._enqueueRpc({ error: null })
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useAddWorkspaceMember(), { wrapper })
        act(() => { result.current.mutate({ workspace_id: 'w1', email: 'x@y.com' }) })

        await waitFor(() => expect(result.current.isSuccess).toBe(true))

        expect(supabaseRef.current.rpc).toHaveBeenCalledWith('add_workspace_member', {
            wspc_id: 'w1', email: 'x@y.com',
        })
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: QUERY_KEYS.membership_list('w1'),
        })
    })

    it('still invalidates membership_list when the rpc errors (onSettled, not onSuccess)', async () => {
        supabaseRef.current._enqueueRpc({ error: new Error('boom') })
        const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

        const { result } = renderHook(() => useAddWorkspaceMember(), { wrapper })
        act(() => { result.current.mutate({ workspace_id: 'w1', email: 'x@y.com' }) })

        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({
            queryKey: QUERY_KEYS.membership_list('w1'),
        })
    })
})
