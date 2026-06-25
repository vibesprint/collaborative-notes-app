import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { QUERY_KEYS as notesQueryKeys, PAGE_SIZE as NOTES_PAGE_SIZE } from '../notes/note.js'


const QUERY_KEYS = {
    all: ['folders'],
    folder_list_all: (workspace_id, folder_id) => [...QUERY_KEYS.all, workspace_id, folder_id, 'list'],
    folder_list_search: (workspace_id, folder_id, search, pageno) => [...QUERY_KEYS.all, workspace_id, folder_id, 'list', 'search', search, 'page', pageno],
    folder: (wspc_id, folder_id) => [...QUERY_KEYS.all, 'details', wspc_id, folder_id]
}

export const PAGE_SIZE = 10;

async function getFolders(workspace_id, folder_id, search, page) {
    const [start, end] = [(page - 1) * PAGE_SIZE, page * PAGE_SIZE]
    let query = supabase.from('folders').select().eq('workspace_id', workspace_id)
    if (folder_id == null)
        query = query.is('parent_id', null)
    else
        query = query.eq('parent_id', folder_id)

    if (search && search !== '')
        query = query.textSearch('title', `'${search}'`)

    query = query.range(start, end)

    const { data, error } = await query
    if (error != null) throw error

    return data
}


export function useGetFolders(workspace_id, folder_id, search, page) {
    return useQuery({
        queryKey: QUERY_KEYS.folder_list_search(workspace_id, folder_id, search, page),
        queryFn: () => getFolders(workspace_id, folder_id, search, page)
    })
}



async function createFolder({ name, workspace_id, parent_id }) {
    const { error } = await supabase.from('folders').insert({ name, workspace_id, parent_id })
    if (error != null) throw error;
}

export function useCreateFolder() {
    return useMutation({
        mutationFn: createFolder,
        onSuccess: (data, args, onMutateResult, context) => {
            const queryKey = QUERY_KEYS.folder_list_all(args.workspace_id, args.parent_id)
            context.client.invalidateQueries({ queryKey })
        }
    })
}


async function deleteFolder(folder) {
    let query = supabase.from('folders').delete().match({ workspace_id: folder.workspace_id, id: folder.id })
    const { error } = await query;
    if (error != null) throw error;
}


export function useDeleteFolder() {
    return useMutation({
        mutationFn: deleteFolder,
        onSuccess: (data, args, onMutateResult, context) => {
            const queryKey = QUERY_KEYS.folder_list_all(args.workspace_id, args.parent_id)

            context.client.invalidateQueries({
                queryKey
            })
        },

    })
}


async function getFolder(workspace_id, folder_id) {
    const { data, error } = await supabase.from('folders').select().match({ workspace_id, id: folder_id })
    if (error != null) throw error;
    return data[0];
}

export function useGetFolder(workspace_id, folder_id) {
    return useQuery({
        queryKey: QUERY_KEYS.folder(workspace_id, folder_id),
        queryFn: () => getFolder(workspace_id, folder_id)
    })
}


import { queryClient } from '../../queryClient.js'

export function invalidateFolderData(workspace_id, folder_id) {
    queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.folder_list_all(workspace_id, folder_id)
    })
}
