import { useEffect } from 'react'
import { create } from 'zustand'
import type { SortDirection, UserSortField } from '@presight/schema'
import type { UserFilters } from '../api/types'
import { DEFAULT_FILTERS, filtersToQueryString, readFiltersFromUrl } from './filters-url'

/** Which of the two facet lists a component is bound to. */
export type FacetKind = 'hobby' | 'nationality'

interface FiltersActions {
    setSearch: (search: string) => void
    toggleHobby: (hobbyId: string) => void
    toggleNationality: (nationalityCode: string) => void
    setSortField: (sortField: UserSortField) => void
    setSortDir: (sortDir: SortDirection) => void
    clearAll: () => void
    /** Overwrite everything at once — used when history navigation supplies a new URL. */
    replace: (filters: UserFilters) => void
}

export type FiltersStore = UserFilters & FiltersActions

function toggleValue(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value]
}

export const useFiltersStore = create<FiltersStore>((set) => ({
    // Deep-linking: the URL wins on first load, so a shared link opens with its filters applied.
    ...readFiltersFromUrl(window.location.search),

    setSearch: (search) => set({ search }),

    // Every update derives from the state passed in rather than a captured render value, so
    // concurrent toggles cannot overwrite each other.
    toggleHobby: (hobbyId) => set((state) => ({ hobbyIds: toggleValue(state.hobbyIds, hobbyId) })),
    toggleNationality: (nationalityCode) =>
        set((state) => ({ nationalityCodes: toggleValue(state.nationalityCodes, nationalityCode) })),

    setSortField: (sortField) => set({ sortField }),
    setSortDir: (sortDir) => set({ sortDir }),
    clearAll: () => set(DEFAULT_FILTERS),
    replace: (filters) => set(filters),
}))

/*
 * Selector policy — zustand v5 dropped the automatic shallow compare, so a selector building a
 * fresh object returns a new reference on every store write and re-renders forever.
 *
 *   one value   -> select it directly. `(s) => s.search` is already reference-stable; wrapping it
 *                  in `useShallow` only adds an allocation and a comparison to reach the same result.
 *   many values -> build an object and wrap the selector in `useShallow` at the call site, which
 *                  hands back the previous reference whenever the fields are unchanged.
 */

// --- single values ---
export const selectSearch = (s: FiltersStore) => s.search
export const selectHobbyIds = (s: FiltersStore) => s.hobbyIds
export const selectNationalityCodes = (s: FiltersStore) => s.nationalityCodes
export const selectSetSearch = (s: FiltersStore) => s.setSearch
export const selectClearAll = (s: FiltersStore) => s.clearAll

// --- composites: every one of these MUST be wrapped in useShallow by the caller ---

/** The whole filter set, as the API layer wants it. */
export const selectFilters = (s: FiltersStore): UserFilters => ({
    search: s.search,
    hobbyIds: s.hobbyIds,
    nationalityCodes: s.nationalityCodes,
    sortField: s.sortField,
    sortDir: s.sortDir,
})

export const selectSortControls = (s: FiltersStore) => ({
    sortField: s.sortField,
    sortDir: s.sortDir,
    setSortField: s.setSortField,
    setSortDir: s.setSortDir,
})

export const selectChips = (s: FiltersStore) => ({
    hobbyIds: s.hobbyIds,
    nationalityCodes: s.nationalityCodes,
    toggleHobby: s.toggleHobby,
    toggleNationality: s.toggleNationality,
    clearAll: s.clearAll,
})

/** Per-facet selectors, so `FacetKind` is the only thing a facet component needs to know. */
export const selectedFor: Record<FacetKind, (s: FiltersStore) => string[]> = {
    hobby: selectHobbyIds,
    nationality: selectNationalityCodes,
}

export const toggleFor: Record<FacetKind, (s: FiltersStore) => (value: string) => void> = {
    hobby: (s) => s.toggleHobby,
    nationality: (s) => s.toggleNationality,
}

/** Typing edits the current entry; anything else is a discrete step worth a Back button. */
function onlySearchChanged(next: UserFilters, prev: UserFilters): boolean {
    return (
        next.search !== prev.search &&
        next.hobbyIds === prev.hobbyIds &&
        next.nationalityCodes === prev.nationalityCodes &&
        next.sortField === prev.sortField &&
        next.sortDir === prev.sortDir
    )
}

/**
 * Keeps the address bar and the store in step, in both directions. Returns a teardown function.
 * Split out of the hook below so the history behaviour can be exercised without a renderer.
 */
export function startFiltersUrlSync(): () => void {
    // Set while a popstate is being applied: without it, writing the store from the history event
    // would immediately push a fresh entry and strip the forward stack.
    let applyingHistory = false

    const unsubscribe = useFiltersStore.subscribe((state, previous) => {
        if (applyingHistory) return

        const query = filtersToQueryString(state)
        const url = query ? `?${query}` : window.location.pathname

        if (onlySearchChanged(state, previous)) {
            window.history.replaceState(null, '', url)
        } else {
            window.history.pushState(null, '', url)
        }
    })

    const handlePopState = () => {
        applyingHistory = true
        useFiltersStore.getState().replace(readFiltersFromUrl(window.location.search))
        applyingHistory = false
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
        unsubscribe()
        window.removeEventListener('popstate', handlePopState)
    }
}

/** Call once, from the root. */
export function useFiltersUrlSync(): void {
    useEffect(startFiltersUrlSync, [])
}
