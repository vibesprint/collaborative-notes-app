import styles from './styles/Workspaces.module.css'
import * as routes from '../routes.jsx'
import { useWorkspaceList, useCreateWorkspace, useWorkspaceMember,
    useDeleteWorkspace, useSetSelectedId, useAddWorkspaceMember } from '../features/workspaces/workspace.js'

import { Link, useSearchParams, useNavigate } from 'react-router'

import { useState, useEffect } from 'react'

export function Workspaces() {
    return (
        <div className={styles.main} >
          <div className="container" >
            <WorkspaceHeader />
            <WorkspaceList />
          </div>
        </div>
    )
}


function WorkspaceHeader() {
    return (
        <div className={styles.header} >
          <Link to={routes.WORKSPACES_CREATE}>Create a workspace</Link>
        </div>
    )
}

function WorkspaceList() {
    let workspaceList = []

    const { isPending, isFetching, isSuccess, data, error, isError } = useWorkspaceList()
    const setSelectedId = useSetSelectedId()

    const deleteWorkspace = useDeleteWorkspace()

    const [deleteInProgress, setDeleteInProgress] = useState(false)
    const [deleteInProgressId, setDeleteInProgressId] = useState(null)

    const navigate = useNavigate()

    useEffect(() => {
        const [err, succ] = [deleteWorkspace.isError, deleteWorkspace.isSuccess]
        if (!err && !succ) return
        const timer = setTimeout(() => deleteWorkspace.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteWorkspace.isError, deleteWorkspace.isSuccess])

    if (isSuccess)
        workspaceList = data;


    if (isPending && isFetching)
        return <h1>Fetching workspaces</h1>

    if (isError)
        return (
            <h1>Error occured while fetching workspaces: {error.message}, consider retrying</h1>
        )

    function handleDelete(workspace_id) {
        setDeleteInProgress(true)
        setDeleteInProgressId(workspace_id)
    }

    function handleDeleteYes(workspace_id) {
        deleteWorkspace.mutate(workspace_id)
        setDeleteInProgress(false)
        setDeleteInProgressId(null)
    }

    function handleDeleteNo(workspace_id) {
        setDeleteInProgress(false)
        setDeleteInProgressId(null)
    }

    function handleSetCurrent(workspace_id) {
        setSelectedId(workspace_id)
    }

    function handleAddMember(workspace_id) {
        navigate(routes.GET_ADD_MEMBER(workspace_id))
    }

    return (
        <div >
        { deleteInProgress && <DeleteModal onYes={handleDeleteYes} onNo={handleDeleteNo} workspace_id={ deleteInProgressId } /> }
        { deleteWorkspace.isPending && <p style={{ color: 'red' }}>Deleting workspace ...</p> }
        { deleteWorkspace.isSuccess && <p style={{ color: 'orange' }}>Workspace deleted!</p> }
        { deleteWorkspace.isError && <p style={{ color: 'red' }}>Error while deleting workspace: {deleteWorkspace.error.message}</p> }

          <h1>Workspaces</h1>
        { workspaceList.length > 0 ? <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Actions</th>
             </tr>
            </thead>

          <tbody>
        { workspaceList.map((elem) => {
            return (
                <tr key={elem.id}>
                  <td>
                    {elem.name}
                  </td>
                  <td>
                <WorkspaceOwner user_id={elem.created_by} />
                  </td>
                  <td>
                   <button onClick={() => handleDelete(elem.id)}>Delete</button>
                   <button onClick={() => handleSetCurrent(elem.id)}>Set Current</button>
                   <button onClick={() => handleAddMember(elem.id)}>Add a member</button>
                  </td>
                </tr>
            )
        }) }

          </tbody>

        </table> : <p>No workspaces</p> }

    </div>
    )
}

function WorkspaceOwner({ user_id }) {
    const { isPending, isError, error, data } = useWorkspaceMember(user_id)

    if (isPending)
        return 'loading ...'

    if (isError)
        return `error: ${error.message}`

    return data.email
}


function DeleteModal({ onYes, onNo, workspace_id }) {
    return (
        <div className={styles.deleteModal} >
          <div className="container" >
            <p>Are you sure you want to delete ? This would all the notes in this workspace</p>
            <div >
              <button onClick={() => onYes(workspace_id)} >Yes</button>
              <button onClick={() => onNo(workspace_id)} >No</button>
            </div>
          </div>
        </div>
    )
}



export function CreateWorkspace() {
    const [workspaceName, setWorkspaceName] = useState('')

    const createWorkspace = useCreateWorkspace()

    const handleSubmit = (event) => {
        event.preventDefault()
        createWorkspace.mutate(workspaceName)
    }

    useEffect(() => {
        const [ err, succ ] = [ createWorkspace.isError, createWorkspace.isSuccess ]
        if (!err && !succ) return
        const timer = setTimeout(() => createWorkspace.reset(), 3000)
        return () => clearTimeout(timer)
    }, [createWorkspace.isError, createWorkspace.isSuccess])


    return (
        <div className="main">
         <div className="container">
          {createWorkspace.isError && <p style={{ color: 'red' }}>Error: {createWorkspace.error.message}</p>}
          {createWorkspace.isSuccess && <p style={{ color: 'green' }}>Successfully created workspace!</p>}
          {createWorkspace.isPending && <p style={{ color: 'blue' }}>Creating workspace ...</p>}
          <form onSubmit={handleSubmit} className="container" >
           <label >
            Workspace name:
            <input type="text" value={workspaceName} name="note" onChange={(event) => setWorkspaceName(event.target.value)} placeholder="Workspace name" />
          </label>
            <button type="submit">Make a workspace</button>
          </form>
         </div>
        </div>
    )
}


export function AddWorkspaceMember() {
    const [email, setEmail] = useState('')
    const [searchParams, _] = useSearchParams()
    const [notice, setNotice] = useState('')

    const workspace_id = searchParams.has('wspc_id') ? searchParams.get('wspc_id') : null;

    const add_member = useAddWorkspaceMember()

    function handleSubmit(event) {
        event.preventDefault()
        if (workspace_id == null) {
            setNotice('No workspace set. Visit this page using a valid url')
            return
        }

        add_member.mutate({ workspace_id, email })
    }

    useEffect(() => {
        if (!add_member.isSuccess && !add_member.isError) return
        const timer = setTimeout(() => add_member.reset(), 2500)
        return () => clearTimeout(timer)
    }, [add_member.isError, add_member.isSuccess])

    useEffect(() => {
        if (notice === '') return
        const timer = setTimeout(() => setNotice(''), 2500)
        return () => clearTimeout(timer)
    }, [notice])

    return (
        <div>
          { add_member.isPending && <p>Adding member ...</p> }
          { add_member.isError && <p>Error: unable to add member!</p> }
          { add_member.isSuccess && <p style={{ color: 'green' }}>Successfully added member</p> }
          { notice !== '' && <h4>{notice}</h4> }
          <form onSubmit={handleSubmit} >
            <label htmlFor="email" >Email of the invitee: </label>
            <input type="email" id="email" value={email} onChange={(event) => setEmail(event.target.value)} name="email" />

            <button type="submit">Add member</button>
          </form>
        </div>
    )
}
