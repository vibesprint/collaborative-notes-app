import { screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

// --- Hoisted mocks ---------------------------------------------------------

const authRef = vi.hoisted(() => ({ current: { user: { email: 'me@x.com' } } }))

const m = vi.hoisted(() => ({
    // folders
    useGetFolders:        vi.fn(),
    useCreateFolder:      vi.fn(),
    useDeleteFolder:      vi.fn(),
    invalidateFolderData: vi.fn(),

    // workspaces
    useCurrentWorkspace:  vi.fn(),

    // channels
    useFolderChannel:     vi.fn(),

    // command palette
    useCommandPalette:    vi.fn(),
}))

vi.mock('../features/auth/auth.jsx', () => ({
    useAuth: (selector) => selector(authRef.current),
}))

vi.mock('../features/folders/folders.js', () => ({
    useGetFolders:        m.useGetFolders,
    useCreateFolder:      m.useCreateFolder,
    useDeleteFolder:      m.useDeleteFolder,
    invalidateFolderData: m.invalidateFolderData,
    PAGE_SIZE: 10,
}))

vi.mock('../features/workspaces/workspace.js', () => ({
    useCurrentWorkspace: m.useCurrentWorkspace,
}))

vi.mock('../features/channels/channel.js', () => ({
    useFolderChannel: m.useFolderChannel,
}))

vi.mock('../features/command_palette/command_palette.js', () => ({
    useCommandPalette: m.useCommandPalette,
}))

// ViewFolder renders <NotesList/> as a child — stub it out so this file doesn't
// have to mock the entire notes/tags surface area.
vi.mock('./Notes.jsx', () => ({
    NotesList: () => <div data-testid="notes-list-stub" />,
}))

import { CreateFolder, FoldersList, ViewFolder } from './Folders.jsx'

// --- Factories --------------------------------------------------------------
const success = (data) => ({ isPending: false, isLoading: false, isError: false, isSuccess: true,  data, error: null })
const pending = ()     => ({ isPending: true,  isLoading: true,  isError: false, isSuccess: false, data: undefined, error: null })
const errored = (e = new Error('boom')) => ({ isPending: false, isLoading: false, isError: true, isSuccess: false, data: undefined, error: e })

const mutation = (overrides = {}) => ({
    mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(),
    isPending: false, isError: false, isSuccess: false, isIdle: true,
    data: undefined, error: null, variables: undefined,
    ...overrides,
})

const makeChannel = () => ({ send: vi.fn(), track: vi.fn(), presenceState: () => ({}) })

beforeEach(() => {
    vi.clearAllMocks()
    m.useFolderChannel.mockReturnValue({
        channel: makeChannel(),
        isPending: false, isError: false, isSuccess: true,
    })
    m.useCurrentWorkspace.mockReturnValue(success({ id: 'ws1', name: 'Alpha' }))
    m.useCreateFolder.mockReturnValue(mutation())
    m.useDeleteFolder.mockReturnValue(mutation())
})

// ---------------------------------------------------------------------------
//                              CreateFolder
// ---------------------------------------------------------------------------

describe('CreateFolder', () => {
    function render(initialEntries = ['/folders/create']) {
        return renderWithProviders(null, {
            initialEntries,
            routes: [{ path: '/folders/create', element: <CreateFolder /> }],
        })
    }

    it('submits with name + workspace_id + parent_id from the URL', async () => {
        const create = mutation()
        m.useCreateFolder.mockReturnValue(create)
        render(['/folders/create?parent_id=42'])

        await userEvent.type(screen.getByLabelText(/name of the folder/i), 'Inbox')
        await userEvent.click(screen.getByRole('button', { name: /create folder/i }))

        expect(create.mutate).toHaveBeenCalledExactlyOnceWith({
            name: 'Inbox',
            workspace_id: 'ws1',
            parent_id: '42',
        })
    })

    it('parent_id defaults to null when not in the URL', async () => {
        const create = mutation()
        m.useCreateFolder.mockReturnValue(create)
        render()

        await userEvent.type(screen.getByLabelText(/name of the folder/i), 'Top')
        await userEvent.click(screen.getByRole('button', { name: /create folder/i }))

        expect(create.mutate).toHaveBeenCalledExactlyOnceWith({
            name: 'Top', workspace_id: 'ws1', parent_id: null,
        })
    })

    it('shows the pending status while creating', () => {
        m.useCreateFolder.mockReturnValue(mutation({ isPending: true }))
        render()
        expect(screen.getByText(/creating folder/i)).toBeInTheDocument()
    })

    it('shows the error status', () => {
        m.useCreateFolder.mockReturnValue(mutation({ isError: true }))
        render()
        expect(screen.getByText(/unable to create folder/i)).toBeInTheDocument()
    })

    it('on success: broadcasts on the channel', async () => {
        const channel = makeChannel()
        m.useFolderChannel.mockReturnValue({ channel, isPending: false, isError: false, isSuccess: true })
        m.useCreateFolder.mockReturnValue(mutation({ isSuccess: true, variables: { name: 'X' } }))
        render()

        await waitFor(() => {
            expect(channel.send).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'broadcast', event: 'delete_or_create' })
            )
        })
    })
})

// ---------------------------------------------------------------------------
//                              FoldersList
// ---------------------------------------------------------------------------

describe('FoldersList', () => {
    const folder = (id, name = `F${id}`) => ({ id, name })

    function render(extraEntries) {
        return renderWithProviders(null, {
            initialEntries: extraEntries ?? ['/folder/root'],
            routes: [{
                path: '/folder/:id',
                element: <FoldersList workspace_id="ws1" folder_id={null} />,
            }],
        })
    }

    it('renders the loading state', () => {
        m.useGetFolders.mockReturnValue(pending())
        render()
        expect(screen.getByText(/loading folders/i)).toBeInTheDocument()
    })

    it('renders the error state', () => {
        m.useGetFolders.mockReturnValue(errored())
        render()
        expect(screen.getByText(/unable to load folders/i)).toBeInTheDocument()
    })

    it('renders "No folders" when the list is empty', () => {
        m.useGetFolders.mockReturnValue(success([]))
        render()
        expect(screen.getByText(/no folders/i)).toBeInTheDocument()
    })

    it('renders a row per folder', () => {
        m.useGetFolders.mockReturnValue(success([folder(1, 'Inbox'), folder(2, 'Drafts')]))
        render()
        expect(screen.getByText('Inbox')).toBeInTheDocument()
        expect(screen.getByText('Drafts')).toBeInTheDocument()
    })

    it('Delete button calls deleteFolder.mutate(folder)', async () => {
        const del = mutation()
        m.useDeleteFolder.mockReturnValue(del)
        const f = folder(7, 'Trash')
        m.useGetFolders.mockReturnValue(success([f]))
        render()

        await userEvent.click(screen.getByRole('button', { name: /delete/i }))
        expect(del.mutate).toHaveBeenCalledExactlyOnceWith(f)
    })

    it('broadcasts on the channel after a successful folder delete', async () => {
        const channel = makeChannel()
        m.useFolderChannel.mockReturnValue({ channel, isPending: false, isError: false, isSuccess: true })
        m.useGetFolders.mockReturnValue(success([folder(1)]))
        m.useDeleteFolder.mockReturnValue(mutation({ isSuccess: true, variables: { name: 'F1' } }))
        render()

        await waitFor(() => {
            expect(channel.send).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'broadcast', event: 'delete_or_create' })
            )
        })
    })

    it('"Go Previous" is disabled on page 1 and "Go Forward" is disabled below PAGE_SIZE', () => {
        m.useGetFolders.mockReturnValue(success([folder(1)]))
        render()
        expect(screen.getByRole('button', { name: /go previous/i })).toBeDisabled()
        expect(screen.getByRole('button', { name: /go forward/i })).toBeDisabled()
    })

    it('"Go Forward" is enabled when the page is full (length >= PAGE_SIZE)', () => {
        const list = Array.from({ length: 10 }, (_, i) => folder(i + 1))
        m.useGetFolders.mockReturnValue(success(list))
        render()
        expect(screen.getByRole('button', { name: /go forward/i })).toBeEnabled()
    })
})

// ---------------------------------------------------------------------------
//                               ViewFolder
// ---------------------------------------------------------------------------

describe('ViewFolder (top-level branches)', () => {
    function render(path = '/folder/root') {
        return renderWithProviders(null, {
            initialEntries: [path],
            routes: [{ path: '/folder/:id', element: <ViewFolder /> }],
        })
    }

    it('shows loading while the current workspace is pending', () => {
        m.useCurrentWorkspace.mockReturnValue(pending())
        render()
        expect(screen.getByRole('heading', { name: /loading/i })).toBeInTheDocument()
    })

    it('shows the error branch', () => {
        m.useCurrentWorkspace.mockReturnValue(errored())
        render()
        expect(screen.getByText(/unable to workspace/i)).toBeInTheDocument()
    })

    it('shows the no-workspace branch', () => {
        m.useCurrentWorkspace.mockReturnValue(success(null))
        render()
        expect(screen.getByText(/no workspace/i)).toBeInTheDocument()
    })

    it('rejects a non-numeric folder id', () => {
        m.useGetFolders.mockReturnValue(success([])) // FoldersList won't render anyway
        render('/folder/abc')
        expect(screen.getByText(/no folder id to show/i)).toBeInTheDocument()
    })

    it('renders the inner shell (NotesList + FoldersList) for a valid folder id', () => {
        m.useGetFolders.mockReturnValue(success([]))
        render('/folder/123')

        expect(screen.getByTestId('notes-list-stub')).toBeInTheDocument()
        expect(screen.getByRole('heading', { name: /folders list/i })).toBeInTheDocument()
    })
})
