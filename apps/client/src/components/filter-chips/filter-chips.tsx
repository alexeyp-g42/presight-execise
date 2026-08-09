import type { FacetOption } from '../../api/types'
import { Eraser, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { type FacetKind, selectChips, useFiltersStore } from '../../store/filters-store'
import { Flag } from '../flag/flag'
import styles from './filter-chips.module.scss'

interface Chip {
    key: string
    label: string
    kind: FacetKind
    /** Country code, present on nationality chips so the flag can be rendered. */
    code?: string
    onRemove: () => void
}

interface FilterChipsProps {
    /** Reference lists, used only to turn the selected ids/codes into readable labels. */
    hobbyOptions: FacetOption[]
    nationalityOptions: FacetOption[]
}

function labelOf(options: FacetOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value
}

export function FilterChips({ hobbyOptions, nationalityOptions }: FilterChipsProps) {
    const {
        hobbyIds,
        nationalityCodes,
        toggleHobby,
        toggleNationality,
        clearAll: onClearAll,
    } = useFiltersStore(useShallow(selectChips))

    const chips: Chip[] = [
        ...hobbyIds.map((id) => ({
            key: `hobby:${id}`,
            label: `HOBBY: ${labelOf(hobbyOptions, id).toUpperCase()}`,
            kind: 'hobby' as const,
            onRemove: () => toggleHobby(id),
        })),
        ...nationalityCodes.map((code) => ({
            key: `nat:${code}`,
            label: `NAT: ${labelOf(nationalityOptions, code).toUpperCase()}`,
            kind: 'nationality' as const,
            code,
            onRemove: () => toggleNationality(code),
        })),
    ]

    if (chips.length === 0) return null

    return (
        <div className={styles.root}>
            {chips.map((chip) => (
                <button
                    key={chip.key}
                    type="button"
                    className={styles.chip}
                    data-kind={chip.kind}
                    onClick={chip.onRemove}
                >
                    {chip.code && <Flag code={chip.code} />}
                    {chip.label}
                    <X className={styles.x} size={13} strokeWidth={3} aria-hidden />
                </button>
            ))}
            <button type="button" className={styles.clear} onClick={onClearAll}>
                <Eraser size={13} strokeWidth={2.5} aria-hidden />
                CLEAR ALL
            </button>
        </div>
    )
}
