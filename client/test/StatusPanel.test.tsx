import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StatusPanel } from '../src/components/StatusPanel'

describe('StatusPanel', () => {
  it('shows the message', () => {
    render(<StatusPanel variant="empty" message="No users match these filters" />)

    expect(screen.getByText('No users match these filters')).toBeInTheDocument()
  })

  it('renders no button without an action', () => {
    render(<StatusPanel variant="empty" message="No users match these filters" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('invokes the action when the button is pressed', async () => {
    const onAction = vi.fn()
    render(
      <StatusPanel
        variant="error"
        message="Something went wrong"
        actionLabel="Retry"
        onAction={onAction}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))

    expect(onAction).toHaveBeenCalledOnce()
  })

  it('marks the error variant as an alert', () => {
    render(<StatusPanel variant="error" message="Something went wrong" />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
