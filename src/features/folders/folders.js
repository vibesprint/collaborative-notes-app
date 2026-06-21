import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'


const QUERY_KEYS = {
    all: ['folders'],
    root_list: () => [...QUERY_KEYS.all, 'list', 'root'],
    folder_list: (id) => [...QUERY_KEYS.all, 'list', id],
    folder: (id) => [...QUERY_KEYS.all, 'details', id]
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
    const { data, error } = await supabase.from('folders').eq('workspace_id', folder.workspace_id).eq('parent_id', folder.id).select()
    if (error != null) throw error;

    return data;
}

export function useListFoldersInFolder(folder) {
    return useQuery({
        queryKey: QUERY_KEYS.folder_list(folder.id),
        queryFn: () => listFoldersInFolder(folder)
    })
}

async function listNotesInFolder(folder) {
    const { data, error } = await supabase.from('notes').eq('workspace_id', folder.workspace_id).eq('folder_id', folder.id).select()
    if (error != null) throw error;

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
