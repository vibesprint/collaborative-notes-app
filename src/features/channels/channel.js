import { supabase } from '../../lib/supabase/client.js'
import { useState, useEffect, useRef } from 'react'

let CHANNELS = {}


function getOrCreateEntry(channel_name) {
    let entry = CHANNELS[channel_name]
    if (entry != null) return entry

    entry = {
        channel: null,
        status: 'pending',
        error: null,
        onPresence: new Set(),
        onBroadcast: new Set(),
        syncFunctions: new Set(),
        refCount: 0,
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

function useChannel(channel_name, on_presence, on_broadcast) {

    const [state, setState] = useState({status: 'pending', channel: null, error: null})

    const presenceRef = useRef(on_presence)
    const broadcastRef = useRef(on_broadcast)
    presenceRef.current = on_presence
    broadcastRef.current = on_broadcast

    useEffect(() => {

        const entry = getOrCreateEntry(channel_name)
        entry.refCount += 1;

        const presenceHandler = (chan, p) => presenceRef.current?.(chan, p)
        const broadcastHandler = (chan, p) => broadcastRef.current?.(chan, p)

        entry.onPresence.add(presenceHandler)
        entry.onBroadcast.add(broadcastHandler)

        const sync = () => setState({status: entry.status, channel: entry.channel, error: entry.error})
        entry.syncFunctions.add(sync)
        sync()

        return () => {
            entry.onPresence.delete(presenceRef.current)
            entry.onBroadcast.delete(broadcastRef.current)
            entry.syncFunctions.delete(sync)
            entry.refCount -= 1;

            if (entry.refCount <= 0) {
                supabase.removeChannel(entry.channel)
                delete CHANNELS[channel_name]
            }
        }
    }, [])
    return { isPending: state.status === 'pending', isError: state.status === 'error', isSuccess: state.status === 'success',
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
