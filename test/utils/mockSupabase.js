import { vi } from 'vitest'

// A controllable Supabase stub: chainable builder for .from(...).select()...,
// plus rpc/auth/channel surfaces. Each terminal `await` consumes one queued
// response. Use `_enqueue` for .from chains and `_enqueueRpc` for .rpc calls.
//
// Designed for HOOK-INTERNAL tests only — page tests should mock the feature
// module wholesale instead.
export function makeSupabaseMock() {
    let chainQueue = []
    let rpcQueue   = []

    const pop = (q) => q.shift() ?? { data: null, error: null }

    const chainMethods = [
        'from', 'select', 'eq', 'match', 'is',
        'ilike', 'range', 'insert', 'delete', 'update',
    ]
    const builder = {}
    chainMethods.forEach((m) => { builder[m] = vi.fn(() => builder) })
    // Make the builder thenable so `await builder` resolves to the next queued response.
    builder.then = (resolve, reject) =>
        Promise.resolve(pop(chainQueue)).then(resolve, reject)

    const onAuthStateChange = vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
    }))

    const supabase = {
        from:          builder.from,
        rpc:           vi.fn(() => Promise.resolve(pop(rpcQueue))),
        auth:          { onAuthStateChange },
        channel:       vi.fn(),
        removeChannel: vi.fn(),

        _builder:      builder,
        _enqueue:      (response) => chainQueue.push(response),
        _enqueueRpc:   (response) => rpcQueue.push(response),
        _reset() {
            chainQueue = []
            rpcQueue   = []
            chainMethods.forEach((m) => builder[m].mockClear())
            supabase.rpc.mockClear()
            onAuthStateChange.mockClear()
            supabase.channel.mockClear()
            supabase.removeChannel.mockClear()
        },
    }

    return supabase
}
