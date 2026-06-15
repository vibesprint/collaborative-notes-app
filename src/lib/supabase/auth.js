import { createClient } from '@supabase/supabase-js'
import { create } from 'zustand'

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)

export async function loginWithEmail(username, password) {
    const { data, error }  = await supabase.auth.signInWithPassword({
        email: username,
        password: password
    })

    return { data, error }

}

export async function logout() {
    const result = await supabase.auth.signOut({ scope: 'local' })

    return result;
}

export async function signUpWithEmail(email, password) {
    const result = await supabase.auth.signUp({
        email,
        password
    })

    return result
}
