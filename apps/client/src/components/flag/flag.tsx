import styles from './flag.module.scss'

/** Offset of 🇦 (REGIONAL INDICATOR SYMBOL LETTER A) from 'A'. */
const REGIONAL_INDICATOR_A = 0x1f1e6
const LETTER_A = 'A'.charCodeAt(0)

/**
 * ISO 3166-1 alpha-2 code -> flag emoji, e.g. `us` -> 🇺🇸.
 *
 * A flag emoji is just the country's two letters written as regional indicator symbols, so this
 * covers every code the API can return without a hand-maintained icon list. Returns an empty
 * string for anything that is not two ASCII letters.
 */
export function flagEmoji(code: string): string {
    if (!/^[a-z]{2}$/i.test(code)) return ''

    return String.fromCodePoint(
        ...[...code.toUpperCase()].map((letter) => REGIONAL_INDICATOR_A + letter.charCodeAt(0) - LETTER_A),
    )
}

interface FlagProps {
    /** ISO 3166-1 alpha-2 country code. */
    code: string
}

/**
 * Decorative only — every use sits next to the country's name, so announcing the flag as well
 * would just repeat it.
 */
export function Flag({ code }: FlagProps) {
    const emoji = flagEmoji(code)
    if (!emoji) return null

    return (
        <span className={styles.flag} aria-hidden>
            {emoji}
        </span>
    )
}
