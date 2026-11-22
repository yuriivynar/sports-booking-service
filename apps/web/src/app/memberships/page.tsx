import type { Metadata } from 'next';
import { ApiUnavailable } from '@/components/api-unavailable';
import { PageHeader } from '@/components/layout/page-header';
import { MembershipCard } from '@/components/memberships/membership-card';
import { PlanCard } from '@/components/memberships/plan-card';
import { apiClient } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Абонементи',
  description: 'Разові, місячні та корпоративні абонементи SportHub.',
};

export default async function MembershipsPage() {
  const token = await getAccessToken();
  const api = apiClient(token ?? undefined);
  const [plans, mine] = await Promise.all([
    api
      .GET('/api/membership-plans')
      .then((r) => r.data)
      .catch(() => undefined),
    token
      ? api
          .GET('/api/memberships')
          .then((r) => r.data ?? [])
          .catch(() => [])
      : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Тарифи"
        title="Абонементи"
        lead="Платіть один раз і записуйтеся на групові заняття без оплати кожного візиту. Місячний абонемент дає картку Premium."
      />
      <div className="mx-auto w-full max-w-6xl space-y-12 px-4 py-8">
        {mine.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-2xl font-bold">Мої абонементи</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {mine.map((membership) => (
                <MembershipCard key={membership.id} membership={membership} />
              ))}
            </div>
          </section>
        )}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Оберіть тариф</h2>
          {!plans ? (
            <ApiUnavailable />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <PlanCard key={plan.id} plan={plan} signedIn={!!token} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
