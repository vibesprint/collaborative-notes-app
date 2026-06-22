import { useMutation, useQuery } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase/client.js'
import { queryClient } from '../../queryClient.js'
import { useAuth } from '../auth/auth.jsx'
import { getCurrentWorkspaceId } from '../workspaces/workspace.js'
import { useOptimisticMutation } from '../utils/optimistic.js'



export function useCreateNote() {
    return useMutation({
        mutationFn: createNote,
        onSuccess: (data, args, onMutateResult, context) => context.client.invalidateQueries(QUERY_KEYS.list_root_all()),
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

export const PAGE_SIZE = 10;

export const QUERY_KEYS = {
    all: ['notes'],
    list_all: () => [...QUERY_KEYS.all, 'list'],
    list_root_all: () => [...QUERY_KEYS.all, 'list', 'root'],
    list_root_search: (search, page_no) => [...QUERY_KEYS.all, 'list',  'root', 'search', search, 'pageno', page_no],
    details: (note_id) => [...QUERY_KEYS.all, note_id],
    list_in_folder_all: (folder_id) => [...QUERY_KEYS.all, 'list', 'folder', folder_id],
    list_in_folder_search: (folder_id, search, page_no) => [...QUERY_KEYS.all, 'list', 'folder', folder_id, 'search', search, 'pageno', page_no]
}

async function fetchNotes(searchKey, page) {
    const [start, end] = [(page - 1) * PAGE_SIZE, page * PAGE_SIZE]
    let query = supabase.from('notes').select()
    if (searchKey != null && searchKey !== '')
        query = query.textSearch('title', `'${searchKey}'`)
    query = query.range(start, end)

    const { data, error } = await query
    if (error != null)
        throw error

    return data
}


export function useGetNotes(search, page) {
    return useQuery({
        queryKey: QUERY_KEYS.list_root_search(search, page),
        queryFn: () => fetchNotes(search, page)
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
                    queryKey: QUERY_KEYS.list_root_all(),
                })
            }
        },

        onError: (error, args, onMutateResult, context) => {
            context.client.setQueryData(QUERY_KEYS.details(note_id), onMutateResult.previous_note)
        }
    })
}
