import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryClient } from '../../queryClient.js'

import { create as zustandCreate } from 'zustand'
import { persist } from 'zustand/middleware'

import { useOptimisticMutation } from '../utils/optimistic.js'
import { useAuth } from '../auth/auth.jsx'



export const QUERY_KEYS = {
    all: ['workspaces'],
    list: () => [...QUERY_KEYS.all, 'list'],
    scoped: (id) => [...QUERY_KEYS.all, 'scoped', id],
    notes: (id) => [...QUERY_KEYS.scoped(id), 'notes'],
    member: (wsId, userId) => [...QUERY_KEYS.scoped(wsId), 'member', userId],
    membership: (wsId, userId) => [...QUERY_KEYS.scoped(wsId), 'membership', userId],
}

export const useWorkspaceStore = zustandCreate(persist((set) =>({
    selectedId: null,
    setSelectedId: (newId) => { set({ selectedId: newId }) }
}), { name: 'current_workspace' }))

export function useCurrentWorkspace() {
    const { isPending, isError, error, data } = useWorkspaceList()
    const selectedId = useWorkspaceStore(state => state.selectedId)

    let curWs = null
    if (!data?.length) curWs = null;
    else curWs = data.find(w => w.id === selectedId) ?? data[0]

    return { isPending, isError, error, data: curWs }
}

async function getCurrentWorkspaceMembership(workspace_id, user_id) {
    const { data, error } = await supabase.from('workspace_members').select().match({ workspace_id, user_id })
    if (error != null) throw error

    return data[0]
}

export function useCurrentWorkspaceMembership() {
    const { isPending: wsIsPending, isError: wsIsError, error: wsError, data: wsData } = useCurrentWorkspace()
    const user  = useAuth(state => state.user)

    return useQuery({
        queryKey: QUERY_KEYS.membership(wsData?.id, user?.id),
        queryFn: () => getCurrentWorkspaceMembership(wsData?.id, user?.id),
        enabled: (!!user) && (!!wsData)
    })

}

export function useCurrentWorkspaceSync() {
    const { isPending, isError, data } = useCurrentWorkspace()
    const selectedId = useWorkspaceStore(state => state.selectedId)
    const setSelectedId = useWorkspaceStore(state => state.setSelectedId)
    const workspaceListQuery = useWorkspaceListQuery()

    useEffect(() => {
        if (!isPending && !isError && data != null && selectedId != data.id)
            setSelectedId(data.id)
        if (!isPending && !isError && data == null)
            setSelectedId(null)

        const { data: { subscription: { unsubscribe } } } = supabase.auth.onAuthStateChange((event, session) => {

            if (event === 'SIGNED_IN')
                setTimeout(() => queryClient.prefetchQuery(workspaceListQuery), 0)
        })

        return unsubscribe

    }, [selectedId, data])
}

export function useCurrentWorkspaceId() {
    return useCurrentWorkspace()?.data?.id
}


export function useCurrentWorkspaceName() {
    return useCurrentWorkspace()?.data?.name
}

export function useSetSelectedId() {
    return useWorkspaceStore(state => state.setSelectedId)
}

export async function getAllWorkspaces() {
    const { data, error } = await supabase.from('workspaces').select()
    if (error != null)
        throw error

    return data
}


function useWorkspaceListQuery() {
    const loggedIn = useAuth(state => !!state.session)
    return {
        queryKey: QUERY_KEYS.list(),
        queryFn: getAllWorkspaces,
        enabled: loggedIn
    }
}

export function useWorkspaceList() {
    return useQuery(useWorkspaceListQuery())
}


async function deleteWorkspace(workspace_id) {
    const { error } = await supabase.rpc('delete_workspace', { wsid: workspace_id })

    if (error != null)
        throw error

    queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.list()
    })
}


export function useDeleteWorkspace() {
    return useOptimisticMutation({
        mutationFn: deleteWorkspace,
        queryKey: QUERY_KEYS.list(),
        optimisticApply: (new_workspace_id, old_list) => old_list.filter(ws => ws.id !== new_workspace_id)
    })
}


async function createWorkspace(name) {
    const { error } = await supabase.rpc('create_workspace', { name })
    if (error != null)
        throw error
}


export function useCreateWorkspace() {
    return useMutation({
        mutationFn: createWorkspace,
        onSuccess: (name, args, onMutateResult, context) => context.client.invalidateQueries({ queryKey: QUERY_KEYS.list() })
    })
}



async function getMember(cur_user_id) {
    const { data, error } = await supabase.rpc('get_workspace_member', { cur_user_id: cur_user_id })
    if (error != null)
        throw error

    return data[0]
}

export function useWorkspaceMember(user_id) {
    const wsId = useCurrentWorkspaceId()
    return useQuery({
        queryKey: QUERY_KEYS.member(wsId, user_id),
        queryFn: () => getMember(user_id)
    })
}
