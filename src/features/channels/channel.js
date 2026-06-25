import { supabase } from '../../lib/supabase/client.js'
import { useState, useEffect } from 'react'

export function useFolderChannel({ workspace_id, folder_id, onPresence, onBroadcast }) {
    const channel_name =`${workspace_id}:folder:${folder_id}`

    const [isPending, setIsPending] = useState(true)
    const [isError, setIsError] = useState(false)
    const [error, setError] = useState(null)
    const [channel, setChannel] = useState(null)

    useEffect(() => {
        const new_channel = supabase.channel(channel_name)
        try {
            setChannel(new_channel)
            subscribe(new_channel, setIsPending, setIsError, setError, onPresence, onBroadcast)
        } catch(err) {
            setIsPending(false)
            setIsError(true)
            setError(err)
        }
        return () => new_channel.unsubscribe()

    }, [channel_name])

    return { isPending, isError, isSuccess: !isPending && !isError, error, channel }
}


function subscribe(channel, setIsPending, setIsError, setError, onPresence, onBroadcast) {
    channel.on('broadcast', { event: '*' }, (payload) => {
        if(onBroadcast != null)
            onBroadcast(channel, payload)

    }).on('presence', { event: '*' }, (payload) => {
        if (onPresence != null)
            onPresence(channel, payload)

    }).subscribe((status, error) => {
        setIsPending(false)
        if (error != null) {
            setError(error)
            setIsError(true)
            return
        }
        setIsError(false)
        setError(null)
    })

}


export function useNotesListChannel({ workspace_id, folder_id, onPresence, onBroadcast }) {
    const channel_name =`${workspace_id}:notes:${folder_id}`

    const [isPending, setIsPending] = useState(true)
    const [isError, setIsError] = useState(false)
    const [error, setError] = useState(null)
    const [channel, setChannel] = useState(null)

    useEffect(() => {
        const new_channel = supabase.channel(channel_name)
        try {
            setChannel(new_channel)
            subscribe(new_channel, setIsPending, setIsError, setError, onPresence, onBroadcast)
        } catch(err) {
            setIsPending(false)
            setIsError(true)
            setError(err)
        }
        return () => new_channel.unsubscribe()

    }, [channel_name])

    return { isPending, isError, isSuccess: !isPending && !isError, error, channel }
}

export function useNoteChannel({ workspace_id, note_id, onPresence, onBroadcast }) {
    const channel_name =`${workspace_id}:note:${note_id}`

    const [isPending, setIsPending] = useState(true)
    const [isError, setIsError] = useState(false)
    const [error, setError] = useState(null)
    const [channel, setChannel] = useState(null)

    useEffect(() => {
        const new_channel = supabase.channel(channel_name)
        try {
            setChannel(new_channel)
            subscribe(new_channel, setIsPending, setIsError, setError, onPresence, onBroadcast)
        } catch(err) {
            setIsPending(false)
            setIsError(true)
            setError(err)
        }
        return () => new_channel.unsubscribe()

    }, [channel_name])

    return { isPending, isError, isSuccess: !isPending && !isError, error, channel }
}
