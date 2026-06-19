import { create } from 'zustand'

import { loginWithEmail, logout as supabaseLogout, signUpWithEmail } from '../../lib/supabase/auth.js'
import { supabase } from '../../lib/supabase/client.js'

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
    signUp: async (email, password, options) => {
        const { error } = await signUpWithEmail(email, password, options)
        return (error != null) ? [false, error.message] : [true, null]
    }
}))


supabase.auth.onAuthStateChange((_event, session) => {
    useAuth.setState({
        session: session,
        loading: false,
        user: session?.user ?? null
    })
})
