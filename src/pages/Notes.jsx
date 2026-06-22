import styles from './styles/Notes.module.css'
import * as routes from '../routes.jsx'
import { supabase } from '../lib/supabase/client.js'
import { useState, useEffect, useRef, useMemo } from 'react'

import { useQuery, useMutation } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { useCreateNote, useDeleteNote,
    useGetNotes, useNote, useUpdateNote,
    QUERY_KEYS as notesQueryKeys, PAGE_SIZE as NOTES_PAGE_SIZE } from '../features/notes/note.js'
import { useGetTagsForNotes, useAddTagToNote, useGetTagsForWorkspace, useDeleteTagFromNote } from '../features/tags/tags.js'
import { useWorkspaceMember, useCurrentWorkspaceId } from '../features/workspaces/workspace.js'


export function Notes() {
    return (
        <div className={styles.main} >
          <div className="container" >
            <NotesHeader />
            <NotesSearchForm />
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
    const [lastId, setLastId] = useState(0)
    const [searchParams, setSearchParams] = useSearchParams()
    const search = searchParams.has('q') ? searchParams.get('q') : '';

    const page = searchParams.has('page') ? parseInt(searchParams.get('page'), 10) : 1;
    const page_no = Number.isNaN(page) ? 1 : page;

    const { isPending, isError, isSuccess, isLoading, data, error } = useGetNotes(search, page_no)

    const deleteNote = useDeleteNote(notesQueryKeys.list_root_all())

    useEffect(() => {
        if (!deleteNote.isError && !deleteNote.isSuccess) return
        const timer = setTimeout(() => deleteNote.reset(), 3000)
        return () => clearTimeout(timer)
    }, [deleteNote.isSuccess, deleteNote.isError])

    function handleDelete(note_id) {
        deleteNote.mutate(note_id)
    }

    if (isLoading)
        return <h1>Loading notes</h1>

    if (isError)
        return <h1>Error while loading notes: {error.message}, consider retrying</h1>

    if(!isSuccess)
        return <h1>Unknown error has occured, consider refreshing the page</h1>

    const filteredNotes = data;
    let recentlyEdited = [...filteredNotes].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 3)

    function canGoForward() {
        return filteredNotes.length >= NOTES_PAGE_SIZE;
    }

    function canGoPrevious() {
        return page_no > 1;
    }

    function decPageNo() {
        if (page_no <= 1) return;

        setSearchParams({
            ...searchParams,
            page: page_no - 1
        })
    }

    function incPageNo() {
        setSearchParams({
            ...searchParams,
            page: page_no + 1
        })
    }

    return (
        <>
        { deleteNote.isPending && <h4>Deleting note ...</h4> }
        { deleteNote.isError && <h4>Unable to delete note. Errored!</h4> }
        { deleteNote.isSuccess && <h4 style={{ color: 'green' }}>Note successfully deleted!</h4> }
        { filteredNotes.length >= 5 && (
            <>
            <h1>Recently Edited</h1>
            <NotesListTable onDelete={handleDelete} notes={recentlyEdited} />
            </>
        )}

        <h1> Notes </h1>
        <NotesListTable notes={filteredNotes} onDelete={handleDelete} />
        <button onClick={() => decPageNo()} disabled={!canGoPrevious()}>Go Previous</button>
        <button onClick={() => incPageNo()} disabled={!canGoForward()}>Go Forward</button>
        </>
    )
}

function NotesSearchForm() {

    const [searchParams,setSearchParams] = useSearchParams()
    const [search, setSearch] = useState(searchParams.get('q') ?? '')

    function handleSearch(event) {
        event.preventDefault()

        if (search === '' || search == null)
            searchParams.delete('q')
        else
            searchParams.set('q', search)

        setSearchParams(searchParams)
    }

    return (
        <form onSubmit={handleSearch} >
         <label htmlFor="search_input" >Search: </label>
         <input type='textbox' id="search_input" name="search" onChange={(event) => setSearch(event.target.value)} value={search} />
        <button type="submit">Search</button>
        </form>
    )

}

export function NotesListTable({ notes, onDelete }) {
    const notesList = notes;
    const handleDelete = onDelete

    const { isPending: tagsIsPending, isError: tagsIsError, isSuccess: tagsIsSuccess,
        data: tagsList, error: tagsError } = useGetTagsForNotes(notes)


    const navigate = useNavigate()

    function handleEdit(note_id) {
        navigate(routes.GET_EDIT_NOTE(note_id))
    }

    function getTagsFor(note_id) {
        if (tagsIsPending)
            return <p>Loading ...</p>

        if (tagsIsError) {
            console.log('tag loading error: ', tagsError)
            return <p>Error: unable to load tags</p>
        }

        return tagsList[note_id].length === 0 ?
            <p>No tags</p> :
            tagsList[note_id].map(tag => <p key={tag.name}>{tag.name}</p>);

    }



    return (
        <div >
        { notesList.length > 0 ? <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Actions</th>
                <th>Tags</th>
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
                  <td>
                   {getTagsFor(elem.id)}
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
    const [searchParams, _] = useSearchParams()
    let folder_id = searchParams.has('folder_id') ? searchParams.get('folder_id') : null

    const [title, setTitle] = useState('')

    const bodyRef = useRef(null)

    const createNote = useCreateNote()

    const handleSubmit = (event) => {
        event.preventDefault()
        createNote.mutate({title, body: bodyRef.current?.getMarkdown(), folder_id})
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

import { debounce } from '../features/utils/debounce.js'

function EditNoteForm({ note }) {

    const [title, setTitle] = useState(note.title)
    const [body, setBody] = useState(note.body)
    const firstRender = useRef(true)

    const [dirty, setDirty] = useState(false)

    const updateNote = useUpdateNote(note.id)

    const debounceSave = useMemo(() => debounce(updateNote.mutate, 1000), [])

    function handleSubmit(event) {
        event.preventDefault()
        updateNote.reset()
        updateNote.mutate({ note_id: note.id, title, body })
    }

    function handleTitleChange(event) {
        updateNote.reset()
        setTitle(event.target.value)
        setDirty(true)
        debounceSave({ title: event.target.value, body, note_id: note.id })
    }

    function handleBodyChange(markdown) {
        updateNote.reset()
        setBody(markdown)
        setDirty(true)
        debounceSave({ title, body: markdown, note_id: note.id })
    }

    const status = updateNote.isPending ? {text: 'Saving ...', color: 'blue' }
                 : updateNote.isError ? {text: 'error, unable to save', color: 'red' }
                 : updateNote.isSuccess ? {text: 'Saved', color: 'green'}
                 : { text: dirty ? 'Unsaved' : 'Unchanged', color: 'inherit' }

    return (
        <div className="main">
         <div className="container">
          <p style={{color: status.color}}>{status.text}</p>
          <form onSubmit={handleSubmit} className="container" >
            <textarea value={title} style={{ height: '2rem' }} name="title" onChange={handleTitleChange}
                placeholder={'Title'} />
            <MDXEditor markdown={note.body} plugins={MDXEditorPlugins} name="body"
                 placeholder={'Body of the note'} onChange={handleBodyChange} />
            <button type="submit">Update note</button>
          </form>
          <NoteTagsForm note={note} />
         </div>
        </div>
    )
}


function NoteTagsForm({ note }) {
    const { isPending, isError, isSuccess, data, error } = useGetTagsForNotes([note])
    const currentWorkspaceId = useCurrentWorkspaceId()
    const [tagname, setTagname] = useState('')
    const addTag = useAddTagToNote()

    function createTagDataList(id) {
        return currentWorkspaceId == null ? (<datalist> <option value="Loading ..." /> </datalist>)
         : (
            <TagsDataList workspace_id={currentWorkspaceId} list_id={id} />
        )
    }

    function handleSubmit(event) {
        event.preventDefault()
        if (tagname === '') return;
        addTag.mutate({ note, tag_name: tagname })
    }

    const pending_status = addTag.isPending ? <p>Adding tag ...</p>
        : addTag.isError ? <p>Error: unable to add tag!</p>
        : addTag.isSuccess ? <p>Tag successfully added</p>
        : null;

    useEffect(() => {
        if (!addTag.isError && !addTag.isSuccess) return
        if (addTag.isSuccess)
            setTagname('')
        const timer = setTimeout(() => addTag.reset(), 3000)
        return () => clearTimeout(timer)
    }, [addTag.isError, addTag.isSuccess])

    return (
        <div >
          { pending_status }
          <form onSubmit={handleSubmit} >
            <label htmlFor="tag-input">Choose or type a tag:</label>
            <input list="tags-list" id="tag-input" name="tag" value={tagname} onChange={(event) => setTagname(event.target.value)} />
            { createTagDataList("tags-list") }
            <button type="submit">Add tag</button>
          </form>
        <div >
          { (data == null && isPending) ? <p>Loading ...</p>
              : (isSuccess && data[note.id].length === 0) ? <p>No tags </p>
              : isSuccess ? <TagsList tags={data[note.id]} note={note} />
              : <p>Error occured: unable to load tags</p>
          }
        </div>

    </div>
    )
}

function TagsList({ note, tags }) {
    const deleteTagFromNote = useDeleteTagFromNote()
    let deletingTags = []

    function deleteTag(tag) {
        deleteTagFromNote.mutate({ note, tag_id: tag.id })
    }

    useEffect(() => {
        if (!deleteTagFromNote.isError && !deleteTagFromNote.isSuccess) return
        const timer = setTimeout(() => deleteTagFromNote.reset(), 2500)
        return () => clearTimeout(timer)
    }, [deleteTagFromNote.isError, deleteTagFromNote.isSuccess, deleteTagFromNote])

    const pending_status = deleteTagFromNote.isPending ? 'Deleting tag ...'
      : deleteTagFromNote.isError ? 'Error: unable to delete tag'
      : deleteTagFromNote.isSuccess ? 'Tag successfully deleted'
      : '';

        return (
            <div >
            { pending_status != '' &&  <p>{pending_status}</p> }
       { tags.map(tag => (
        <div key={tag.id} >
            <p>{tag.name}</p>
            <button onClick={() => deleteTag(tag)}>Delete</button>
        </div>

       )) }
            </div>
        )
}

function TagsDataList({ workspace_id, list_id }) {
    const { data, isError, isSuccess, isPending, error } = useGetTagsForWorkspace(workspace_id)

    let options = []
    if (isError)
        options = [(<datalist> <option key="error" value="Error loading list!" /> </datalist>)]

    if (isPending)
        options = [(<datalist> <option key="loading" value="Loading ..." /> </datalist>)]

    if (isSuccess)
        options = data.map(tag => <option key={tag.id} value={tag.name} />)

    return <datalist id={list_id}>
           { options }
      </datalist>
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
