import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacetList } from '../../src/components/FacetList';

describe('FacetList', () => {
  it('renders entries with counts', () => {
    render(<FacetList title="Hobbies" entries={[{ value: 'chess', count: 5 }]} selected={[]} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /chess/ })).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('reflects selection via aria-pressed', () => {
    render(<FacetList title="Hobbies" entries={[{ value: 'chess', count: 5 }]} selected={['chess']} onToggle={() => {}} />);
    expect(screen.getByRole('button', { name: /chess/ })).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls onToggle with value on click', async () => {
    const onToggle = vi.fn();
    render(<FacetList title="Hobbies" entries={[{ value: 'chess', count: 5 }]} selected={[]} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button', { name: /chess/ }));
    expect(onToggle).toHaveBeenCalledWith('chess');
  });
});
