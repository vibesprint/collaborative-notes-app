import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'


const QUERY_KEYS = {
    all: ['folders'],
    root_list: () => [...QUERY_KEYS.all, 'list', 'root'],
    folder_list: (id) => [...QUERY_KEYS.all, 'list', id],
    folder: (wspc_id, folder_id) => [...QUERY_KEYS.all, 'details', wspc_id, folder_id]
}

async function listRootFolders(workspace_id) {
    const { data, error } = await supabase.from('folders').select().eq('workspace_id', workspace_id).is('parent_id', null)
    if (error != null) {
        throw error;
    }

    return data;
}

export function useListRootFolders(workspace_id) {
    return useQuery({
        queryKey: QUERY_KEYS.root_list(),
        queryFn: () => listRootFolders(workspace_id),
        retry: false
    })
}

async function listFoldersInFolder(folder) {
    const { data, error } = await supabase.from('folders').select().eq('workspace_id', folder.workspace_id).eq('parent_id', folder.id)
    if (error != null) {
        console.log('error in list folders', error)
        throw error;
    }

    return data;
}

export function useListFoldersInFolder(folder) {
    return useQuery({
        queryKey: QUERY_KEYS.folder_list(folder.id),
        queryFn: () => listFoldersInFolder(folder)
    })
}

async function listNotesInFolder(folder) {
    const { data, error } = await supabase.from('notes').select().eq('workspace_id', folder.workspace_id).eq('folder_id', folder.id)
    if (error != null) {
        console.log('error is list notes', error)
        throw error;
    }

    return data;
}

export function useListNotesInFolder(folder) {
    return useQuery({
        queryKey: QUERY_KEYS.folder_list(folder.id),
        queryFn: () => listNoteInFolder(folder)
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
            const queryKey = args.parent_id == null ? QUERY_KEYS.root_list() : QUERY_KEYS.folder_list(args.parent_id)
            context.client.invalidateQueries({ queryKey })
        }
    })
}


async function deleteFolder(folder) {
    const { error } = await supabase.from('folders').match({ workspace_id: folder.workspace_id, id: folder.id }).delete()
    if (error != null) throw error;
}


export function useDeleteFolder() {
    return useMutation({
        mutationFn: deleteFolder,
        onSuccess: (data, args, onMutateResult, context) => {
            let queryKey;
            if (args.parent_id == null)
                queryKey = QUERY_KEYS.root_list()
            else
                queryKey = QUERY_KEYS.folder_list(onMutateResult.parent_id)

            context.client.invalidateQueries({
                queryKey
            })
        }
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
