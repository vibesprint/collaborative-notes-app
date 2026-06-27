import { supabase } from '../../lib/supabase/client.js'
import { useState, useEffect, useRef } from 'react'

let CHANNELS = {}


function getOrCreateEntry(channel_name) {
    let entry = CHANNELS[channel_name]
    if (entry != null) {
        if (entry.teardownTimer != null) {
            if (entry.status === 'tearingdown') {
                return entry
            }

            clearTimeout(entry.teardownTimer)
            entry.teardownTimer = null
            entry.status = 'success'
        }

        return entry
    }

    entry = {
        channel: null,
        status: 'pending',
        error: null,
        onPresence: new Set(),
        onBroadcast: new Set(),
        syncFunctions: new Set(),
        refCount: 0,
        teardownTimer: null,
    }

    CHANNELS[channel_name] = entry

    const channel = supabase.channel(channel_name)
    entry.channel = channel

    channel.on('presence', { event: '*' }, payload => {
        for (let h of entry.onPresence)
            h(entry.channel, payload)
    }).on('broadcast', { event: '*' }, payload => {
        for (let h of entry.onBroadcast)
            h(entry.channel, payload)
    }).subscribe((status, error) => {
        if (error != null) {
            entry.error = error
            entry.status = 'error'
        } else {
            entry.error = null
            entry.status = 'success'
        }

        for (let s of entry.syncFunctions)
            s()
    })

    return entry

}

const TEARDOWN_TIMER_GRACE = 2000;

function useChannel(channel_name, on_presence, on_broadcast) {

    const [state, setState] = useState({status: 'pending', channel: null, error: null})
    const [updateTrigger, setUpdateTrigger] = useState(false)

    const presenceRef = useRef(on_presence)
    const broadcastRef = useRef(on_broadcast)
    presenceRef.current = on_presence
    broadcastRef.current = on_broadcast

    useEffect(() => {

        const entry = getOrCreateEntry(channel_name)

        const sync = () => setState({status: entry.status, channel: entry.channel, error: entry.error})
        sync()

        if (entry.status === 'tearingdown')
            return

        entry.refCount += 1;

        const presenceHandler = (chan, p) => presenceRef.current?.(chan, p)
        const broadcastHandler = (chan, p) => broadcastRef.current?.(chan, p)

        entry.onPresence.add(presenceHandler)
        entry.onBroadcast.add(broadcastHandler)

        entry.syncFunctions.add(sync)

        return () => {
            entry.onPresence.delete(presenceHandler)
            entry.onBroadcast.delete(broadcastHandler)
            entry.syncFunctions.delete(sync)
            entry.refCount -= 1;

            if (entry.refCount <= 0) {
                entry.teardownTimer = setTimeout(() => {
                    if (entry.refCount <= 0) {
                        entry.status = 'tearingdown'
                        supabase.removeChannel(entry.channel).then(() => {
                            delete CHANNELS[channel_name]
                            setUpdateTrigger(!updateTrigger)
                        })
                    }
                }, TEARDOWN_TIMER_GRACE)
            }
        }
    }, [channel_name, updateTrigger])
    return { isTearingDown: state.status === 'tearingdown', isPending: state.status === 'pending', isError: state.status === 'error', isSuccess: state.status === 'success',
    error: state.error, channel: state.channel }
}


export function useFolderChannel({ workspace_id, folder_id, onPresence, onBroadcast }) {
    const channel_name =`${workspace_id}:folder:${folder_id}`
    return useChannel(channel_name, onPresence, onBroadcast)
}


export function useNoteChannel({ workspace_id, note_id, onPresence, onBroadcast }) {
    const channel_name =`${workspace_id}:note:${note_id}`
    return useChannel(channel_name, onPresence, onBroadcast)
}


export function useNotesListChannel({ workspace_id, folder_id, onPresence, onBroadcast }) {
    const channel_name =`${workspace_id}:notes:${folder_id}`
    return useChannel(channel_name, onPresence, onBroadcast)
}
