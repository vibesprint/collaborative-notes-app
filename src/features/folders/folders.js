import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { QUERY_KEYS as notesQueryKeys, PAGE_SIZE as NOTES_PAGE_SIZE } from '../notes/note.js'


const QUERY_KEYS = {
    all: ['folders'],
    root_list_all: (workspace_id) => [...QUERY_KEYS.all, workspace_id, 'list', 'root'],
    root_list_search: (workspace_id, search, pageno) => [...QUERY_KEYS.all, workspace_id, 'list', 'root', 'search', search, 'page', pageno],
    folder_list_all: (id) => [...QUERY_KEYS.all, id, 'list'],
    folder_list_search: (id, search, pageno) => [...QUERY_KEYS.all, id, 'list', 'search', search, 'page', pageno],
    folder: (wspc_id, folder_id) => [...QUERY_KEYS.all, 'details', wspc_id, folder_id]
}

export const PAGE_SIZE = 10;

async function listRootFolders(workspace_id, search, page) {
    const [start, end] = [(page - 1) * PAGE_SIZE, page * PAGE_SIZE]
    let query = supabase.from('folders').select().eq('workspace_id', workspace_id).is('parent_id', null)
    if (search != null && search !== '')
        query = query.textSearch('name', `'${search}'`)
    query = query.range(start, end)

    const { data, error } = await query;
    if (error != null) {
        throw error;
    }

    return data;
}

export function useListRootFolders(workspace_id, search, page) {
    return useQuery({
        queryKey: QUERY_KEYS.root_list_search(workspace_id, search, page),
        queryFn: () => listRootFolders(workspace_id, search, page),
        retry: false
    })
}

async function listFoldersInFolder(folder, search, page) {
    const [start, end] = [(page - 1) * PAGE_SIZE, page * PAGE_SIZE]
    let query = supabase.from('folders').select().eq('workspace_id', folder.workspace_id).eq('parent_id', folder.id)

    if (search != null && search !== '')
        query = query.textSearch('name', `'${search}'`)

    query = query.range(start, end)
    const { data, error } = await query
    if (error != null) {
        console.log('error in list folders', error)
        throw error;
    }

    return data;
}

export function useListFoldersInFolder(folder, search, pageno) {
    return useQuery({
        queryKey: QUERY_KEYS.folder_list_search(folder.id, search, pageno),
        queryFn: () => listFoldersInFolder(folder, search, pageno)
    })
}

async function listNotesInFolder(folder, search, page) {
    const [start, end] = [(page - 1) * NOTES_PAGE_SIZE, page * NOTES_PAGE_SIZE]

    let query = supabase.from('notes').select().eq('workspace_id', folder.workspace_id).eq('folder_id', folder.id)
    if (search != null && search !== '')
        query = query.textSearch('title', `'${search}'`)

    query = query.range(start, end)
    const { data, error } = await query;
    if (error != null) {
        throw error;
    }

    return data;
}

export function useListNotesInFolder(folder, search, pageno) {
    return useQuery({
        queryKey: notesQueryKeys.list_in_folder_search(folder.id, search, pageno),
        queryFn: () => listNotesInFolder(folder, search, pageno)
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
            const queryKey = args.parent_id == null ? QUERY_KEYS.root_list_all() : QUERY_KEYS.folder_list_all(args.parent_id)
            context.client.invalidateQueries({ queryKey })
        }
    })
}


async function deleteFolder(folder) {
    let query = supabase.from('folders').delete().match({ workspace_id: folder.workspace_id, id: folder.id })
    if (folder.parent_id != null)
        query = query.eq('parent_id', folder.parent_id)
    else
        query = query.is('parent_id', null)

    const { error } = await query;
    if (error != null) throw error;
}


export function useDeleteFolder() {
    return useMutation({
        mutationFn: deleteFolder,
        onMutate: (args, context) => {
            return { parent_id: args.parent_id }
        },

        onSuccess: (data, args, onMutateResult, context) => {
            let queryKey;
            if (args.parent_id == null)
                queryKey = QUERY_KEYS.root_list_all(args.workspace_id)
            else
                queryKey = QUERY_KEYS.folder_list_all(args.parent_id)

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
