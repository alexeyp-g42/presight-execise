import { useState } from 'react'
import { Collapse } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { ChevronDown } from 'lucide-react'
import type { FacetValue } from '@presight/schema'
import { type FacetKind, selectedFor, toggleFor, useFiltersStore } from '../../store/filters-store'
import { Flag } from '../flag/flag'
import styles from './facet-panel.module.scss'

interface FacetPanelProps {
    title: string
    /** Top 20 for the current result set. `value` is the id/code to filter by, `label` is shown. */
    facets: FacetValue[]
    /** Which filter list this panel drives. */
    facet: FacetKind
    accent: 'yellow' | 'pink'
}

/** Facet list with counts. Collapsible on mobile (< 641px); always open on md+. */
export function FacetPanel({ title, facets, facet, accent }: FacetPanelProps) {
    const selected = useFiltersStore(selectedFor[facet])
    const onToggle = useFiltersStore(toggleFor[facet])
    const isMdUp = useMediaQuery('(min-width: 641px)', false)
    const [open, setOpen] = useState(false)
    const opened = isMdUp || open

    return (
        <div className={styles.panel}>
            <button
                type="button"
                className={styles.header}
                onClick={() => setOpen((o) => !o)}
                aria-expanded={opened}
                disabled={isMdUp}
            >
                <span className={styles.title}>
                    {title} · {facets.length}
                </span>
                <ChevronDown
                    className={styles.caret}
                    size={15}
                    strokeWidth={2.5}
                    data-open={opened || undefined}
                    aria-hidden
                />
            </button>
            <Collapse expanded={opened}>
                <ul className={styles.rows}>
                    {facets.map((entry) => {
                        const isSelected = selected.includes(entry.value)
                        return (
                            <li key={entry.value}>
                                <button
                                    type="button"
                                    className={styles.row}
                                    data-selected={isSelected || undefined}
                                    data-accent={accent}
                                    aria-pressed={isSelected}
                                    onClick={() => onToggle(entry.value)}
                                >
                                    <span className={styles.name}>
                                        {isSelected && '● '}
                                        {facet === 'nationality' && <Flag code={entry.value} />}
                                        {entry.label}
                                    </span>
                                    <span className={styles.count} data-accent={accent}>
                                        {entry.count}
                                    </span>
                                </button>
                            </li>
                        )
                    })}
                    {facets.length === 0 && <li className={styles.none}>NO DATA</li>}
                </ul>
            </Collapse>
        </div>
    )
}
