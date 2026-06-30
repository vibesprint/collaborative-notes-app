import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useOptimisticMutation } from './optimistic.js'

function makeClient() {
    return new QueryClient({
        defaultOptions: {
            queries:   { retry: false },
            mutations: { retry: false },
        },
    })
}

function wrap(client) {
    return ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )
}

describe('useOptimisticMutation', () => {
    it('applies the optimistic update before the mutationFn resolves', async () => {
        const client = makeClient()
        const key = ['things']
        client.setQueryData(key, [{ id: 1 }, { id: 2 }, { id: 3 }])

        let resolveMutation
        const mutationFn = vi.fn(() => new Promise((r) => { resolveMutation = r }))

        const { result } = renderHook(
            () => useOptimisticMutation({
                mutationFn,
                queryKey: key,
                optimisticApply: (id, list) => list.filter((t) => t.id !== id),
            }),
            { wrapper: wrap(client) },
        )

        act(() => { result.current.mutate(2) })

        await waitFor(() => {
            expect(client.getQueryData(key)).toEqual([{ id: 1 }, { id: 3 }])
        })
        expect(mutationFn).toHaveBeenCalledWith(2, expect.anything())

        await act(async () => { resolveMutation({}) })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('passes (arg, previousData) to optimisticApply', async () => {
        const client = makeClient()
        const key = ['stuff']
        client.setQueryData(key, { count: 5 })

        const optimisticApply = vi.fn(() => ({ count: 99 }))

        const { result } = renderHook(
            () => useOptimisticMutation({
                mutationFn: () => Promise.resolve(),
                queryKey: key,
                optimisticApply,
            }),
            { wrapper: wrap(client) },
        )

        act(() => { result.current.mutate('arg-value') })
        await waitFor(() => expect(optimisticApply).toHaveBeenCalled())
        expect(optimisticApply).toHaveBeenCalledWith('arg-value', { count: 5 })
    })

    it('passes undefined oldData to optimisticApply when no cache entry exists', async () => {
        const client = makeClient()
        const key = ['empty']
        const optimisticApply = vi.fn(() => ['x'])

        const { result } = renderHook(
            () => useOptimisticMutation({
                mutationFn: () => Promise.resolve(),
                queryKey: key,
                optimisticApply,
            }),
            { wrapper: wrap(client) },
        )

        act(() => { result.current.mutate('arg') })
        await waitFor(() => expect(optimisticApply).toHaveBeenCalled())
        expect(optimisticApply).toHaveBeenCalledWith('arg', undefined)
        expect(client.getQueryData(key)).toEqual(['x'])
    })

    it('cancels in-flight queries on the key before mutating', async () => {
        const client = makeClient()
        const key = ['cancelled']
        client.setQueryData(key, [])
        const cancelSpy = vi.spyOn(client, 'cancelQueries')

        const { result } = renderHook(
            () => useOptimisticMutation({
                mutationFn: () => Promise.resolve(),
                queryKey: key,
                optimisticApply: (_, old) => old,
            }),
            { wrapper: wrap(client) },
        )

        act(() => { result.current.mutate(undefined) })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(cancelSpy).toHaveBeenCalledWith({ queryKey: key })
    })

    it('rolls back to the previous data on error', async () => {
        const client = makeClient()
        const key = ['things']
        const before = [{ id: 1 }, { id: 2 }]
        client.setQueryData(key, before)

        const { result } = renderHook(
            () => useOptimisticMutation({
                mutationFn: () => Promise.reject(new Error('boom')),
                queryKey: key,
                optimisticApply: (id, list) => list.filter((t) => t.id !== id),
            }),
            { wrapper: wrap(client) },
        )

        act(() => { result.current.mutate(1) })
        await waitFor(() => expect(result.current.isError).toBe(true))
        expect(client.getQueryData(key)).toEqual(before)
    })

    it('invalidates the query on settle (single-mutation case)', async () => {
        const client = makeClient()
        const key = ['inv']
        client.setQueryData(key, [])
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

        const { result } = renderHook(
            () => useOptimisticMutation({
                mutationFn: () => Promise.resolve(),
                queryKey: key,
                optimisticApply: (_, o) => o,
            }),
            { wrapper: wrap(client) },
        )

        act(() => { result.current.mutate(undefined) })
        await waitFor(() => expect(result.current.isSuccess).toBe(true))
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key })
        expect(invalidateSpy).toHaveBeenCalledTimes(1)
    })

    it('debounces invalidation across concurrent mutations (only one invalidation fires)', async () => {
        const client = makeClient()
        const key = ['concurrent']
        client.setQueryData(key, [{ id: 1 }, { id: 2 }, { id: 3 }])

        let resolveA, resolveB
        const fnA = vi.fn(() => new Promise((r) => { resolveA = r }))
        const fnB = vi.fn(() => new Promise((r) => { resolveB = r }))

        const wrapper = wrap(client)

        const { result: a } = renderHook(
            () => useOptimisticMutation({
                mutationFn: fnA,
                queryKey: key,
                optimisticApply: (id, l) => l.filter((t) => t.id !== id),
            }),
            { wrapper },
        )
        const { result: b } = renderHook(
            () => useOptimisticMutation({
                mutationFn: fnB,
                queryKey: key,
                optimisticApply: (id, l) => l.filter((t) => t.id !== id),
            }),
            { wrapper },
        )

        // Spy AFTER setQueryData seeding so the seed call isn't counted.
        const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

        act(() => { a.current.mutate(1) })
        act(() => { b.current.mutate(2) })

        // mutate() is fire-and-forget — onMutate runs first (async) and only then
        // is mutationFn invoked. Wait for both to actually be in flight before
        // resolving, otherwise resolveA/B may still be undefined.
        await waitFor(() => {
            expect(fnA).toHaveBeenCalled()
            expect(fnB).toHaveBeenCalled()
        })

        // Both mutations are now in flight. Resolve them one after the other.
        await act(async () => { resolveA({}) })
        await waitFor(() => expect(a.current.isSuccess).toBe(true))

        await act(async () => { resolveB({}) })
        await waitFor(() => expect(b.current.isSuccess).toBe(true))

        // The guard `isMutating() == 1` is meant to fire invalidation exactly once
        // across the batch — not twice.
        expect(invalidateSpy).toHaveBeenCalledTimes(1)
        expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: key })
    })
})
