'use client';

import { useEffect } from 'react';
import { celebrate } from './celebrate';

/** Fires the confetti once when a free booking lands on its page. */
export function CelebrateOnMount() {
  useEffect(() => {
    void celebrate();
  }, []);
  return null;
}
