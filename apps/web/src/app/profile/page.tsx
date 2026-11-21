import { Award, Coins } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ApiUnavailable } from '@/components/api-unavailable';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { ProfileForm } from './profile-form';

export const metadata: Metadata = { title: 'Профіль' };

const TIER_LABELS = { STANDARD: 'Standard', PREMIUM: 'Premium', CORPORATE: 'Corporate' } as const;

export default async function ProfilePage() {
  const token = await getAccessToken();
  if (!token) redirect('/login?next=/profile');

  const api = apiClient(token);
  const result = await Promise.all([api.GET('/api/me'), api.GET('/api/sports')]).catch(() => null);
  if (result?.[0].response.status === 401) redirect('/login?next=/profile');
  const [profile, sports] = result ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Профіль</h1>
      {!profile?.data ? (
        <ApiUnavailable />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Award className="size-8 text-primary" aria-hidden />
                <div>
                  <CardDescription>Картка лояльності</CardDescription>
                  <CardTitle>{TIER_LABELS[profile.data.loyaltyTier]}</CardTitle>
                </div>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center gap-3 space-y-0">
                <Coins className="size-8 text-primary" aria-hidden />
                <div>
                  <CardDescription>Бонусні бали</CardDescription>
                  <CardTitle>{profile.data.bonusBalance}</CardTitle>
                </div>
              </CardHeader>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Особисті дані та вподобання</CardTitle>
              <CardDescription>{profile.data.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile.data} sports={sports?.data ?? []} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
