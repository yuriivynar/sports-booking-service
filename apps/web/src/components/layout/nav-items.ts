import { CalendarCheck, Home, LayoutGrid, MapPinned, Ticket, UserRound } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Головна', icon: Home, desktop: false, mobile: true },
  { href: '/catalog', label: 'Секції', icon: LayoutGrid, desktop: true, mobile: true },
  { href: '/centers', label: 'Центри', icon: MapPinned, desktop: true, mobile: true },
  { href: '/memberships', label: 'Абонементи', icon: Ticket, desktop: true, mobile: false },
  { href: '/bookings', label: 'Бронювання', icon: CalendarCheck, desktop: true, mobile: true },
  // The bottom bar keeps five items; memberships are one tap away in the profile.
  { href: '/profile', label: 'Профіль', icon: UserRound, desktop: false, mobile: true },
] as const;

/** "/catalog" is active on "/catalog" and "/catalog/…", "/" only on the home page. */
export function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
