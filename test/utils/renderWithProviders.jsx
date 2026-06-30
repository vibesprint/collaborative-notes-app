import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function defaultClient() {
    return new QueryClient({
        defaultOptions: {
            queries:   { retry: false },
            mutations: { retry: false },
        },
    })
}

export function renderWithProviders(ui, {
    initialEntries = ['/'],
    queryClient,
    routes,
} = {}) {
    const client = queryClient ?? defaultClient()

    const tree = routes
        ? (
            <Routes>
                {routes.map(({ path, element }) => (
                    <Route key={path} path={path} element={element} />
                ))}
            </Routes>
        )
        : ui

    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={initialEntries}>
                {tree}
            </MemoryRouter>
        </QueryClientProvider>,
    )
}
