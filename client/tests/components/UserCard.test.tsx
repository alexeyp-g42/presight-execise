import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from '../../src/components/UserCard';
import type { UserDTO } from '@shared/types';

const base: UserDTO = {
  id: 1,
  avatar: 'https://example.com/a.png',
  first_name: 'Ada',
  last_name: 'Lovelace',
  age: 36,
  nationality: 'United Kingdom',
  hobbies: [],
};

describe('UserCard', () => {
  it('renders name, nationality, age', () => {
    render(<UserCard user={base} />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('United Kingdom')).toBeInTheDocument();
    expect(screen.getByText('36')).toBeInTheDocument();
  });

  it('shows all hobbies when ≤ 2', () => {
    render(<UserCard user={{ ...base, hobbies: ['chess', 'go'] }} />);
    expect(screen.getByText('chess')).toBeInTheDocument();
    expect(screen.getByText('go')).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).not.toBeInTheDocument();
  });

  it('shows 2 hobbies + overflow when > 2', () => {
    render(<UserCard user={{ ...base, hobbies: ['a', 'b', 'c', 'd'] }} />);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
    expect(screen.queryByText('c')).not.toBeInTheDocument();
  });
});
