import { useParams, useSearchParams, Link } from 'react-router'
import { useState, useEffect } from 'react'

import { SearchForm } from '../components/Search.jsx'
import { useListRootFolders, useCreateFolder, useListFoldersInFolder, useListNotesInFolder, useGetFolder } from '../features/folders/folders.js'
import { useCurrentWorkspaceId } from '../features/workspaces/workspace.js'
import { NotesListTable } from './Notes.jsx'
import { QUERY_KEYS as notesQueryKeys, useDeleteNote } from '../features/notes/note.js'
import * as Routes from '../routes.jsx'

export function RootFolders() {
    const workspace_id = useCurrentWorkspaceId()
    return (
        <div className="container">
        <Link to={Routes.FOLDERS_CREATE}>Create a folder</Link>
          <SearchForm />
        <h1>Folders</h1>
        {workspace_id != null ? <RootFoldersList workspace_id={workspace_id} />
            : <h2>Loading ...</h2>
        }
        </div>
    )

}

function RootFoldersList({ workspace_id }) {
    const { isPending, isSuccess, isError, data, error } = useListRootFolders(workspace_id)
    const [searchParams, setSearchParams] = useSearchParams()

    function handleDelete(event) {

    }

    let folderList;
    if (isPending)
        folderList = <h2>Loading ...</h2>
    else if (isError)
        folderList = <h4>Encountered error, consider retrying</h4>
    else {
        let filtered;
        if (searchParams.has('q'))
            filtered = data.filter(folder => folder.name.toLowerCase().includes(searchParams.get('q')))
        else
            filtered = data

        if (filtered.length === 0)
            folderList = <p>No folder</p>
        else
            folderList = <FolderList list={filtered} />
    }

    return (
          folderList
    )
}

function FolderList({ list }) {
    const filtered = list;

    function handleDelete() {
        console.log('Delete the folder')
    }

    return (
        <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
        {
            filtered.map(folder => {
                return <tr key={folder.id}>
                    <td><Link to={Routes.GET_FOLDER(folder.id)}>{folder.name}</Link></td>
                    <td>
                      <button onClick={handleDelete}>Delete</button>
                    </td>
                </tr>
            })
        }
        </tbody>

        </table>
    );
}


export function CreateFolder() {
    const [searchParams, setSearchParams] = useSearchParams()
    const [foldername, setFoldername] = useState('')
    const workspace_id = useCurrentWorkspaceId()

    const createFolder = useCreateFolder()

    let parent_folder_id = searchParams.has('parent_id') ? searchParams.get('parent_id') : null;

    function handleSubmit(event) {
        event.preventDefault()
        createFolder.mutate({ name: foldername, workspace_id, parent_id: parent_folder_id })
    }

    const pending_status = createFolder.isPending ? 'Creating folder ...'
                             : createFolder.isError ? 'Error: unable to create folder'
                             : createFolder.isSuccess ? 'Folder successfully created'
                             : '';

    useEffect(() => {
        if (!createFolder.isError && !createFolder.isSuccess) return
        if(createFolder.isSuccess) setFoldername('')
        const timer = setTimeout(() => createFolder.reset(), 2500)
        return () => clearTimeout(timer)
    }, [createFolder.isError, createFolder.isSuccess, createFolder])

    return (
        <div>
        {pending_status != '' && <p>{pending_status}</p>}
        <form onSubmit={handleSubmit}>
         <label htmlFor="folder-name">Name of the folder: </label>
        <input type="textbox" id="folder-name" name="name" value={foldername} onChange={(event) => setFoldername(event.target.value)} />
        <button type="submit">Create Folder</button>
        </form>
        </div>
    )
}

export function ViewFolder() {
    const workspace_id = useCurrentWorkspaceId()

    return (
        <div>
        <SearchForm />
        { workspace_id == null ? <h4>Loading ...</h4> : <ViewFolder_Child1 workspace_id={workspace_id} /> }
        </div>
    )
}

function ViewFolder_Child1({ workspace_id }) {
    const id = useParams().id
    const {isPending, isError, isSuccess, data: folder, error} = useGetFolder(workspace_id, id)


    if (id == null)
        return <p>Error: no folder id to show</p>

    if (isPending)
        return <h4>Loading folder metadata ...</h4>
    if (isError)
        return <h4>Error: unable to load folder metadata</h4>

    return <ViewFolder_Child2 folder={folder} />
}

function ViewFolder_Child2({ folder }) {
    const [searchParams, _] = useSearchParams()
    const search = searchParams.has('q') ? searchParams.get('q') : ''

    const { isPending: notesIsPending, isError: notesIsError,
        isSuccess: notesIsSuccess, data: notes, error: notesError } = useListNotesInFolder(folder)

    const { isPending: foldersIsPending, isError: foldersIsError,
        isSuccess: foldersIsSuccess, data: folders, error: foldersError } = useListFoldersInFolder(folder)

    const deleteNote = useDeleteNote(notesQueryKeys.list_in_folder(folder.id))

    function handleDeleteNote(note_id) {
        deleteNote.mutate(note_id)
    }

    useEffect(() => {
        if (!deleteNote.isError && !deleteNote.isSuccess) return
        const timer = setTimeout(() => deleteNote.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteNote.isSuccess, deleteNote.isError])

    let filteredFolders;
    if(folders != null) {
        if (search != '')
            filteredFolders = folders.filter(folder => folder.name.toLowerCase().includes(search.toLowerCase()))
        else
            filteredFolders = folders
    } else {
        filteredFolders = []
    }

    let filteredNotes;
    if(notes != null) {
        if (search != '')
            filteredNotes = notes.filter(note => note.title.toLowerCase().includes(search.toLowerCase()))
        else
            filteredNotes = notes
    } else {
        filteredNotes = []
    }

    return (
        <div>
        <Link to={Routes.GET_CREATE_FOLDER_INSIDE(folder.id)}>Create a folder</Link>
        <Link to={Routes.GET_CREATE_NOTE_INSIDE(folder.id)}>Create a note</Link>
        <div>
        { deleteNote.isPending && <h4>Deleting note ...</h4> }
        { deleteNote.isError && <h4>Unable to delete note. Errored!</h4> }
        { deleteNote.isSuccess && <h4 style={{ color: 'green' }}>Note successfully deleted!</h4> }
        {!notesIsSuccess && <h2>Notes list</h2> }
        {notesIsPending && <h4>Loading notes ...</h4>}
        {notesIsError && <h4>Error: unable to load notes</h4>}
        {notesIsSuccess && <NotesListTable onDelete={handleDeleteNote} notes={filteredNotes} title={'Notes list'} />}
        </div>

        <div>
        <h2>Folders list</h2>
        {foldersIsPending && <h4>Loading notes ...</h4>}
        {foldersIsError && <h4>Error: unable to load notes</h4>}
        {foldersIsSuccess && (filteredFolders.length === 0 ? <p>No folders</p> : <FolderList list={filteredFolders} />)}
        </div>

        </div>
    )
}
