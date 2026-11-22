import { CalendarCheck, Home, LayoutGrid, MapPinned, UserRound } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Головна', icon: Home, desktop: false },
  { href: '/catalog', label: 'Секції', icon: LayoutGrid, desktop: true },
  { href: '/centers', label: 'Центри', icon: MapPinned, desktop: true },
  { href: '/bookings', label: 'Бронювання', icon: CalendarCheck, desktop: true },
  { href: '/profile', label: 'Профіль', icon: UserRound, desktop: false },
] as const;

/** "/catalog" is active on "/catalog" and "/catalog/…", "/" only on the home page. */
export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
