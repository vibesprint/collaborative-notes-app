

export const WORKSPACES = "/workspaces"
export const WORKSPACES_CREATE = "/workspaces/create"
export const NOTES = "/notes"
export const NOTES_CREATE = "/notes/create"
export const EDIT_NOTE = "/notes/edit/:id"

export const GET_EDIT_NOTE = (note_id) => {
    return `/notes/edit/${note_id}`
}

export const NOTE = '/notes/:id'
export const GET_NOTE = (note_id) => `/notes/${note_id}`
