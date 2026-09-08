import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../src/App'

function renderApp() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string) => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify(
          input.includes('/api/facets')
            ? { total: 0, hobbies: [], nationalities: [] }
            : { items: [], pageInfo: { nextCursor: null, hasMore: false } },
        ),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('filter drawer', () => {
  it('is closed until the Filters button is pressed', async () => {
    renderApp()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))

    expect(await screen.findByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })

  it('marks the trigger expanded while the drawer is open', async () => {
    renderApp()
    const trigger = screen.getByRole('button', { name: /^Filters/ })

    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })

  it('moves focus into the drawer when it opens', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))

    await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus())
  })

  it('closes on Escape and returns focus to the trigger', async () => {
    renderApp()
    const trigger = screen.getByRole('button', { name: /^Filters/ })
    await userEvent.click(trigger)
    await screen.findByRole('dialog')

    await userEvent.keyboard('{Escape}')

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('closes when the backdrop is pressed', async () => {
    renderApp()
    await userEvent.click(screen.getByRole('button', { name: /^Filters/ }))
    await screen.findByRole('dialog')

    await userEvent.click(screen.getByRole('button', { name: 'Close filters' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('search box synchronisation', () => {
  it('keeps a trailing space in the search box', async () => {
    renderApp()
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'John ')

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(input).toHaveValue('John ')
  })
})
