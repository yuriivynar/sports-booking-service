'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

/** Switches between light and dark. Both icons are rendered and swapped with CSS, so there is no hydration mismatch. */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Змінити тему"
      title="Світла / темна тема"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="size-5 rotate-0 scale-100 transition-transform duration-500 ease-(--ease-spring) dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-5 rotate-90 scale-0 transition-transform duration-500 ease-(--ease-spring) dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
