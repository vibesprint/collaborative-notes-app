import { supabase } from './client.js'
import { create } from 'zustand'


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

export async function signUpWithEmail(email, password, args) {
    const { options } = args
    const result = await supabase.auth.signUp({
        email,
        password,
        options
    })

    return result
}
