import { useMutation, useQuery } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase/client.js'
import { queryClient } from '../../queryClient.js'
import { useAuth } from '../auth/auth.jsx'
import { getCurrentWorkspaceId } from '../workspaces/workspace.js'
import { useOptimisticMutation } from '../utils/optimistic.js'



export function useCreateNote() {
    return useMutation({
        mutationFn: createNote,
        onSuccess: (data, args, onMutateResult, context) => context.client.invalidateQueries(QUERY_KEYS.list_root()),
    })
}


async function createNote({title, body, folder_id}) {
    const user_id = useAuth.getState().session?.user?.id
    const workspace_id = getCurrentWorkspaceId()

    const { error } = await supabase.from('notes').insert({ title, body, folder_id, user_id, workspace_id })
    if (error != null)
        throw error
}


async function deleteNote(note_id) {

    const workspace_id = await getCurrentWorkspaceId()
    const { error } = await supabase.from('notes').delete().eq('id', note_id).eq('workspace_id', workspace_id)
    if (error != null)
        throw error
}

export function useDeleteNote(queryKey) {
    return useOptimisticMutation({
        mutationFn: deleteNote,
        queryKey,
        optimisticApply: (new_note_id, old_list) => old_list.filter((note) => note.id !== new_note_id)
    })
}

export const QUERY_KEYS = {
    all: ['notes'],
    list_root: () => [...QUERY_KEYS.all, 'list', 'root'],
    details: (note_id) => [...QUERY_KEYS.all, note_id],
    list_in_folder: (folder_id) => [...QUERY_KEYS.all, 'list', 'folder', folder_id]
}

async function fetchNotes() {
    const { data, error } = await supabase.from('notes').select()
    if (error != null)
        throw error

    return data
}


export function useGetNotes() {
    return useQuery({
        queryKey: QUERY_KEYS.list_root(),
        queryFn: fetchNotes
    })
}


async function getNote(note_id) {
    const { data, error } = await supabase.from('notes').select().eq('id', note_id)

    if (error != null)
        throw error

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
    const optimisticApply = (new_note, old_list) =>  (
        old_list.map((note) => {
            if (new_note.id === note.id) return new_note
            else
                return note
        }
    ))

    return useMutation({
        mutationFn: ({ title, body }) => updateNote({ note_id, title, body }),
        onMutate: (args, context) => {
            context.client.cancelQueries({
                queryKey: QUERY_KEYS.details(note_id)
            })

            context.client.cancelQueries({
                queryKey: QUERY_KEYS.list_root()
            })

            const previous_note = context.client.getQueryData(QUERY_KEYS.details(note_id))
            const previous_list = context.client.getQueryData(QUERY_KEYS.list_root())
            context.client.setQueryData(QUERY_KEYS.details(note_id), (old) => ({...old, ...args}))
            context.client.setQueryData(QUERY_KEYS.list_root(), (old_list) => {
                return old_list.map((note) => {
                    if (note.id === note_id)
                        return args
                    return note
                })
            })

            return { previous_note, previous_list }
        },

        onSettled: (data, error, args, onMutateResult, context) => {
            if (context.client.isMutating() === 1) {
                context.client.invalidateQueries(QUERY_KEYS.details(note_id))
                context.client.invalidateQueries(QUERY_KEYS.list_root())
            }
        },

        onError: (error, args, onMutateResult, context) => {
            context.client.setQueryData(QUERY_KEYS.details(note_id), onMutateResult.previous_note)
            context.client.setQueryData(QUERY_KEYS.list_root(), onMutateResult.previous_list)
        }
    })
}
