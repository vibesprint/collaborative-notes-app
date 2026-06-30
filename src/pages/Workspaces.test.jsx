import { screen, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { renderWithProviders } from '../../test/utils/renderWithProviders.jsx'

const m = vi.hoisted(() => ({
    useWorkspaceList:      vi.fn(),
    useCreateWorkspace:    vi.fn(),
    useDeleteWorkspace:    vi.fn(),
    useWorkspaceMember:    vi.fn(),
    useSetSelectedId:      vi.fn(),
    useAddWorkspaceMember: vi.fn(),
}))

vi.mock('../features/workspaces/workspace.js', () => ({
    useWorkspaceList:      m.useWorkspaceList,
    useCreateWorkspace:    m.useCreateWorkspace,
    useDeleteWorkspace:    m.useDeleteWorkspace,
    useWorkspaceMember:    m.useWorkspaceMember,
    useSetSelectedId:      m.useSetSelectedId,
    useAddWorkspaceMember: m.useAddWorkspaceMember,
}))

import { Workspaces, CreateWorkspace, AddWorkspaceMember } from './Workspaces.jsx'

// --- Factories --------------------------------------------------------------
const success = (data) => ({ isPending: false, isLoading: false, isFetching: false, isError: false, isSuccess: true,  data, error: null })
const pending = ()     => ({ isPending: true,  isLoading: true,  isFetching: true,  isError: false, isSuccess: false, data: undefined, error: null })
const errored = (e = new Error('boom')) => ({ isPending: false, isLoading: false, isFetching: false, isError: true, isSuccess: false, data: undefined, error: e })

const mutation = (overrides = {}) => ({
    mutate: vi.fn(), mutateAsync: vi.fn(), reset: vi.fn(),
    isPending: false, isError: false, isSuccess: false, isIdle: true,
    data: undefined, error: null,
    ...overrides,
})

beforeEach(() => {
    vi.clearAllMocks()
    m.useDeleteWorkspace.mockReturnValue(mutation())
    m.useCreateWorkspace.mockReturnValue(mutation())
    m.useAddWorkspaceMember.mockReturnValue(mutation())
    m.useSetSelectedId.mockReturnValue(vi.fn())
    m.useWorkspaceMember.mockReturnValue(success({ email: 'owner@x.com' }))
})

// ---------------------------------------------------------------------------
//                            Workspaces (list)
// ---------------------------------------------------------------------------

describe('Workspaces list', () => {
    const ws = (id, name = `Workspace ${id}`) => ({ id, name, created_by: 'u-owner' })

    it('shows the loading copy while pending+fetching', () => {
        m.useWorkspaceList.mockReturnValue({ ...pending() })
        renderWithProviders(<Workspaces />)
        expect(screen.getByRole('heading', { name: /fetching workspaces/i })).toBeInTheDocument()
    })

    it('shows the error copy on error', () => {
        m.useWorkspaceList.mockReturnValue(errored(new Error('rpc dead')))
        renderWithProviders(<Workspaces />)
        expect(screen.getByText(/error occured.*rpc dead/i)).toBeInTheDocument()
    })

    it('shows "No workspaces" when the list is empty', () => {
        m.useWorkspaceList.mockReturnValue(success([]))
        renderWithProviders(<Workspaces />)
        expect(screen.getByText(/no workspaces/i)).toBeInTheDocument()
    })

    it('renders a row per workspace with name + action buttons', () => {
        m.useWorkspaceList.mockReturnValue(success([ws('w1', 'Alpha'), ws('w2', 'Beta')]))
        renderWithProviders(<Workspaces />)

        expect(screen.getByText('Alpha')).toBeInTheDocument()
        expect(screen.getByText('Beta')).toBeInTheDocument()
        expect(screen.getAllByRole('button', { name: /delete/i })).toHaveLength(2)
        expect(screen.getAllByRole('button', { name: /set current/i })).toHaveLength(2)
        expect(screen.getAllByRole('button', { name: /add a member/i })).toHaveLength(2)
    })

    it('opens the delete confirmation modal when Delete is clicked', async () => {
        m.useWorkspaceList.mockReturnValue(success([ws('w1', 'Alpha')]))
        renderWithProviders(<Workspaces />)

        await userEvent.click(screen.getByRole('button', { name: /delete/i }))
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^yes$/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /^no$/i })).toBeInTheDocument()
    })

    it('Yes in the modal calls deleteWorkspace.mutate(id) and closes the modal', async () => {
        const del = mutation()
        m.useDeleteWorkspace.mockReturnValue(del)
        m.useWorkspaceList.mockReturnValue(success([ws('w1')]))
        renderWithProviders(<Workspaces />)

        await userEvent.click(screen.getByRole('button', { name: /delete/i }))
        await userEvent.click(screen.getByRole('button', { name: /^yes$/i }))

        expect(del.mutate).toHaveBeenCalledExactlyOnceWith('w1')
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    it('No in the modal closes the modal without mutating', async () => {
        const del = mutation()
        m.useDeleteWorkspace.mockReturnValue(del)
        m.useWorkspaceList.mockReturnValue(success([ws('w1')]))
        renderWithProviders(<Workspaces />)

        await userEvent.click(screen.getByRole('button', { name: /delete/i }))
        await userEvent.click(screen.getByRole('button', { name: /^no$/i }))

        expect(del.mutate).not.toHaveBeenCalled()
        expect(screen.queryByText(/are you sure/i)).not.toBeInTheDocument()
    })

    it('"Set Current" calls setSelectedId with the workspace id', async () => {
        const setSelectedId = vi.fn()
        m.useSetSelectedId.mockReturnValue(setSelectedId)
        m.useWorkspaceList.mockReturnValue(success([ws('w1')]))
        renderWithProviders(<Workspaces />)

        await userEvent.click(screen.getByRole('button', { name: /set current/i }))
        expect(setSelectedId).toHaveBeenCalledExactlyOnceWith('w1')
    })

    it('renders delete-pending / success / error banners based on mutation state', () => {
        m.useWorkspaceList.mockReturnValue(success([ws('w1')]))

        m.useDeleteWorkspace.mockReturnValue(mutation({ isPending: true }))
        const { unmount: u1 } = renderWithProviders(<Workspaces />)
        expect(screen.getByText(/deleting workspace/i)).toBeInTheDocument()
        u1()

        m.useDeleteWorkspace.mockReturnValue(mutation({ isSuccess: true }))
        const { unmount: u2 } = renderWithProviders(<Workspaces />)
        expect(screen.getByText(/workspace deleted!/i)).toBeInTheDocument()
        u2()

        m.useDeleteWorkspace.mockReturnValue(mutation({ isError: true, error: new Error('nope') }))
        renderWithProviders(<Workspaces />)
        expect(screen.getByText(/error while deleting workspace: nope/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
//                            CreateWorkspace
// ---------------------------------------------------------------------------

describe('CreateWorkspace', () => {
    it('submits the typed name', async () => {
        const create = mutation()
        m.useCreateWorkspace.mockReturnValue(create)
        renderWithProviders(<CreateWorkspace />)

        await userEvent.type(screen.getByLabelText(/workspace name/i), 'Gamma')
        await userEvent.click(screen.getByRole('button', { name: /make a workspace/i }))

        expect(create.mutate).toHaveBeenCalledExactlyOnceWith('Gamma')
    })

    it('renders pending / success / error banners', () => {
        m.useCreateWorkspace.mockReturnValue(mutation({ isPending: true }))
        const { unmount: u1 } = renderWithProviders(<CreateWorkspace />)
        expect(screen.getByText(/creating workspace/i)).toBeInTheDocument()
        u1()

        m.useCreateWorkspace.mockReturnValue(mutation({ isSuccess: true }))
        const { unmount: u2 } = renderWithProviders(<CreateWorkspace />)
        expect(screen.getByText(/successfully created/i)).toBeInTheDocument()
        u2()

        m.useCreateWorkspace.mockReturnValue(mutation({ isError: true, error: new Error('bad') }))
        renderWithProviders(<CreateWorkspace />)
        expect(screen.getByText(/error: bad/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
//                          AddWorkspaceMember
// ---------------------------------------------------------------------------

describe('AddWorkspaceMember', () => {
    function render(initialEntries = ['/add-member?wspc_id=w1']) {
        return renderWithProviders(null, {
            initialEntries,
            routes: [{ path: '/add-member', element: <AddWorkspaceMember /> }],
        })
    }

    it('submits with the workspace id from the query string and the typed email', async () => {
        const add = mutation()
        m.useAddWorkspaceMember.mockReturnValue(add)
        render()

        await userEvent.type(screen.getByLabelText(/email of the invitee/i), 'x@y.com')
        await userEvent.click(screen.getByRole('button', { name: /add member/i }))

        expect(add.mutate).toHaveBeenCalledExactlyOnceWith({
            workspace_id: 'w1', email: 'x@y.com',
        })
    })

    it('shows the no-workspace notice when wspc_id is missing and skips the mutation', async () => {
        const add = mutation()
        m.useAddWorkspaceMember.mockReturnValue(add)
        render(['/add-member'])

        await userEvent.type(screen.getByLabelText(/email of the invitee/i), 'x@y.com')
        await userEvent.click(screen.getByRole('button', { name: /add member/i }))

        expect(screen.getByText(/no workspace set/i)).toBeInTheDocument()
        expect(add.mutate).not.toHaveBeenCalled()
    })

    it('renders pending / error / success banners', () => {
        m.useAddWorkspaceMember.mockReturnValue(mutation({ isPending: true }))
        const { unmount: u1 } = render()
        expect(screen.getByText(/adding member/i)).toBeInTheDocument()
        u1()

        m.useAddWorkspaceMember.mockReturnValue(mutation({ isError: true }))
        const { unmount: u2 } = render()
        expect(screen.getByText(/unable to add member/i)).toBeInTheDocument()
        u2()

        m.useAddWorkspaceMember.mockReturnValue(mutation({ isSuccess: true }))
        render()
        expect(screen.getByText(/successfully added member/i)).toBeInTheDocument()
    })
})
