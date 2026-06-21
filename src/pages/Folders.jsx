import { useParams, useSearchParams, Link } from 'react-router'
import { SearchForm } from '../components/Search.jsx'

import { useListRootFolders } from '../features/folders/folders.js'
import { useCurrentWorkspaceId } from '../features/workspaces/workspace.js'
import * as Routes from '../routes.jsx'

export function RootFolders() {
    const workspace_id = useCurrentWorkspaceId()
    return (
        <div className="container">
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
            folderList = (
                <table>
                <thead>
                  <th>
                    <td>Name</td>
                    <td>Action</td>
                  </th>
                </thead>
                <tbody>
                {
                    filtered.map(folder => {
                        return <tr key={folder.id}>
                            <td><Link to={routes.GET_FOLDER(folder.id)}>{folder.name}</Link></td>
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

    return (
          folderList
    )
}


export function CreateFolder() {
    return (
        <h1>This is to create a folder</h1>
    )
}

export function ViewFolder() {
    const id = useParams().id
    return (
        <h1>This is a Folder view with id: {id}</h1>
    )
}
