import { normalize_key, keyMatches } from './command_palette.js'

describe('normalize_key', () => {
    it('lowercases modifiers and keeps the trailing single-char key as-is', () => {
        expect(normalize_key(['Ctrl', 'l'])).toEqual(['ctrl', 'l'])
        expect(normalize_key(['Ctrl', 'Alt', 'k'])).toEqual(['ctrl', 'alt', 'k'])
        expect(normalize_key(['Shift', 'Meta', '1'])).toEqual(['shift', 'meta', '1'])
    })

    it('accepts a single-character key with no modifiers', () => {
        expect(normalize_key(['a'])).toEqual(['a'])
        expect(normalize_key(['Z'])).toEqual(['Z'])
        expect(normalize_key(['7'])).toEqual(['7'])
    })

    it('preserves the case of the trailing letter', () => {
        expect(normalize_key(['Shift', 'A'])).toEqual(['shift', 'A'])
    })

    it('throws on an empty combination', () => {
        expect(() => normalize_key([])).toThrow(/empty/i)
    })

    it('throws when no single-char key is present', () => {
        expect(() => normalize_key(['Ctrl'])).toThrow()
        expect(() => normalize_key(['Ctrl', 'Alt'])).toThrow()
    })

    it('throws when the single-char key is not last', () => {
        expect(() => normalize_key(['l', 'Ctrl'])).toThrow()
        expect(() => normalize_key(['a', 'b'])).toThrow()
    })

    it('throws on tokens containing invalid characters', () => {
        expect(() => normalize_key(['@'])).toThrow()
        expect(() => normalize_key(['Ctrl', '!'])).toThrow()
        expect(() => normalize_key(['Ctrl-Alt', 'l'])).toThrow()
    })

    it('throws on unknown multi-character tokens', () => {
        expect(() => normalize_key(['Foo', 'l'])).toThrow()
        expect(() => normalize_key(['ctrl', 'l'])).toThrow() // modifier list is case-sensitive
        expect(() => normalize_key(['ab'])).toThrow()
    })
})

describe('keyMatches', () => {
    const ev = (overrides = {}) => ({
        key: 'l',
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        ...overrides,
    })

    it('matches a single key without modifiers', () => {
        expect(keyMatches(ev({ key: 'a' }), ['a'])).toBe(true)
    })

    it('fails when the trailing key differs', () => {
        expect(keyMatches(ev({ key: 'a' }), ['b'])).toBe(false)
    })

    it('requires ctrlKey for ctrl combos', () => {
        expect(keyMatches(ev({ key: 'l', ctrlKey: true }),  ['ctrl', 'l'])).toBe(true)
        expect(keyMatches(ev({ key: 'l', ctrlKey: false }), ['ctrl', 'l'])).toBe(false)
    })

    it('requires altKey for alt combos', () => {
        expect(keyMatches(ev({ key: 'w', altKey: true }),  ['alt', 'w'])).toBe(true)
        expect(keyMatches(ev({ key: 'w', altKey: false }), ['alt', 'w'])).toBe(false)
    })

    it('requires shiftKey for shift combos', () => {
        expect(keyMatches(ev({ key: 'A', shiftKey: true }),  ['shift', 'A'])).toBe(true)
        expect(keyMatches(ev({ key: 'A', shiftKey: false }), ['shift', 'A'])).toBe(false)
    })

    it('requires metaKey for meta combos', () => {
        expect(keyMatches(ev({ key: 'k', metaKey: true }),  ['meta', 'k'])).toBe(true)
        expect(keyMatches(ev({ key: 'k', metaKey: false }), ['meta', 'k'])).toBe(false)
    })

    it('requires every listed modifier to be pressed', () => {
        expect(keyMatches(ev({ key: 'l', ctrlKey: true,  altKey: true  }), ['ctrl', 'alt', 'l'])).toBe(true)
        expect(keyMatches(ev({ key: 'l', ctrlKey: true,  altKey: false }), ['ctrl', 'alt', 'l'])).toBe(false)
        expect(keyMatches(ev({ key: 'l', ctrlKey: false, altKey: true  }), ['ctrl', 'alt', 'l'])).toBe(false)
    })

    it('does NOT require absent modifiers to be unpressed (documents current behaviour)', () => {
        // A bare 'l' command matches even with ctrl held — the matcher only enforces
        // modifiers that appear in the command key. Documented here to catch any
        // future change.
        expect(keyMatches(ev({ key: 'l', ctrlKey: true }), ['l'])).toBe(true)
    })
})
