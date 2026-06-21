import { useParams } from 'react-router'

export function Folders() {
    return (
        <h1>This is folders list</h1>
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
