import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { UserCard } from '../src/components/UserCard'
import type { User } from '../src/api/types'

const base: User = {
  id: 1,
  avatar: 'https://example.test/ada.png',
  first_name: 'Ada',
  last_name: 'Byron',
  age: 36,
  nationality: 'British',
  hobbies: [],
}

describe('UserCard', () => {
  it('shows the full name, nationality and age', () => {
    render(<UserCard user={base} />)

    expect(screen.getByText('Ada Byron')).toBeInTheDocument()
    expect(screen.getByText('British')).toBeInTheDocument()
    expect(screen.getByText('36')).toBeInTheDocument()
  })

  it('renders every hobby when there are two or fewer', () => {
    render(<UserCard user={{ ...base, hobbies: ['Chess', 'Yoga'] }} />)

    expect(screen.getByText('Chess')).toBeInTheDocument()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('renders two hobbies and a remainder badge when there are more', () => {
    render(<UserCard user={{ ...base, hobbies: ['Chess', 'Yoga', 'Sailing', 'Baking', 'Piano'] }} />)

    expect(screen.getByText('Chess')).toBeInTheDocument()
    expect(screen.getByText('Yoga')).toBeInTheDocument()
    expect(screen.queryByText('Sailing')).not.toBeInTheDocument()
    expect(screen.getByText('+3')).toBeInTheDocument()
  })

  it('renders no hobby chips when the user has none', () => {
    render(<UserCard user={base} />)

    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument()
  })

  it('labels the avatar with the full name', () => {
    render(<UserCard user={base} />)

    expect(screen.getByAltText('Ada Byron')).toBeInTheDocument()
  })
})
