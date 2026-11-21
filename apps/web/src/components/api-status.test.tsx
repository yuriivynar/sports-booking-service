import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiStatus } from './api-status';

describe('ApiStatus', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows "online" when the health check succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    render(<ApiStatus />);
    expect(await screen.findByText('API працює')).toBeInTheDocument();
  });

  it('shows "offline" when the API cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    render(<ApiStatus />);
    expect(await screen.findByText('API недоступний')).toBeInTheDocument();
  });
});
