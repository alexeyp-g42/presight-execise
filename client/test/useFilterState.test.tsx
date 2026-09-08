import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { parseFilterStateFromParams, useFilterState } from '../src/hooks/useFilterState'

function wrapperFor(initialUrl: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  }
}

function renderFilterState(initialUrl = '/') {
  return renderHook(
    () => ({ filters: useFilterState(), location: useLocation() }),
    { wrapper: wrapperFor(initialUrl) },
  )
}

describe('parseFilterStateFromParams', () => {
  it('falls back to defaults for an empty query string', () => {
    expect(parseFilterStateFromParams(new URLSearchParams())).toEqual({
      q: '',
      nationalities: [],
      hobbies: [],
      sort: 'first_name',
      order: 'asc',
    })
  })

  it('reads repeated parameters into arrays', () => {
    const state = parseFilterStateFromParams(
      new URLSearchParams('hobbies=Chess&hobbies=Yoga&nationalities=British'),
    )

    expect(state.hobbies).toEqual(['Chess', 'Yoga'])
    expect(state.nationalities).toEqual(['British'])
  })

  it('ignores a sort field outside the whitelist', () => {
    expect(parseFilterStateFromParams(new URLSearchParams('sort=evil')).sort).toBe('first_name')
  })

  it('ignores an order outside the whitelist', () => {
    expect(parseFilterStateFromParams(new URLSearchParams('order=evil')).order).toBe('asc')
  })
})

describe('useFilterState', () => {
  it('restores state from the URL on mount', () => {
    const { result } = renderFilterState('/?q=ada&hobbies=Chess&sort=age&order=desc')

    expect(result.current.filters.state).toEqual({
      q: 'ada',
      nationalities: [],
      hobbies: ['Chess'],
      sort: 'age',
      order: 'desc',
    })
  })

  it('writes the text filter into the URL', () => {
    const { result } = renderFilterState()
    act(() => result.current.filters.setText('ada'))

    expect(result.current.location.search).toBe('?q=ada')
  })

  it('adds a hobby on first toggle and removes it on the second', () => {
    const { result } = renderFilterState()
    act(() => result.current.filters.toggleHobby('Chess'))

    expect(result.current.filters.state.hobbies).toEqual(['Chess'])

    act(() => result.current.filters.toggleHobby('Chess'))

    expect(result.current.filters.state.hobbies).toEqual([])
  })

  it('accumulates multiple nationalities', () => {
    const { result } = renderFilterState()
    act(() => result.current.filters.toggleNationality('British'))
    act(() => result.current.filters.toggleNationality('Japanese'))

    expect(result.current.filters.state.nationalities).toEqual(['British', 'Japanese'])
  })

  it('round-trips state through the URL', () => {
    const { result } = renderFilterState()
    act(() => result.current.filters.setText('ada'))
    act(() => result.current.filters.toggleHobby('Chess'))
    act(() => result.current.filters.setSort('age'))
    act(() => result.current.filters.setOrder('desc'))

    const restored = parseFilterStateFromParams(
      new URLSearchParams(result.current.location.search),
    )

    expect(restored).toEqual(result.current.filters.state)
  })

  it('clears every filter but keeps the sort', () => {
    const { result } = renderFilterState('/?q=ada&hobbies=Chess&sort=age&order=desc')
    act(() => result.current.filters.clearAll())

    expect(result.current.filters.state).toEqual({
      q: '',
      nationalities: [],
      hobbies: [],
      sort: 'age',
      order: 'desc',
    })
  })
})
