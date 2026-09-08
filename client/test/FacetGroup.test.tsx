import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FacetGroup } from '../src/components/FacetGroup'

const values = [
  { value: 'Chess', count: 12 },
  { value: 'Yoga', count: 4 },
]

describe('FacetGroup', () => {
  it('shows each value with its count', () => {
    render(
      <FacetGroup title="Hobbies" values={values} selected={[]} onToggle={() => {}} isStale={false} />,
    )

    expect(screen.getByText('Chess')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('marks selected values as pressed', () => {
    render(
      <FacetGroup
        title="Hobbies"
        values={values}
        selected={['Chess']}
        onToggle={() => {}}
        isStale={false}
      />,
    )

    expect(screen.getByRole('button', { name: /Chess/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /Yoga/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('reports the toggled value', async () => {
    const onToggle = vi.fn()
    render(
      <FacetGroup title="Hobbies" values={values} selected={[]} onToggle={onToggle} isStale={false} />,
    )

    await userEvent.click(screen.getByRole('button', { name: /Yoga/ }))

    expect(onToggle).toHaveBeenCalledWith('Yoga')
  })

  it('shows a placeholder when the group is empty', () => {
    render(<FacetGroup title="Hobbies" values={[]} selected={[]} onToggle={() => {}} isStale={false} />)

    expect(screen.getByText('No matching hobbies')).toBeInTheDocument()
  })
})
