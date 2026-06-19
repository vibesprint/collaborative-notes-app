import styles from './styles/Notes.module.css'
import * as routes from '../routes.jsx'
import { supabase } from '../lib/supabase/client.js'
import { useState, useEffect, useRef } from 'react'

import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'

import { useCreateNote, useDeleteNote, useGetNotes, useNote, useUpdateNote } from '../features/notes/note.js'
import { useWorkspaceMember } from '../features/workspaces/workspace.js'

export function Notes() {
    return (
        <div className={styles.main} >
          <div className="container" >
            <NotesHeader />
            <NotesList />
          </div>
        </div>
    )
}


function NotesHeader() {
    return (
        <div className={styles.header} >
          <Link to={routes.NOTES_CREATE}>Create a note</Link>
        </div>
    )
}

function NotesList() {
    const navigate = useNavigate()

    let notesList = []
    const { isPending, isError, isSuccess, isLoading, data, error } = useGetNotes()

    const deleteNote = useDeleteNote()

    function handleDelete(note_id) {
        deleteNote.mutate(note_id)
    }

    function handleEdit(note_id) {
        navigate(routes.GET_EDIT_NOTE(note_id))
    }

    useEffect(() => {
        if (!deleteNote.isError && !deleteNote.isSuccess) return
        const timer = setTimeout(() => deleteNote.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteNote.isSuccess, deleteNote.isError])

    if (isLoading)
        return <h1>Loading notes</h1>

    if (isError)
        return <h1>Error while loading notes: {error.message}, consider retrying</h1>

    if(!isSuccess)
        return <h1>Unknown error has occured, consider refreshing the page</h1>

    if(isSuccess)
        notesList = data

    return (
        <div >
        { deleteNote.isPending && <h4>Deleting note ...</h4> }
        { deleteNote.isError && <h4>Unable to delete note. Errored!</h4> }
        { deleteNote.isSuccess && <h4 style={{ color: 'green' }}>Note successfully deleted!</h4> }
          <h1>Notes</h1>
        { notesList.length > 0 ? <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Actions</th>
             </tr>
            </thead>

          <tbody>
        { notesList.map((elem) => {
            return (
                <tr key={elem.id}>
                  <td>
                    <a href={routes.GET_NOTE(elem.id)}>{elem.title.slice(null, 30) + (elem.title.length <= 30 ? '': ' ...')}</a>
                  </td>

                  <td>
                   <button onClick={() => handleDelete(elem.id)}>Delete Note</button>
                   <button onClick={() => handleEdit(elem.id)}>Edit Note</button>
                  </td>
                </tr>
            )
        }) }

          </tbody>

        </table> : <p>No notes</p> }

    </div>
    )
}



import { MDXEditor, headingsPlugin, listsPlugin, quotePlugin, thematicBreakPlugin } from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'

const MDXEditorPlugins = [headingsPlugin(), listsPlugin(), quotePlugin(), thematicBreakPlugin()]

export function CreateNote() {

    const [title, setTitle] = useState('')

    const bodyRef = useRef(null)

    const createNote = useCreateNote()

    const handleSubmit = (event) => {
        event.preventDefault()
        createNote.mutate({title, body: bodyRef.current?.getMarkdown()})
    }

    useEffect(() => {
        if (!createNote.isError && !createNote.isSuccess) return;
        if (createNote.isSuccess) {
            bodyRef.current?.setMarkdown('')
            setTitle('')
        }
        const timer = setTimeout(() => createNote.reset(), 3000)
        return () => clearTimeout(timer)
    }, [createNote.isError, createNote.isSuccess])

    return (
        <div className="main">
         <div className="container">
          {createNote.isError && <p style={{ color: 'red' }}>Error: {createNote.error.message}</p>}
          {createNote.isPending && <p style={{ color: 'blue' }}>Creating note ...</p>}
          {createNote.isSuccess && <p style={{ color: 'green' }}>Note successfully created!</p>}
          <form onSubmit={handleSubmit} className="container" >
            <textarea value={title} style={{ height: '2rem' }} name="title" onChange={(event) => setTitle(event.target.value)}
                placeholder={'Title'} />
            <MDXEditor ref={bodyRef} markdown={''} plugins={MDXEditorPlugins} name="body"
                 placeholder={'Body of the note'} />
            <button type="submit">Make a note</button>
          </form>
         </div>
        </div>
    )
}


export function EditNote() {
    const note_id = useParams().id

    const { isLoading, isSuccess, isError, data: note } = useNote(note_id)

    const [title, setTitle] = useState(note?.title ?? null)
    const [body, setBody] = useState(note?.body ?? null)


    if (isLoading)
        return <h1>Loading the note ...</h1>

    if (isError)
        return <h1>Error getting note, consider retrying</h1>


    return <EditNoteForm note={ note } />

}

function EditNoteForm({ note }) {

    const [title, setTitle] = useState(note.title)
    const bodyRef = useRef(null)

    const updateNote = useUpdateNote(note.id)

    useEffect(() => {
        if (!updateNote.isError && !updateNote.isSuccess) return;
        const timer = setTimeout(() => updateNote.reset(), 3000)
        return () => clearTimeout(timer)
    }, [updateNote.isError, updateNote.isSuccess])


    function handleSubmit(event) {
        event.preventDefault()
        updateNote.mutate({ note_id: note.id, title, body: bodyRef.current?.getMarkdown() })
    }


    return (
        <div className="main">
         <div className="container">
          {updateNote.isError && <p style={{ color: 'red' }}>Error: {updateNote.error.message}</p>}
          {updateNote.isPending && <p style={{ color: 'blue' }}>Updating note ...</p>}
          {updateNote.isSuccess && <p style={{ color: 'green' }}>Note successfully updated!</p>}
          <form onSubmit={handleSubmit} className="container" >
            <textarea value={title} style={{ height: '2rem' }} name="title" onChange={(event) => setTitle(event.target.value)}
                placeholder={'Title'} />
            <MDXEditor ref={bodyRef} markdown={note.body} plugins={MDXEditorPlugins} name="body"
                 placeholder={'Body of the note'} />
            <button type="submit">Update note</button>
          </form>
         </div>
        </div>
    )
}


export function Note() {
    const note_id = useParams().id

    const { isLoading, isError, isSuccess, data: note } = useNote(note_id)

    if (isLoading)
        return <h1>Loading note details ...</h1>

    if (isError)
        return <h1>Error occured while loading note, consider retrying </h1>

    return (
        <div>
          <h1>Note details</h1>
          <div>
            <h2>{note.title}</h2>
            <br/>
            <p>{note.body}</p>
            <br/>
        <p>Created by: {<MemberEmail note={note} />}</p>
            <p>Created at: {note.created_at}</p>
           </div>

         </div>
    )
}

function MemberEmail({ note }) {
    const { isLoading, isError, data } = useWorkspaceMember(note.user_id)

    if (isLoading)
        return 'Loading ...'

    if (isError)
        return 'errored'

    return data.email
}
