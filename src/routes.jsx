

export const WORKSPACES = "/workspaces"
export const WORKSPACES_CREATE = "/workspaces/create"

export const NOTES_CREATE = "/notes/create"
export const EDIT_NOTE = "/notes/edit/:id"

export const GET_EDIT_NOTE = (note_id) => {
    return `/notes/edit/${note_id}`
}

export const NOTE = '/notes/:id'
export const GET_NOTE = (note_id) => `/notes/${note_id}`

export const FOLDERS_CREATE = '/folders/create'
export const FOLDER = '/folder/:id'
export const GET_FOLDER = (id) => `/folder/${id}`
export const GET_CREATE_FOLDER_INSIDE = (id) => `${FOLDERS_CREATE}?parent_id=${id}`
export const GET_CREATE_NOTE_INSIDE = (id) => `${NOTES_CREATE}?folder_id=${id}`

export const ROOT = '/folder/root'
