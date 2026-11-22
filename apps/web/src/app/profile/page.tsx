import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ApiUnavailable } from '@/components/api-unavailable';
import { PageHeader } from '@/components/layout/page-header';
import { AvatarUploader } from '@/components/profile/avatar-uploader';
import { LoyaltyCard } from '@/components/profile/loyalty-card';
import { LoyaltyPanel } from '@/components/profile/loyalty-panel';
import { OffersSection } from '@/components/profile/offers-section';
import { apiClient } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Профіль' };

export default async function ProfilePage() {
  const token = await getAccessToken();
  if (!token) redirect('/login?next=/profile');

  const api = apiClient(token);
  const result = await Promise.all([
    api.GET('/api/me'),
    api.GET('/api/sports'),
    api.GET('/api/me/loyalty'),
    api.GET('/api/me/offers'),
  ]).catch(() => null);
  if (result?.[0].response.status === 401) redirect('/login?next=/profile');
  const profile = result?.[0].data;
  const sports = result?.[1].data ?? [];
  const loyalty = result?.[2].data;
  const offers = result?.[3].data;

  return (
    <>
      <PageHeader
        eyebrow="Особистий кабінет"
        title={profile?.fullName ? `Вітаємо, ${profile.fullName.split(' ')[0]}!` : 'Профіль'}
        lead={profile?.email}
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8">
        {!profile ? (
          <ApiUnavailable />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
            <aside className="space-y-6">
              <AvatarUploader profile={profile} />
              <LoyaltyCard profile={profile} />
              <p className="text-sm text-muted-foreground">
                1 бал = 1 гривня знижки на наступне бронювання.
              </p>
              {loyalty && <LoyaltyPanel loyalty={loyalty} />}
            </aside>
            <section className="rounded-3xl border bg-card p-6 sm:p-8">
              <h2 className="mb-6 text-2xl font-bold">Особисті дані та вподобання</h2>
              <ProfileForm profile={profile} sports={sports} />
            </section>
          </div>
        )}
        {offers && (
          <div className="mt-12">
            <OffersSection offers={offers} />
          </div>
        )}
      </div>
    </>
  );
}
