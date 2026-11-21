import {
  Activity,
  Dumbbell,
  Flower2,
  Goal,
  HandFist,
  type LucideIcon,
  type LucideProps,
  Medal,
  Trophy,
  Volleyball,
  Waves,
} from 'lucide-react';

// The API stores the icon name; a static map keeps only these icons in the bundle.
const ICONS: Record<string, LucideIcon> = {
  goal: Goal,
  trophy: Trophy,
  volleyball: Volleyball,
  waves: Waves,
  'flower-2': Flower2,
  dumbbell: Dumbbell,
  'hand-fist': HandFist,
  medal: Medal,
};

export function SportIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Activity;
  return <Icon aria-hidden {...props} />;
}
