import { useParams, useSearchParams, Link } from 'react-router'
import { useState, useEffect } from 'react'

import { SearchForm } from '../components/Search.jsx'

import {useCreateFolder, useGetFolder, useDeleteFolder, useGetFolders, invalidateFolderData,
     PAGE_SIZE as FOLDERS_PAGE_SIZE } from '../features/folders/folders.js'
import { useGetNotes } from '../features/notes/note.js'

import { useCurrentWorkspace } from '../features/workspaces/workspace.js'
import { NotesList } from './Notes.jsx'
import { QUERY_KEYS as notesQueryKeys, useDeleteNote, PAGE_SIZE as NOTES_PAGE_SIZE } from '../features/notes/note.js'
import * as Routes from '../routes.jsx'

import { useFolderChannel } from '../features/channels/channel.js'
import { useAuth } from '../features/auth/auth.jsx'


function useGetSearchParam(key, def) {
    const [searchParams, _] = useSearchParams()
    return searchParams.has(key) ? searchParams.get(key) : def
}



function FolderListTable({ list, onDelete }) {
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
    const workspace_id = useCurrentWorkspace().data?.id

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
    const { isPending, isError, error, data } = useCurrentWorkspace()

    return (
        <div>
        { isPending ? <h4>Loading ...</h4>
            : isError ? <h4>Error: unable to workspace</h4>
            : data == null ? <h4>No workspace</h4>
            : <ViewFolder_Child1 workspace_id={ data.id } />}
        </div>
    )
}

function ViewFolder_Child1({ workspace_id }) {
    let folder_id = useParams().id
    if (folder_id === 'root')
        folder_id = null


    if (folder_id === undefined)
        return <p>Error: no folder id to show</p>

    return <ViewFolder_Child2 workspace_id={workspace_id} folder_id={folder_id} />
}

function ViewFolder_Child2({ workspace_id, folder_id }) {

    return (
        <div>
        <Link to={Routes.GET_CREATE_FOLDER_INSIDE(folder_id)}>Create a folder</Link>
        <Link to={Routes.GET_CREATE_NOTE_INSIDE(folder_id)}>Create a note</Link>
        <FolderPresenceList workspace_id={workspace_id} folder_id={folder_id} />
        <div>
        <NotesList workspace_id={workspace_id} folder_id={folder_id} />
        </div>

        <div>
        <FoldersList workspace_id={workspace_id} folder_id={folder_id} />
        </div>

        </div>
    )
}

function FolderPresenceList({ workspace_id, folder_id }) {
    const curuser_email = useAuth(state => state.user)?.email
    const [presenceState, setPresenceState] = useState(null)

    function handlePresence(channel, payload) {
        if (payload.event === 'sync') {
            setPresenceState(channel.presenceState())
        }
    }

    const { isPending, isSuccess, isError, error, channel } = useFolderChannel({ workspace_id, folder_id, onPresence: handlePresence })

    useEffect(() => {
        if (!isSuccess) return
        channel.track({ email: curuser_email })
    }, [isSuccess])


    const presentEmails = Object.keys(presenceState ?? {}).map(key => {
        return presenceState[key].map(elem => elem.email)
    }).flat().filter(em => em != null && em !== curuser_email)

    return (
        <div>
        {isPending && <p>Connecting to realtime ...</p> }
        { isError && <p>Error: unable to connect to realtime: {error.message}</p> }
        {isSuccess && <p style={{ color: 'green' }}>Connected !</p>}
        <ul>
        { presentEmails.map(em => {
            return <li key={em}>{em}</li>
        })
        }
        </ul>
        </div>
    )
}

export function FoldersList({ workspace_id, folder_id }) {

    const [searchParams, setSearchParams] = useSearchParams()

    const folders_search = searchParams.has('folders_q') ? searchParams.get('folders_q') : ''
    const folders_page = searchParams.has('folders_page') ? parseInt(searchParams.get('folders_page'), 10) : 1;
    const folders_page_no = Number.isNaN(folders_page) ? 1 : folders_page;

    const { isPending: foldersIsPending, isError: foldersIsError,
        isSuccess: foldersIsSuccess, data: folders, error: foldersError } = useGetFolders(workspace_id, folder_id, folders_search, folders_page_no)

    const { isSuccess: chIsSuccess, channel } = useFolderChannel({ workspace_id, folder_id })

    const [notice, setNotice] = useState('')

    const deleteFolder = useDeleteFolder()

    function handleDeleteFolder(folder) {
        deleteFolder.mutate(folder)
    }

    useEffect(() => {
        if (!deleteFolder.isError && !deleteFolder.isSuccess) return
        if (deleteFolder.isSuccess) {
            channel?.send({
                type: 'broadcast',
                event: 'delete_or_create',
                payload: { msg: `'Hi there, deleted folder': ${deleteFolder.variables?.name}` }
            })
        }

        const timer = setTimeout(() => deleteFolder.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteFolder.isSuccess, deleteFolder.isError])

    useEffect(() => {
        if (notice === '') return
        const timer = setTimeout(() => setNotice(''), 2500)
        return () => clearTimeout(timer)
    }, [notice])

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

    const filteredFolders = folders
    return (

        <>
        { deleteFolder.isPending && <h4>Deleting folder ...</h4> }
        { deleteFolder.isError && <h4>Unable to delete folder. Errored!</h4> }
        { deleteFolder.isSuccess && <h4 style={{ color: 'green' }}>Folder successfully deleted!</h4> }
        <h2>Folders list</h2>
        { notice !== '' && <p style={{ color: 'blue' }}>{notice}</p> }
        {foldersIsPending && <h4>Loading folders ...</h4>}
        {foldersIsError && <h4>Error: unable to load folders</h4>}
        {foldersIsSuccess &&
                <>
                <SearchForm paramKey="folders_q" label_text="Search folders by name: " />
                {(filteredFolders.length === 0 ? <p>No folders</p> :
            <FolderListTable onDelete={handleDeleteFolder} list={filteredFolders} />
        )}
            <button onClick={() => decFoldersPageNo()} disabled={!canFoldersGoPrevious()}>Go Previous</button>
            <button onClick={() => incFoldersPageNo()} disabled={!canFoldersGoForward()}>Go Forward</button>
            </>
        }
        </>
    )
}
