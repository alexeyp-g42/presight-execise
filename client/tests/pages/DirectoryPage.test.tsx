import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { DirectoryPage } from '../../src/pages/DirectoryPage';
import type { UsersResponse, FacetsResponse } from '@shared/types';

// jsdom has no layout engine so useVirtualizer renders zero rows.
// Mock it to render all items directly so tests can assert on card content.
vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * estimateSize(),
        size: estimateSize(),
        key: i,
        lane: 0,
      })),
    getTotalSize: () => count * estimateSize(),
  }),
}));

const usersResp: UsersResponse = {
  items: [
    { id: 1, avatar: 'x', first_name: 'Ada', last_name: 'Lovelace', age: 36, nationality: 'UK', hobbies: ['math'] },
  ],
  nextCursor: null,
  hasMore: false,
};
const facetsResp: FacetsResponse = {
  hobbies: [{ value: 'math', count: 1 }],
  nationalities: [{ value: 'UK', count: 1 }],
};

function mockFetch(map: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const key = Object.keys(map).find((k) => url.startsWith(k))!;
    return { ok: true, status: 200, json: async () => map[key] } as unknown as Response;
  });
}

function wrap(initial = '/') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (children: React.ReactNode) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DirectoryPage', () => {
  beforeEach(() => {
    (globalThis as any).fetch = mockFetch({
      '/api/users': usersResp,
      '/api/facets': facetsResp,
    });
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('renders users and facets on load', async () => {
    render(wrap('/')(<DirectoryPage />));
    await waitFor(() => expect(screen.getByText('Ada Lovelace')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /math/ })).toBeInTheDocument();
  });

  it('empty state renders when API returns no items', async () => {
    (globalThis as any).fetch = mockFetch({
      '/api/users': { items: [], nextCursor: null, hasMore: false },
      '/api/facets': { hobbies: [], nationalities: [] },
    });
    render(wrap('/')(<DirectoryPage />));
    await waitFor(() => expect(screen.getByText(/No users match/)).toBeInTheDocument());
  });

  it('error state renders on API error', async () => {
    (globalThis as any).fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ error: { code: 'boom', message: 'boom' } }) })) as any;
    render(wrap('/')(<DirectoryPage />));
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('toggling a hobby updates the URL', async () => {
    let loc = '';
    function Spy() { loc = useLocation().search; return null; }
    render(wrap('/')(<><DirectoryPage /><Spy /></>));
    await waitFor(() => expect(screen.getByRole('button', { name: /math/ })).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /math/ }));
    await waitFor(() => expect(loc).toContain('hobbies=math'));
  });
});
