
/* Shape of a command palette :-
 * palette = [
 *  {
 *   key: some representation of key combination,
 *   action: action to execute
 *  }
 * ]
 */

import { useEffect, useRef } from 'react'
import { create } from 'zustand'

const useCommandPaletteStore = create((set) => ({
    active_palette: new Map(),
    global_palette: null,
    registerPalette: (id, palette) => {
        const active = useCommandPaletteStore.getState().active_palette
        active.set(id, palette)
    },
    unregisterPalette: (id) => {
        const active = useCommandPaletteStore.getState().active_palette
        active.delete(id)
    },
    updatePalette: (id, palette) => {
        const active = useCommandPaletteStore.getState().active_palette
        active.set(id, palette)
    },
    setGlobalPalette: global_palette => set({ global_palette })
}))

export function useInitCommandPalette() {

    useEffect(() => {
        window.addEventListener('keydown', eventHandler)
        return () => window.removeEventListener('keydown', eventHandler)
    }, [])
}

export function useGlobalCommandPalette(palette) {
    const setGlobalPalette = useCommandPaletteStore.getState().setGlobalPalette
    useEffect(() => {
        const new_palette = normalize_palette(palette)
        setGlobalPalette(new_palette)
        return () => setGlobalPalette(null)
    }, [palette])
}

function eventHandler(event) {
    if (event.defaultPrevented) return
    if (isEditable(event.target)) return

    const active_palette = useCommandPaletteStore.getState().active_palette
    const global_palette = useCommandPaletteStore.getState().global_palette

    let found = false
    if (active_palette != null) {
        for (let [id, command_arr] of active_palette) {
            for (let command of command_arr) {
                if (keyMatches(event, command.key)) {
                    event.preventDefault()
                    found = true
                    command.action()
                }
            }

        }
    }

    if (found) return

    if (global_palette != null) {
        for (let command of global_palette)
            if (keyMatches(event, command.key)) {
                command.action()
                event.preventDefault()
            }
    }
}

function normalize_palette(palette) {
    return palette.map(cmd => ({
        key: normalize_key(cmd.key),
        action: cmd.action
    }))
}

function normalize_key(key_comb) {
     if (key_comb.length < 1) throw new Error('empty key combination is invalid')
    const pattern = /^[a-zA-Z0-9]+$/i
    const modifiers = ['Shift', 'Ctrl', 'Meta', 'Alt']
    const new_key = key_comb.map(single_key => {
        if (!pattern.test(single_key)) throw new Error(`invalid key ${single_key} in combination: ${key_comb}`)
        if (single_key.length === 1) return single_key
        if (modifiers.includes(single_key))
            return single_key.toLowerCase()
        throw new Error(`invalid key ${single_key} in combination: ${key_comb}`)
    })

    if (new_key.findIndex((elem) => elem.length === 1) != (new_key.length - 1))
        throw new Error(`there should only single letter key and it should be at the last: ${new_key}`)

    return new_key
}

function isEditable(element) {
    if (!(element instanceof HTMLElement)) return false
    return (element.isContentEditable ||
    element.tagName === 'INPUT' ||
    element.tagName === 'SELECT' ||
    element.tagName === 'TEXTAREA')
}

export function useCommandPalette(palette) {
    const id = useRef(Symbol())

    useEffect(() => {
        const new_palette = normalize_palette(palette)
        registerPalette(id.current, new_palette)
        return () => unregisterPalette(id.current)
    }, [])

    useEffect(() => {
        const new_palette = normalize_palette(palette)
        updatePalette(id.current, new_palette)
    }, [palette])
}

function keyMatches(event, command_key) {
    const event_key = event.key
    let matches = event_key === command_key.at(-1)

    if (command_key.includes('ctrl'))
        matches = matches && event.ctrlKey
    if (command_key.includes('alt'))
        matches = matches && event.altKey
    if (command_key.includes('shift'))
        matches = matches && event.shiftKey
    if (command_key.includes('meta'))
        matches = matches && event.metaKey

    return matches
}

function registerPalette(id, palette) {
    useCommandPaletteStore.getState().registerPalette(id, palette)
}

function unregisterPalette(id) {
    useCommandPaletteStore.getState().unregisterPalette(id)
}

function updatePalette(id, palette) {
    useCommandPaletteStore.getState().updatePalette(id, palette)
}
