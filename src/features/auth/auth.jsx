import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { loginWithEmail, logout as supabaseLogout, supabase, signUpWithEmail } from '../../lib/supabase/auth.js'

export const useAuth = create((set) => ({
    session: null,
    loading: true,
    user: null,
    login: async (username, password) => {
        const { data, error } = await loginWithEmail(username, password)

        return error ? [false, error.message] : [true, null]
    },

    logout: async () => {
        const { error } = await supabaseLogout()
        return error ? [false, error.message] : [true, null]
    },
    signUp: async (email, password) => {
        const { error } = await signUpWithEmail(email, password)
        return (error != null) ? [false, error.message] : [true, null]
    }
}))

supabase.auth.getSession().then(({data: { session }}) => {
    useAuth.setState({ session, user: session?.user ?? null, loading: false })
})

supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({ session, user: session?.user ?? null, loading: false })
})
