import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ActiveFilters } from '../src/components/ActiveFilters'

const noop = () => {}

describe('ActiveFilters', () => {
  it('renders nothing when no filters are active', () => {
    const { container } = render(
      <ActiveFilters
        hobbies={[]}
        nationalities={[]}
        onRemoveHobby={noop}
        onRemoveNationality={noop}
        onClearAll={noop}
      />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  it('lists every active filter', () => {
    render(
      <ActiveFilters
        hobbies={['Chess']}
        nationalities={['British', 'Japanese']}
        onRemoveHobby={noop}
        onRemoveNationality={noop}
        onClearAll={noop}
      />,
    )

    expect(screen.getByRole('button', { name: 'Remove filter Chess' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove filter British' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove filter Japanese' })).toBeInTheDocument()
  })

  it('removes the hobby that was clicked', async () => {
    const onRemoveHobby = vi.fn()
    render(
      <ActiveFilters
        hobbies={['Chess', 'Yoga']}
        nationalities={[]}
        onRemoveHobby={onRemoveHobby}
        onRemoveNationality={noop}
        onClearAll={noop}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Remove filter Yoga' }))

    expect(onRemoveHobby).toHaveBeenCalledWith('Yoga')
  })

  it('clears everything from the clear all button', async () => {
    const onClearAll = vi.fn()
    render(
      <ActiveFilters
        hobbies={['Chess']}
        nationalities={[]}
        onRemoveHobby={noop}
        onRemoveNationality={noop}
        onClearAll={onClearAll}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(onClearAll).toHaveBeenCalledOnce()
  })
})
