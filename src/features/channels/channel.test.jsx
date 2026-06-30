import { renderHook, waitFor, act } from '@testing-library/react'

// Hoisted holder so the vi.mock factory below can return a getter that always
// resolves to the *current* supabase mock (we install a fresh one per test).
const supabaseRef = vi.hoisted(() => ({ current: null }))

vi.mock('../../lib/supabase/client.js', () => ({
    get supabase() { return supabaseRef.current },
}))

// channel.js keeps a module-level CHANNELS registry. We use vi.resetModules()
// + dynamic import in beforeEach so every test gets a fresh map.
let channelModule

// --- Channel-aware supabase mock --------------------------------------------

function makeSupabaseForChannels() {
    const channelsByName = new Map()
    const removeCalls   = []

    function makeChannel(name) {
        let subscribeCb     = null
        let presenceListener  = null
        let broadcastListener = null

        const ch = { _name: name }
        ch.on = vi.fn((type, _opts, cb) => {
            if (type === 'presence')  presenceListener  = cb
            if (type === 'broadcast') broadcastListener = cb
            return ch
        })
        ch.subscribe = vi.fn((cb) => {
            subscribeCb = cb
            return ch
        })
        ch.send           = vi.fn()
        ch.track          = vi.fn()
        ch.presenceState  = vi.fn(() => ({}))

        ch._triggerSubscribe = (status, error) => subscribeCb?.(status, error)
        ch._emitPresence     = (payload) => presenceListener?.(payload)
        ch._emitBroadcast    = (payload) => broadcastListener?.(payload)
        return ch
    }

    return {
        channel: vi.fn((name) => {
            const ch = makeChannel(name)
            channelsByName.set(name, ch)
            return ch
        }),
        removeChannel: vi.fn((ch) => {
            removeCalls.push(ch)
            return Promise.resolve()
        }),
        _channels:    channelsByName,
        _removeCalls: removeCalls,
        // For completeness — the channel file never uses these, but other consumers might.
        auth: {
            onAuthStateChange: vi.fn(() => ({
                data: { subscription: { unsubscribe: vi.fn() } },
            })),
        },
    }
}

// --- Test scaffolding -------------------------------------------------------

let testCounter = 0
const uniqueWs = () => `ws-${++testCounter}`

beforeEach(async () => {
    vi.resetModules()
    supabaseRef.current = makeSupabaseForChannels()
    channelModule = await import('./channel.js')
})

// Convenience: get the (single) channel created so far for a given name.
function expectChannel(name) {
    const ch = supabaseRef.current._channels.get(name)
    if (!ch) throw new Error(`no channel for ${name}; have: ${[...supabaseRef.current._channels.keys()].join(', ')}`)
    return ch
}

// ---------------------------------------------------------------------------
//                                  TESTS
// ---------------------------------------------------------------------------

describe('useNoteChannel — single-consumer lifecycle', () => {
    it('starts in the pending state and creates exactly one supabase channel', () => {
        const ws = uniqueWs()
        const { result } = renderHook(
            () => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'n1' })
        )

        expect(supabaseRef.current.channel).toHaveBeenCalledExactlyOnceWith(`${ws}:note:n1`)
        expect(result.current.isPending).toBe(true)
        expect(result.current.isSuccess).toBe(false)
        expect(result.current.channel).toBe(expectChannel(`${ws}:note:n1`))
    })

    it('transitions to isSuccess when the supabase subscribe callback reports success', async () => {
        const ws = uniqueWs()
        const { result } = renderHook(
            () => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'n1' })
        )

        await act(async () => {
            expectChannel(`${ws}:note:n1`)._triggerSubscribe('SUBSCRIBED', null)
        })

        expect(result.current.isSuccess).toBe(true)
        expect(result.current.isPending).toBe(false)
        expect(result.current.error).toBeNull()
    })

    it('transitions to isError when subscribe reports an error', async () => {
        const ws = uniqueWs()
        const { result } = renderHook(
            () => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'n1' })
        )

        await act(async () => {
            expectChannel(`${ws}:note:n1`)._triggerSubscribe('CHANNEL_ERROR', new Error('subscribe failed'))
        })

        expect(result.current.isError).toBe(true)
        expect(result.current.error?.message).toBe('subscribe failed')
    })
})

describe('useNoteChannel — shared channel & ref-counting', () => {
    it('two consumers with the same name share a single supabase channel', () => {
        const ws = uniqueWs()
        renderHook(() => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'shared' }))
        renderHook(() => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'shared' }))

        expect(supabaseRef.current.channel).toHaveBeenCalledTimes(1)
    })
})

describe('useNoteChannel — teardown grace window', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(()  => { vi.useRealTimers() })

    it('defers teardown by 2000 ms after the last consumer unmounts', async () => {
        const ws = uniqueWs()
        const { unmount } = renderHook(
            () => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'a' })
        )

        unmount()

        await act(async () => { vi.advanceTimersByTime(1999) })
        expect(supabaseRef.current.removeChannel).not.toHaveBeenCalled()

        await act(async () => { vi.advanceTimersByTime(1) })
        expect(supabaseRef.current.removeChannel).toHaveBeenCalledTimes(1)
    })

    it('a remount inside the grace window cancels the teardown', async () => {
        const ws = uniqueWs()
        const { unmount } = renderHook(
            () => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'b' })
        )

        unmount()

        await act(async () => { vi.advanceTimersByTime(1000) })

        // Remount BEFORE the grace window expires.
        renderHook(() => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'b' }))

        // Push well past the original teardown deadline.
        await act(async () => { vi.advanceTimersByTime(5000) })

        expect(supabaseRef.current.removeChannel).not.toHaveBeenCalled()
        // And the shared entry was reused — no second channel was created.
        expect(supabaseRef.current.channel).toHaveBeenCalledTimes(1)
    })
})

describe('useNoteChannel — presence/broadcast fan-out', () => {
    it('forwards presence events to every registered consumer', async () => {
        const ws = uniqueWs()
        const onPresence1 = vi.fn()
        const onPresence2 = vi.fn()

        renderHook(() => channelModule.useNoteChannel({
            workspace_id: ws, note_id: 'fan', onPresence: onPresence1,
        }))
        renderHook(() => channelModule.useNoteChannel({
            workspace_id: ws, note_id: 'fan', onPresence: onPresence2,
        }))

        const ch = expectChannel(`${ws}:note:fan`)
        await act(async () => { ch._triggerSubscribe('SUBSCRIBED', null) })

        const payload = { event: 'sync' }
        await act(async () => { ch._emitPresence(payload) })

        expect(onPresence1).toHaveBeenCalledWith(ch, payload)
        expect(onPresence2).toHaveBeenCalledWith(ch, payload)
    })

    it('forwards broadcast events to every registered consumer', async () => {
        const ws = uniqueWs()
        const onBroadcast1 = vi.fn()
        const onBroadcast2 = vi.fn()

        renderHook(() => channelModule.useNoteChannel({
            workspace_id: ws, note_id: 'bc', onBroadcast: onBroadcast1,
        }))
        renderHook(() => channelModule.useNoteChannel({
            workspace_id: ws, note_id: 'bc', onBroadcast: onBroadcast2,
        }))

        const ch = expectChannel(`${ws}:note:bc`)
        await act(async () => { ch._triggerSubscribe('SUBSCRIBED', null) })

        const payload = { event: 'note_updated' }
        await act(async () => { ch._emitBroadcast(payload) })

        expect(onBroadcast1).toHaveBeenCalledWith(ch, payload)
        expect(onBroadcast2).toHaveBeenCalledWith(ch, payload)
    })

    it('uses the latest onPresence handler when it changes between renders', async () => {
        const ws = uniqueWs()
        const first  = vi.fn()
        const second = vi.fn()

        const { rerender } = renderHook(
            ({ onP }) => channelModule.useNoteChannel({
                workspace_id: ws, note_id: 'reflatest', onPresence: onP,
            }),
            { initialProps: { onP: first } }
        )

        rerender({ onP: second })

        const ch = expectChannel(`${ws}:note:reflatest`)
        await act(async () => { ch._triggerSubscribe('SUBSCRIBED', null) })
        await act(async () => { ch._emitPresence({ event: 'sync' }) })

        expect(first).not.toHaveBeenCalled()
        expect(second).toHaveBeenCalledTimes(1)
    })
})

describe('channel name builders', () => {
    it('useNoteChannel uses ws:note:<id>', () => {
        const ws = uniqueWs()
        renderHook(() => channelModule.useNoteChannel({ workspace_id: ws, note_id: 'X' }))
        expect(supabaseRef.current.channel).toHaveBeenCalledWith(`${ws}:note:X`)
    })

    it('useFolderChannel uses ws:folder:<id>', () => {
        const ws = uniqueWs()
        renderHook(() => channelModule.useFolderChannel({ workspace_id: ws, folder_id: 'Y' }))
        expect(supabaseRef.current.channel).toHaveBeenCalledWith(`${ws}:folder:Y`)
    })

    it('useNotesListChannel uses ws:notes:<folderId>', () => {
        const ws = uniqueWs()
        renderHook(() => channelModule.useNotesListChannel({ workspace_id: ws, folder_id: 'Z' }))
        expect(supabaseRef.current.channel).toHaveBeenCalledWith(`${ws}:notes:Z`)
    })
})
