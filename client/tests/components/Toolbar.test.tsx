import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toolbar } from '../../src/components/Toolbar';

describe('Toolbar', () => {
  it('debounces text input', () => {
    vi.useFakeTimers();
    try {
      const onQ = vi.fn();
      render(<Toolbar q="" sort="last_name" dir="asc" onQChange={onQ} onSortChange={() => {}} onDirChange={() => {}} />);
      const input = screen.getByLabelText('Search by name') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'a' } });
      expect(onQ).not.toHaveBeenCalled();
      vi.advanceTimersByTime(350);
      expect(onQ).toHaveBeenCalledWith('a');
    } finally {
      vi.useRealTimers();
    }
  });

  it('fires onSortChange when sort field changes', async () => {
    const onSort = vi.fn();
    const user = userEvent.setup();
    render(<Toolbar q="" sort="last_name" dir="asc" onQChange={() => {}} onSortChange={onSort} onDirChange={() => {}} />);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'age');
    expect(onSort).toHaveBeenCalledWith('age');
  });

  it('fires onDirChange on toggle', async () => {
    const onDir = vi.fn();
    const user = userEvent.setup();
    render(<Toolbar q="" sort="last_name" dir="asc" onQChange={() => {}} onSortChange={() => {}} onDirChange={onDir} />);
    await user.click(screen.getByRole('button', { name: /toggle sort direction/i }));
    expect(onDir).toHaveBeenCalledWith('desc');
  });
});
