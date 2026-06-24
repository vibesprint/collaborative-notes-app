import { useParams, useSearchParams, Link } from 'react-router'
import { useState, useEffect } from 'react'

import { SearchForm } from '../components/Search.jsx'

import { useListRootFolders, useCreateFolder, useListFoldersInFolder,
    useListNotesInFolder, useGetFolder, useDeleteFolder,
     PAGE_SIZE as FOLDERS_PAGE_SIZE } from '../features/folders/folders.js'

import { useCurrentWorkspaceId } from '../features/workspaces/workspace.js'
import { NotesListTable } from './Notes.jsx'
import { QUERY_KEYS as notesQueryKeys, useDeleteNote, PAGE_SIZE as NOTES_PAGE_SIZE } from '../features/notes/note.js'
import * as Routes from '../routes.jsx'

export function RootFolders() {
    const workspace_id = useCurrentWorkspaceId()
    return (
        <div className="container">
        <Link to={Routes.FOLDERS_CREATE}>Create a folder</Link>
          <SearchForm />
        <h1>Folders</h1>
        {workspace_id != null ? <RootFoldersList workspace_id={workspace_id} />
            : <h2>Loading workspace ...</h2>
        }
        </div>
    )

}

function useGetSearchParam(key, def) {
    const [searchParams, _] = useSearchParams()
    return searchParams.has(key) ? searchParams.get(key) : def
}


function RootFoldersList({ workspace_id }) {
    const { isPending, isSuccess, isError, data, error } = useListRootFolders(workspace_id, useGetSearchParam('q', ''), useGetSearchParam('page', 1))
    const [searchParams, _] = useSearchParams()
    const search = searchParams.has('q') ? searchParams.get('q') : '';

    const deleteFolder = useDeleteFolder()

    function handleDeleteFolder(folder) {
        deleteFolder.mutate(folder)
    }

    useEffect(() => {
        if (!deleteFolder.isError && !deleteFolder.isSuccess) return
        const timer = setTimeout(() => deleteFolder.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteFolder.isSuccess, deleteFolder.isError])



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
            folderList = <FolderList onDelete={handleDeleteFolder} list={filtered} />
    }

    return (
        <>
        { deleteFolder.isPending && <h4>Deleting folder ...</h4> }
        { deleteFolder.isError && <h4>Unable to delete folder. Errored!</h4> }
        { deleteFolder.isSuccess && <h4 style={{ color: 'green' }}>Folder successfully deleted!</h4> }
        { folderList }
        </>
    )
}

function FolderList({ list, onDelete }) {
    const filtered = list;
    const handleDelete = onDelete


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
                      <button onClick={() => handleDelete(folder)}>Delete</button>
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
    const [searchParams, setSearchParams] = useSearchParams()
    const notes_search = searchParams.has('notes_q') ? searchParams.get('notes_q') : ''
    const folders_search = searchParams.has('folders_q') ? searchParams.get('folders_q') : ''

    const notes_page = searchParams.has('notes_page') ? parseInt(searchParams.get('notes_page'), 10) : 1;
    const notes_page_no = Number.isNaN(notes_page) ? 1 : notes_page;

    const folders_page = searchParams.has('folders_page') ? parseInt(searchParams.get('folders_page'), 10) : 1;
    const folders_page_no = Number.isNaN(folders_page) ? 1 : folders_page;

    const { isPending: notesIsPending, isError: notesIsError,
        isSuccess: notesIsSuccess, data: notes, error: notesError } = useListNotesInFolder(folder, notes_search, notes_page_no)

    const { isPending: foldersIsPending, isError: foldersIsError,
        isSuccess: foldersIsSuccess, data: folders, error: foldersError } = useListFoldersInFolder(folder, folders_search, folders_page_no)

    const deleteNote = useDeleteNote(notesQueryKeys.list_in_folder_search(folder.id, notes_search, notes_page_no))

    function handleDeleteNote(note_id) {
        deleteNote.mutate(note_id)
    }

    useEffect(() => {
        if (!deleteNote.isError && !deleteNote.isSuccess) return
        const timer = setTimeout(() => deleteNote.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteNote.isSuccess, deleteNote.isError])

    const deleteFolder = useDeleteFolder()

    function handleDeleteFolder(folder) {
        deleteFolder.mutate(folder)
    }

    useEffect(() => {
        if (!deleteFolder.isError && !deleteFolder.isSuccess) return
        const timer = setTimeout(() => deleteFolder.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteFolder.isSuccess, deleteFolder.isError])


    function canNotesGoForward() {
        return notes.length >= NOTES_PAGE_SIZE
    }

    function canNotesGoPrevious() {
        return notes_page_no > 1;
    }

    function incNotesPageNo() {
        setSearchParams({
            ...searchParams,
            notes_page: notes_page_no + 1
        })
    }

    function decNotesPageNo() {
        if (notes_page_no <= 1) return
        setSearchParams({
            ...searchParams,
            notes_page: notes_page_no - 1
        })
    }

    function canFoldersGoForward() {
        return folders.length >= FOLDERS_PAGE_SIZE
    }

    function canFoldersGoPrevious() {
        return folders_page_no > 1;
    }

    function incFoldersPageNo() {
        setSearchParams({
            ...searchParams,
            folders_page: folders_page_no + 1
        })
    }

    function decNotesPageNo() {
        if (folders_page_no <= 1) return
        setSearchParams({
            ...searchParams,
            folders_page: folders_page_no - 1
        })
    }

    const filteredFolders = folders
    const filteredNotes = notes;

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
        {notesIsError && <h4>Error: unable to load notes: {notesError.message}</h4>}
        {notesIsSuccess &&
                <>
                <h2>Notes list</h2>
                <SearchForm paramKey="notes_q" label_text="Search Notes: " />
                <NotesListTable onDelete={handleDeleteNote} notes={filteredNotes} />
                <button onClick={() => decNotesPageNo()} disabled={!canNotesGoPrevious()}>Go Previous</button>
                <button onClick={() => incNotesPageNo()} disabled={!canNotesGoForward()}>Go Forward</button>
                </>
        }
        </div>

        <div>
        { deleteFolder.isPending && <h4>Deleting folder ...</h4> }
        { deleteFolder.isError && <h4>Unable to delete folder. Errored!</h4> }
        { deleteFolder.isSuccess && <h4 style={{ color: 'green' }}>Folder successfully deleted!</h4> }
        <h2>Folders list</h2>
        {foldersIsPending && <h4>Loading folders ...</h4>}
        {foldersIsError && <h4>Error: unable to load folders</h4>}
        {foldersIsSuccess &&
                <>
                <SearchForm paramKey="folders_q" label_text="Search folders by name: " />
                {(filteredFolders.length === 0 ? <p>No folders</p> :
            <FolderList onDelete={handleDeleteFolder} list={filteredFolders} />
        )}
            <button onClick={() => decFoldersPageNo()} disabled={!canFoldersGoPrevious()}>Go Previous</button>
            <button onClick={() => incFoldersPageNo()} disabled={!canFoldersGoForward()}>Go Forward</button>
            </>
        }
        </div>

        </div>
    )
}
