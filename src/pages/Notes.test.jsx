import { screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

// --- Hoisted mock state -----------------------------------------------------

const authRef = vi.hoisted(() => ({ current: { user: null } }))

const m = vi.hoisted(() => ({
    useGetNotes:                vi.fn(),
    useDeleteNote:              vi.fn(),
    useCreateNote:              vi.fn(),
    useNote:                    vi.fn(),
    useUpdateNote:              vi.fn(),
    invalidateNotesInFolderData: vi.fn(),
    getNote:                    vi.fn(),

    useGetTagsForNotes:    vi.fn(),
    useAddTagToNote:       vi.fn(),
    useGetTagsForWorkspace: vi.fn(),
    useDeleteTagFromNote:  vi.fn(),

    useWorkspaceMember:    vi.fn(),
    useCurrentWorkspaceId: vi.fn(),

    useNotesListChannel: vi.fn(),
    useNoteChannel:      vi.fn(),

    useCommandPalette: vi.fn(),
}))

// --- Module mocks -----------------------------------------------------------

vi.mock('../features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

vi.mock('../features/notes/note.js', () => ({
    useGetNotes:                 m.useGetNotes,
    useDeleteNote:               m.useDeleteNote,
    useCreateNote:               m.useCreateNote,
    useNote:                     m.useNote,
    useUpdateNote:               m.useUpdateNote,
    invalidateNotesInFolderData: m.invalidateNotesInFolderData,
    getNote:                     m.getNote,
    QUERY_KEYS: {
        list_in_folder_all: (...args) => ['notes', ...args, 'list'],
    },
    PAGE_SIZE: 10,
}))

vi.mock('../features/tags/tags.js', () => ({
    useGetTagsForNotes:     m.useGetTagsForNotes,
    useAddTagToNote:        m.useAddTagToNote,
    useGetTagsForWorkspace: m.useGetTagsForWorkspace,
    useDeleteTagFromNote:   m.useDeleteTagFromNote,
}))

vi.mock('../features/workspaces/workspace.js', () => ({
    useWorkspaceMember:    m.useWorkspaceMember,
    useCurrentWorkspaceId: m.useCurrentWorkspaceId,
}))

vi.mock('../features/channels/channel.js', () => ({
    useNotesListChannel: m.useNotesListChannel,
    useNoteChannel:      m.useNoteChannel,
}))

vi.mock('../features/command_palette/command_palette.js', () => ({
    useCommandPalette: m.useCommandPalette,
}))

// MDXEditor — a forwardRef textarea that exposes getMarkdown/setMarkdown.
vi.mock('@mdxeditor/editor', async () => {
    const React = await import('react')
    const MDXEditor = React.forwardRef(({ markdown, onChange }, ref) => {
        const [value, setValue] = React.useState(markdown ?? '')
        React.useImperativeHandle(ref, () => ({
            getMarkdown: () => value,
            setMarkdown: (v) => setValue(v ?? ''),
        }))
        return (
            <textarea
                data-testid="mdx-editor"
                value={value}
                onChange={(e) => { setValue(e.target.value); onChange?.(e.target.value) }}
            />
        )
    })
    return {
        MDXEditor,
        headingsPlugin:      () => ({}),
        listsPlugin:         () => ({}),
        quotePlugin:         () => ({}),
        thematicBreakPlugin: () => ({}),
    }
})

vi.mock('@mdxeditor/editor/style.css', () => ({}))

import { NotesList, CreateNote, EditNote, Note } from './Notes.jsx'

// --- Factories --------------------------------------------------------------

const success = (data) => ({ isPending: false, isLoading: false, isError: false, isSuccess: true,  data, error: null })
const pending = ()     => ({ isPending: true,  isLoading: true,  isError: false, isSuccess: false, data: undefined, error: null })
const errored = (e = new Error('boom')) => ({ isPending: false, isLoading: false, isError: true, isSuccess: false, data: undefined, error: e })

const mutation = (overrides = {}) => ({
    mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(),
    isPending: false, isError: false, isSuccess: false, isIdle: true,
    data: undefined, error: null,
    ...overrides,
})

const makeChannel = () => ({ send: vi.fn(), track: vi.fn(), presenceState: () => ({}) })

// --- Defaults reset per-test ------------------------------------------------

beforeEach(() => {
    vi.clearAllMocks()
    authRef.current = { user: { id: 'u1', email: 'me@x.com' } }

    // Sensible defaults: tags resolve to "no tags" for every note in the list.
    m.useGetTagsForNotes.mockImplementation((notes) => success(
        Object.fromEntries((notes ?? []).map((n) => [n.id, []]))
    ))
    m.useGetTagsForWorkspace.mockReturnValue(success([]))
    m.useAddTagToNote.mockReturnValue(mutation())
    m.useDeleteTagFromNote.mockReturnValue(mutation())

    m.useCurrentWorkspaceId.mockReturnValue('ws1')
    m.useWorkspaceMember.mockReturnValue(success({ email: 'author@x.com' }))

    m.useNotesListChannel.mockReturnValue({
        channel: makeChannel(), isPending: false, isError: false, isSuccess: true,
    })
    m.useNoteChannel.mockReturnValue({
        channel: makeChannel(), isPending: false, isError: false, isSuccess: true,
    })

    m.useDeleteNote.mockReturnValue(mutation())
    m.useCreateNote.mockReturnValue(mutation())
    m.useUpdateNote.mockReturnValue(mutation())
})

// ---------------------------------------------------------------------------
//                                  TESTS
// ---------------------------------------------------------------------------

describe('NotesList', () => {
    const note = (id, overrides = {}) => ({
        id,
        title: `Note ${id}`,
        body: 'body',
        workspace_id: 'ws1',
        folder_id: null,
        updated_at: '2026-01-01T00:00:00Z',
        ...overrides,
    })

    it('renders the loading state', () => {
        m.useGetNotes.mockReturnValue(pending())
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        expect(screen.getByText(/loading notes/i)).toBeInTheDocument()
    })

    it('renders the error state', () => {
        m.useGetNotes.mockReturnValue(errored())
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        expect(screen.getByText(/unable to load notes/i)).toBeInTheDocument()
    })

    it('renders "No notes" when the list is empty', () => {
        m.useGetNotes.mockReturnValue(success([]))
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        // The empty-state copy appears inside NotesList itself.
        const matches = screen.getAllByText(/no notes/i)
        expect(matches.length).toBeGreaterThan(0)
    })

    it('renders rows for every note returned', () => {
        m.useGetNotes.mockReturnValue(success([note(1), note(2), note(3)]))
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        expect(screen.getByText('Note 1')).toBeInTheDocument()
        expect(screen.getByText('Note 2')).toBeInTheDocument()
        expect(screen.getByText('Note 3')).toBeInTheDocument()
    })

    it('clicking "Delete Note" calls the delete mutation with the note', async () => {
        const notes = [note(7)]
        m.useGetNotes.mockReturnValue(success(notes))
        const del = mutation()
        m.useDeleteNote.mockReturnValue(del)

        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        await userEvent.click(screen.getByRole('button', { name: /delete note/i }))

        expect(del.mutate).toHaveBeenCalledExactlyOnceWith(notes[0])
    })

    it('hides "Recently Edited" when there are fewer than 5 notes', () => {
        m.useGetNotes.mockReturnValue(success([note(1), note(2), note(3), note(4)]))
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        expect(screen.queryByText(/recently edited/i)).not.toBeInTheDocument()
    })

    it('shows "Recently Edited" when there are at least 5 notes', () => {
        m.useGetNotes.mockReturnValue(success([note(1), note(2), note(3), note(4), note(5)]))
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        expect(screen.getByText(/recently edited/i)).toBeInTheDocument()
    })

    it('disables "Go Previous" on page 1 and disables "Go Forward" when the page is not full', () => {
        m.useGetNotes.mockReturnValue(success([note(1)]))
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)

        expect(screen.getByRole('button', { name: /go previous/i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /go forward/i })).toBeDisabled()
    })

    it('enables "Go Forward" when the page is full (length >= PAGE_SIZE)', () => {
        const list = Array.from({ length: 10 }, (_, i) => note(i + 1))
        m.useGetNotes.mockReturnValue(success(list))
        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)
        expect(screen.getByRole('button', { name: /go forward/i })).toBeEnabled()
    })

    it('broadcasts on the channel when a delete succeeds', async () => {
        const channel = makeChannel()
        m.useNotesListChannel.mockReturnValue({ channel, isPending: false, isError: false, isSuccess: true })
        m.useGetNotes.mockReturnValue(success([note(1)]))
        m.useDeleteNote.mockReturnValue(mutation({ isSuccess: true }))

        renderWithProviders(<NotesList workspace_id="ws1" folder_id={null} />)

        await waitFor(() => {
            expect(channel.send).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'broadcast', event: 'note_create_or_delete' })
            )
        })
    })
})

describe('CreateNote', () => {
    it('submits with title, body, folder_id, and workspace_id', async () => {
        const create = mutation()
        m.useCreateNote.mockReturnValue(create)
        m.useCurrentWorkspaceId.mockReturnValue('ws1')

        renderWithProviders(null, {
            initialEntries: ['/notes/create?folder_id=fold1'],
            routes: [{ path: '/notes/create', element: <CreateNote /> }],
        })

        await userEvent.type(screen.getByPlaceholderText(/title/i), 'Hello')
        await userEvent.type(screen.getByTestId('mdx-editor'), 'world')
        await userEvent.click(screen.getByRole('button', { name: /make a note/i }))

        expect(create.mutate).toHaveBeenCalledExactlyOnceWith({
            title: 'Hello',
            body: 'world',
            folder_id: 'fold1',
            workspace_id: 'ws1',
        })
    })

    it('renders the pending banner while creating', () => {
        m.useCreateNote.mockReturnValue(mutation({ isPending: true }))
        renderWithProviders(null, {
            initialEntries: ['/notes/create'],
            routes: [{ path: '/notes/create', element: <CreateNote /> }],
        })
        expect(screen.getByText(/creating note/i)).toBeInTheDocument()
    })

    it('renders the success banner after creation succeeds', () => {
        m.useCreateNote.mockReturnValue(mutation({ isSuccess: true }))
        renderWithProviders(null, {
            initialEntries: ['/notes/create'],
            routes: [{ path: '/notes/create', element: <CreateNote /> }],
        })
        expect(screen.getByText(/successfully created/i)).toBeInTheDocument()
    })

    it('renders the error banner with the error message', () => {
        m.useCreateNote.mockReturnValue(mutation({ isError: true, error: new Error('boom') }))
        renderWithProviders(null, {
            initialEntries: ['/notes/create'],
            routes: [{ path: '/notes/create', element: <CreateNote /> }],
        })
        expect(screen.getByText(/error: boom/i)).toBeInTheDocument()
    })
})

describe('Note (read view)', () => {
    it('renders the loading state', () => {
        m.useNote.mockReturnValue({ ...pending(), isLoading: true })
        renderWithProviders(null, {
            initialEntries: ['/notes/42'],
            routes: [{ path: '/notes/:id', element: <Note /> }],
        })
        expect(screen.getByText(/loading note details/i)).toBeInTheDocument()
    })

    it('renders the error state', () => {
        m.useNote.mockReturnValue(errored())
        renderWithProviders(null, {
            initialEntries: ['/notes/42'],
            routes: [{ path: '/notes/:id', element: <Note /> }],
        })
        expect(screen.getByText(/error occured while loading note/i)).toBeInTheDocument()
    })

    it('renders the note title, body, and author email', async () => {
        m.useNote.mockReturnValue(success({
            id: 42, title: 'My Note', body: 'the body',
            user_id: 'u-author', created_at: '2026-01-01',
        }))
        m.useWorkspaceMember.mockReturnValue(success({ email: 'author@x.com' }))

        renderWithProviders(null, {
            initialEntries: ['/notes/42'],
            routes: [{ path: '/notes/:id', element: <Note /> }],
        })

        expect(screen.getByRole('heading', { name: 'My Note' })).toBeInTheDocument()
        expect(screen.getByText('the body')).toBeInTheDocument()
        // "Created by: " and the email render as sibling text nodes in one <p>,
        // so we match the containing paragraph with a regex.
        expect(screen.getByText(/author@x\.com/)).toBeInTheDocument()
    })
})

describe('EditNote (entry guard)', () => {
    it('shows an error for an invalid note id', () => {
        renderWithProviders(null, {
            initialEntries: ['/notes/not-a-number/edit'],
            routes: [{ path: '/notes/:id/edit', element: <EditNote /> }],
        })
        expect(screen.getByText(/invalid note id/i)).toBeInTheDocument()
    })
})
