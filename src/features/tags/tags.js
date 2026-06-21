import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'


const QUERY_KEYS = {
    all: ['tags'],
    lists: () => [...QUERY_KEYS.all, 'list'],
    tags_for_note: (id) => [...QUERY_KEYS.all, 'note', id],
    tags_for_workspace: (id) => [...QUERY_KEYS.all, 'workspace', id]
}


async function getTagsForNotes(notes) {
    let result = {}
    for (let note of notes) {
        const { data, error } = await supabase.rpc('get_tags_for_note', { note_wspc_id: note.workspace_id, my_note_id: note.id })
        if (error != null)
            throw error;

        result[note.id] = data
    }

    return result;
}

export function useGetTagsForNotes(notes) {
    return useQuery({
        queryKey: QUERY_KEYS.tags_for_note(notes.map(elem => elem.id)),
        queryFn: () => getTagsForNotes(notes)
    })
}


async function getTagsForWorkspace(workspace_id) {
    const { data, error } = await supabase.rpc('get_tags_for_workspace', { wspc_id: workspace_id })
    if (error != null) throw error;

    return data;
}

export function useGetTagsForWorkspace(workspace_id) {
    return useQuery({
        queryKey: QUERY_KEYS.tags_for_workspace(workspace_id),
        queryFn: () => getTagsForWorkspace(workspace_id)
    })
}

async function deleteTagFromNote({note, tag_id}) {
    const { error, data } = await supabase.rpc('delete_tag_from_note', { my_wspc_id: note.workspace_id, my_note_id: note.id, my_tag_id: tag_id })
    if (error != null) throw error;

    return data;
}


export function useDeleteTagFromNote() {
    return useMutation({
        mutationFn: deleteTagFromNote,
        onSettled: (data, error, args, onMutateResult, context) => context.client.invalidateQueries({
            queryKey: QUERY_KEYS.all
        })
    })
}


async function deleteTag(tag_id) {
    const { error, data } = await supabase.rpc('delete_tag', { my_tag_id: tag_id })
    if (error != null) throw error;

    return data;
}


export function useDeleteTag() {
    return useMutation({
        mutationFn: deleteTag,
        onSettled: (data, error, args, onMutateResult, context) => context.client.invalidateQueries({
            queryKey: QUERY_KEYS.all
        })
    })
}


async function addTagToNote({note, tag_name}) {
    const { data, error } = await supabase.rpc('add_tag_to_note', { wspc_id: note.workspace_id, note_id: note.id, tag_name })
    if (error != null) throw error;

    return data;
}


export function useAddTagToNote() {
    return useMutation({
        mutationFn: addTagToNote,
        onSettled: (data, error, args, onMutateResult, context) => context.client.invalidateQueries({
            queryKey: QUERY_KEYS.all
        })
    })
}
