import { describe, expect, it } from 'vitest'
import { normalizeSearchText } from '../../src/search/normalize-search-text.ts'

describe('normalizeSearchText', () => {
  it('lowercases and strips diacritics', () => {
    expect(normalizeSearchText('Özcan')).toBe('ozcan')
  })

  /* NFD decomposes base+combining pairs, and these are not pairs — every one of
     them is a single indivisible code point that survives the strip untouched.
     They are the whole reason the fold map exists. */
  it.each([
    ['Bjørn', 'bjorn'],
    ['Łukasz', 'lukasz'],
    ['Đorđe', 'dorde'],
    ['Weiß', 'weiss'],
    ['Æsa', 'aesa'],
    /* Not in the ticket's list, but the seed draws Turkish, Azerbaijani and
       Kurdish names, where dotless `ı` is in two names out of five and schwa is
       in more than one Azerbaijani name each. Without these two the dataset's
       own rows would be unsearchable. */
    ['Açıkalın', 'acikalin'],
    ['Ələkbərova', 'elekberova'],
    /* Akan open vowels, in 3% of the Ghanaian names the seed draws. */
    ['Ntiamoa-Akyeamfuɔ', 'ntiamoa-akyeamfuo'],
    ['Karikari-Akyerεko', 'karikari-akyereko'],
  ])('folds the letters NFD leaves intact: %s', (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected)
  })

  /* The typographic quotes are what French and Uzbek names actually carry — one
     Uzbek name in fourteen holds a `‘` or a `’`. A viewer types the straight
     apostrophe their keyboard has, so both have to land on it or the row is
     unreachable by the name printed on its own card. */
  it.each([
    ['Jeanne d’Arc', "jeanne d'arc"],
    ['Ulug‘bekov', "ulug'bekov"],
    ['E’zoza', "e'zoza"],
  ])('folds typographic quotes onto the apostrophe a keyboard types: %s', (input, expected) => {
    expect(normalizeSearchText(input)).toBe(expected)
  })

  /* The seed stores `first last` and the query term arrives as typed, so
     everything between the letters has to survive untouched — folding a space
     away would make the stored column unsearchable by full name. */
  it('leaves plain ASCII, spacing and punctuation alone', () => {
    expect(normalizeSearchText("Anne-Marie O'Brien")).toBe("anne-marie o'brien")
  })

  /* A viewer can paste an already-normalised name straight back into the search
     box, and #19 runs this over the term. A fold whose own output was foldable
     would shift the term out from under the stored column. */
  it('is a fixed point — normalising twice changes nothing', () => {
    const once = normalizeSearchText('Bjørn Łukasz Đorđe Weiß Æsa Özcan')

    expect(normalizeSearchText(once)).toBe(once)
  })
})
