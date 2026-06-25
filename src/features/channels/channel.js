import { supabase } from '../../lib/supabase/client.js'
import { useState, useEffect } from 'react'

export function useFolderPresence(workspace_id, folder_id) {
    const channel_name =`${workspace_id}:folder:${folder_id}`

    const [isPending, setIsPending] = useState(true)
    const [isError, setIsError] = useState(false)
    const [error, setError] = useState(null)
    const [data, setData] = useState(null)
    const [channel, setChannel] = useState(null)

    useEffect(() => {
        const new_channel = supabase.channel(channel_name)
        try {
            setChannel(new_channel)
            subscribe(new_channel, setIsPending, setIsError, setError, setData)
        } catch(err) {
            setIsPending(false)
            setIsError(true)
            setError(err)
            setData(null)
        }
        return () => new_channel.unsubscribe()

    }, [channel_name])

    return { isPending, isError, error, presenceState: data, channel }
}


function subscribe(channel, setIsPending, setIsError, setError, setData) {
    setIsPending(true)
    setIsError(false)
    setError(null)
    setData(null)

    channel.on('presence', { event: 'join' }, (payload) => {

    }).on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setData(state)

    }).on('presence', { event: 'leave' }, (payload) => {

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
