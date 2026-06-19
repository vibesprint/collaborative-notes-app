import { useMutation, useQuery } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase/client.js'
import { queryClient } from '../../queryClient.js'
import { useAuth } from '../auth/auth.jsx'
import { getCurrentWorkspaceId } from '../workspaces/workspace.js'
import { useOptimisticMutation } from '../utils/optimistic.js'



export function useCreateNote() {
    return useMutation({
        mutationFn: createNote,
        onSuccess: (data, args, onMutateResult, context) => context.client.invalidateQueries(QUERY_KEYS.list()),
    })
}


async function createNote({title, body}) {
    const user_id = useAuth.getState().session?.user?.id
    const workspace_id = getCurrentWorkspaceId()

    const { error } = await supabase.from('notes').insert({ title, body, user_id, workspace_id })
    if (error != null)
        throw error
}


async function deleteNote(note_id) {

    const workspace_id = await getCurrentWorkspaceId()
    const { error } = await supabase.from('notes').delete().eq('id', note_id).eq('workspace_id', workspace_id)
    if (error != null)
        throw error
}

export function useDeleteNote() {
    return useOptimisticMutation({
        mutationFn: deleteNote,
        queryKey: QUERY_KEYS.list(),
        optimisticApply: (new_note_id, old_list) => old_list.filter((note) => note.id !== new_note_id)
    })
}

const QUERY_KEYS = {
    all: ['notes'],
    list: () => [...QUERY_KEYS.all, 'list'],
    details: (note_id) => [...QUERY_KEYS.all, note_id],
}

async function fetchNotes() {
    const { data, error } = await supabase.from('notes').select()
    if (error != null)
        throw error

    return data
}


export function useGetNotes() {
    return useQuery({
        queryKey: QUERY_KEYS.list(),
        queryFn: fetchNotes
    })
}


async function getNote(note_id) {
    const { data, error } = await supabase.from('notes').select().eq('id', note_id)

    if (error != null)
        throw error

    console.log('got the data from network', data)
    return data[0]
}

export function useNote(note_id) {
    return useQuery({
        queryKey: QUERY_KEYS.details(note_id),
        queryFn: () => getNote(note_id)
    })
}


async function updateNote({note_id, title, body}) {
    const { error } = await supabase.from('notes').update({ title, body }).eq('id', note_id)

    if (error != null)
        throw error
}

export function useUpdateNote(note_id) {
    const optimisticApply = (new_note, old_note) =>  ({ ...old_note, ...new_note })
    return useOptimisticMutation({
        mutationFn: ({ title, body }) => updateNote({ note_id, title, body }),
        queryKey: QUERY_KEYS.details(note_id),
        optimisticApply
    })
}
