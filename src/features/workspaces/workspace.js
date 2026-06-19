import { supabase } from '../../lib/supabase/client.js'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryClient } from '../../queryClient.js'

import { create as zustandCreate } from 'zustand'
import { persist } from 'zustand/middleware'

import { useOptimisticMutation } from '../utils/optimistic.js'



export const QUERY_KEYS = {
    all: ['workspaces'],
    list: () => [...QUERY_KEYS.all, 'list'],
    scoped: (id) => [...QUERY_KEYS.all, 'scoped', id],
    notes: (id) => [...QUERY_KEYS.scoped(id), 'notes'],
}

const useWorkspaceStore = zustandCreate((set) =>({
    currentWorkspaceId: null,
    currentWorkspaceName: null,
    setCurrentWorkspaceId: (wsid) => {
        set({ currentWorkspaceId: wsid })
    },
    setCurrentWorkspaceName: (name) => {
        set({ currentWorkspaceName: name })
    },

    setCurrentWorkspace: (wsid, name) => {
        set({ currentWorkspaceName: name, currentWorkspaceId: wsid })
    }
}))


export function useCurrentWorkspaceId() {
    return useWorkspaceStore(state => state.currentWorkspaceId)
}

export function getCurrentWorkspaceId() {
    return useWorkspaceStore.getState().currentWorkspaceId
}

export function getCurrentWorkspaceName() {
    return useWorkspaceStore.getState().currentWorkspaceName
}


export function useCurrentWorkspaceName() {
    return useWorkspaceStore(state => state.currentWorkspaceName)
}

export function useSetCurrentWorkspaceId() {
    return useWorkspaceStore(state => state.setCurrentWorkspaceId)
}

export function useSetCurrentWorkspaceName() {
    return useWorkspaceStore(state => state.setCurrentWorkspaceName)
}

export function useSetCurrentWorkspace() {
    return useWorkspaceStore(state => state.setCurrentWorkspace)
}


export async function getAllWorkspaces() {
    const { data, error } = await supabase.from('workspaces').select()
    if (error != null)
        throw error

    return data
}


export function useWorkspaceList() {
    return useQuery({
        queryKey: QUERY_KEYS.list(),
        queryFn: getAllWorkspaces
    })
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


export function useInitializeWorkspace() {
    const currentWorkspaceId = useCurrentWorkspaceId()
    const setCurrentWorkspaceId = useSetCurrentWorkspaceId()
    const setCurrentWorkspace = useSetCurrentWorkspace()

    const { isError, isSuccess, isPending, data } = useWorkspaceList()

    useEffect(() => {
        if (!isSuccess || !data) return
        const isValid = currentWorkspaceId && data.some((w) => w.id === currentWorkspaceId)
        if (!isValid){
            setCurrentWorkspace(data[0]?.id ?? null, data[0]?.name ?? null)
        }
    }, [isSuccess, data, currentWorkspaceId, setCurrentWorkspaceId])
}
