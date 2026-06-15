import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuth = create(persist((set) => ({
    loggedIn: false,
    login: (username, password) => {
        if (username === "admin" && password === "admin")
        {
            set({ loggedIn: true })
            return [true, null]
        }
        set({ loggedIn: false })
        return [false, 'invalid username or password']
    },

    logout: () => {
        set({ loggedIn: false })
        return [true, null]
    }
}), { name: 'login-state' }))
