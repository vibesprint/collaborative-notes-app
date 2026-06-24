import { useMutation, useQuery } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase/client.js'
import { queryClient } from '../../queryClient.js'
import { useAuth } from '../auth/auth.jsx'
import { useOptimisticMutation } from '../utils/optimistic.js'



export function useCreateNote() {
    return useMutation({
        mutationFn: createNote,
        onSuccess: (data, args, onMutateResult, context) => context.client.invalidateQueries(QUERY_KEYS.list_root_all(data.workspace_id)),
    })
}


async function createNote({title, body, folder_id, workspace_id}) {
    const user_id = useAuth.getState().session?.user?.id
    if (workspace_id == null) throw new Error('no workspace found')

    const { data, error } = await supabase.from('notes').insert({ title, body, folder_id, user_id, workspace_id }).select()
    if (error != null)
        throw error

    console.log('data from createNote', data)
    return data[0]
}


async function deleteNote(note) {

    const { error } = await supabase.from('notes').delete().eq('id', note.id)
    if (error != null)
        throw error
}

export function useDeleteNote(queryKey) {
    return useMutation({
        mutationFn: deleteNote,
        onSettled: (data, error, args, onMutateResult, context) => {
            if (error != null)
                console.log('error in delete note', error)
            context.client.invalidateQueries({
                queryKey
            })
        }
    })
}

export const PAGE_SIZE = 10;

export const QUERY_KEYS = {
    all: ['notes'],
    list_all: (wspc_id) => [...QUERY_KEYS.all, wspc_id, 'list'],
    list_root_all: (wspc_id) => [...QUERY_KEYS.all, wspc_id, 'list', 'root'],
    list_root_search: (wspc_id, search, page_no) => [...QUERY_KEYS.all, wspc_id, 'list',  'root', 'search', search, 'pageno', page_no],
    details: (note_id) => [...QUERY_KEYS.all, note_id],
    list_in_folder_all: (wspc_id, folder_id) => [...QUERY_KEYS.all, wspc_id, 'list', 'folder', folder_id],
    list_in_folder_search: (wspc_id, folder_id, search, page_no) => [...QUERY_KEYS.all, wspc_id, 'list', 'folder', folder_id, 'search', search, 'pageno', page_no]
}

async function fetchNotes(workspace_id, folder_id, searchKey, page) {
    const [start, end] = [(page - 1) * PAGE_SIZE, page * PAGE_SIZE]
    let query = supabase.from('notes').select().eq('workspace_id', workspace_id)
    if (searchKey != null && searchKey !== '')
        query = query.textSearch('title', `'${searchKey}'`)
    query = query.range(start, end)

    const { data, error } = await query
    if (error != null)
        throw error

    return data
}


export function useGetNotes(workspace_id, folder_id, search, page) {
    return useQuery({
        queryKey: QUERY_KEYS.list_root_search(workspace_id, search, page),
        queryFn: () => fetchNotes(workspace_id, folder_id, search, page)
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

export function useUpdateNote(note) {

    const note_id = note.id
    return useMutation({
        mutationFn: ({ title, body }) => updateNote({ note_id, title, body }),
        onMutate: (args, context) => {
            context.client.cancelQueries({
                queryKey: QUERY_KEYS.details(note_id)
            })

            const previous_note = context.client.getQueryData(QUERY_KEYS.details(note_id))
            context.client.setQueryData(QUERY_KEYS.details(note_id), (old) => ({...old, ...args}))

            return { previous_note }
        },

        onSettled: (data, error, args, onMutateResult, context) => {
            if (context.client.isMutating() === 1) {

                context.client.invalidateQueries({
                    queryKey: QUERY_KEYS.details(note_id),
                })

                context.client.invalidateQueries({
                    queryKey: QUERY_KEYS.list_root_all(note.workspace_id),
                })
            }
        },

        onError: (error, args, onMutateResult, context) => {
            context.client.setQueryData(QUERY_KEYS.details(note_id), onMutateResult.previous_note)
        }
    })
}
