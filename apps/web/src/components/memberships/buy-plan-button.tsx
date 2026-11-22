'use client';

import { Loader2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage, type MembershipPlan } from '@/lib/api';
import { browserApi } from '@/lib/api/browser';

/** Creates an unpaid membership and opens its payment page. */
export function BuyPlanButton({ plan, signedIn }: { plan: MembershipPlan; signedIn: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const corporate = plan.kind === 'CORPORATE';

  if (!signedIn) {
    return (
      <Button asChild variant="outline" className="w-full">
        <Link href="/login?next=/memberships">Увійти, щоб купити</Link>
      </Button>
    );
  }

  async function buy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const companyName = String(new FormData(event.currentTarget).get('company') ?? '').trim();
    setPending(true);
    const result = await browserApi()
      .then((api) =>
        api.POST('/api/memberships', {
          body: { planId: plan.id, ...(corporate && { companyName }) },
        }),
      )
      .catch(() => null);
    if (!result?.data) {
      setPending(false);
      toast.error(
        result ? apiErrorMessage(result.error, 'Не вдалося оформити') : 'API недоступний',
      );
      return;
    }
    router.push(`/memberships/${result.data.id}`);
  }

  return (
    <form onSubmit={buy} className="space-y-3">
      {corporate && (
        <div className="space-y-1.5">
          <Label htmlFor={`company-${plan.id}`}>Компанія</Label>
          <Input
            id={`company-${plan.id}`}
            name="company"
            placeholder="Назва компанії-партнера"
            maxLength={100}
            required
          />
        </div>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <ShoppingBag aria-hidden />}
        Оформити
      </Button>
    </form>
  );
}
