import { useMutation } from '@tanstack/react-query'

export function useOptimisticMutation({ mutationFn, queryKey, optimisticApply }) {
    return useMutation({
        mutationFn,
        onMutate: async (arg, context) => {
            await context.client.cancelQueries({
                queryKey
            })
            const previous = context.client.getQueryData(queryKey)

            context.client.setQueryData(queryKey, (old) => optimisticApply(arg, old))

            return { old_data: previous }
        },
        onError: (err, args, onMutateResult, context) => {
            context.client.setQueryData(queryKey, onMutateResult.old_data)
        },

        onSettled: (data, err, args, onMutateResult, context) => {
            if (context.client.isMutating() == 1)
                context.client.invalidateQueries({ queryKey })
        }
    })
}
