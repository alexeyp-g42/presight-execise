import type { Hobby, Nationality, SortDirection, UserSortField } from '@presight/schema'

/**
 * UI filter state. Hobbies and nationalities are held as the identifiers the API expects
 * (`hobby_id` / `nationality_code`), never as labels, so a selection stays valid no matter how the
 * value happens to be displayed.
 */
export interface UserFilters {
    search: string
    hobbyIds: string[]
    nationalityCodes: string[]
    sortField: UserSortField
    sortDir: SortDirection
}

/** Schema entities reduced to what the pickers render: a stable identifier plus a display label. */
export interface FacetOption {
    value: string
    label: string
}

export function toHobbyOption(hobby: Hobby): FacetOption {
    return { value: hobby.id, label: hobby.label }
}

export function toNationalityOption(nationality: Nationality): FacetOption {
    return { value: nationality.code, label: nationality.label }
}
