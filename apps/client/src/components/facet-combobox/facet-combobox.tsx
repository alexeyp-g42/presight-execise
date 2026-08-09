import { useMemo, useState } from 'react'
import { Combobox, useCombobox } from '@mantine/core'
import { Check, Plus } from 'lucide-react'
import type { FacetOption } from '../../api/types'
import { type FacetKind, selectedFor, toggleFor, useFiltersStore } from '../../store/filters-store'
import { Flag } from '../flag/flag'
import styles from './facet-combobox.module.scss'

interface FacetComboboxProps {
    placeholder: string
    /** Predefined reference list from the API. */
    options: FacetOption[]
    /** Which filter list this picker drives. */
    facet: FacetKind
    accent: 'yellow' | 'pink'
}

/** Type-to-filter multi-select over a predefined list (Mantine headless Combobox). */
export function FacetCombobox({ placeholder, options, facet, accent }: FacetComboboxProps) {
    const selected = useFiltersStore(selectedFor[facet])
    const onToggle = useFiltersStore(toggleFor[facet])
    const [query, setQuery] = useState('')
    const combobox = useCombobox({
        onDropdownClose: () => combobox.resetSelectedOption(),
    })

    const filtered = useMemo(() => {
        const needle = query.trim().toLowerCase()
        return options.filter((option) => option.label.toLowerCase().includes(needle))
    }, [options, query])

    return (
        <Combobox
            store={combobox}
            withinPortal={false}
            onOptionSubmit={(value) => {
                onToggle(value)
                setQuery('')
            }}
        >
            <div className={styles.field}>
                <Plus className={styles.icon} size={14} strokeWidth={3} data-accent={accent} aria-hidden />
                <Combobox.Target>
                    <input
                        className={styles.input}
                        data-accent={accent}
                        value={query}
                        placeholder={placeholder}
                        aria-label={placeholder}
                        onFocus={() => combobox.openDropdown()}
                        onBlur={() => combobox.closeDropdown()}
                        onChange={(e) => {
                            setQuery(e.currentTarget.value)
                            combobox.openDropdown()
                        }}
                    />
                </Combobox.Target>
            </div>

            <Combobox.Dropdown className={styles.dropdown} data-accent={accent}>
                <Combobox.Options className={styles.options}>
                    {filtered.length === 0 && (
                        <Combobox.Empty className={styles.empty}>NO MATCH FOR “{query}”</Combobox.Empty>
                    )}
                    {filtered.map((option) => {
                        const isSelected = selected.includes(option.value)
                        return (
                            <Combobox.Option
                                key={option.value}
                                value={option.value}
                                className={styles.option}
                                data-selected={isSelected || undefined}
                            >
                                <span>
                                    {facet === 'nationality' && <Flag code={option.value} />}
                                    {option.label.toUpperCase()}
                                </span>
                                {isSelected && <Check className={styles.check} size={13} strokeWidth={3} aria-hidden />}
                            </Combobox.Option>
                        )
                    })}
                </Combobox.Options>
            </Combobox.Dropdown>
        </Combobox>
    )
}
