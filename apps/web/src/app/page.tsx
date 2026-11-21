import { ArrowRight, BadgePercent, MapPinned } from 'lucide-react';
import Link from 'next/link';
import { ApiUnavailable } from '@/components/api-unavailable';
import { CenterCard } from '@/components/catalog/center-card';
import { SportIcon } from '@/components/sport-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api';
import { formatDay } from '@/lib/format';

export default async function HomePage() {
  const api = apiClient();
  const data = await Promise.all([
    api.GET('/api/sports'),
    api.GET('/api/promotions'),
    api.GET('/api/centers'),
  ]).catch(() => null);
  const [sports, promotions, centers] = data ?? [];

  return (
    <>
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-16 sm:py-24">
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Спорт у Львові: зали, секції та тренери в одному місці
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            Бронюйте зал на годину, записуйтеся на групові заняття або займайтеся з персональним
            тренером. Отримуйте бонуси за кожне бронювання.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href="/catalog">
                Знайти секцію <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/centers">
                <MapPinned /> Центри на карті
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl space-y-14 px-4 py-14">
        {!data ? (
          <ApiUnavailable />
        ) : (
          <>
            <section className="space-y-4">
              <h2 className="text-2xl font-semibold">Види спорту</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {sports?.data?.map((sport) => (
                  <Link
                    key={sport.slug}
                    href={`/catalog?sport=${sport.slug}`}
                    className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted"
                  >
                    <SportIcon name={sport.icon} className="size-6 text-primary" />
                    <span className="font-medium">{sport.name}</span>
                  </Link>
                ))}
              </div>
            </section>

            {promotions?.data && promotions.data.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-semibold">Акції</h2>
                <div className="grid gap-4 md:grid-cols-3">
                  {promotions.data.map((promo) => (
                    <Card key={promo.id} className="border-primary/30">
                      <CardHeader>
                        <div className="flex items-center gap-2 text-primary">
                          <BadgePercent className="size-5" aria-hidden />
                          <span className="text-2xl font-semibold">−{promo.discountPercent}%</span>
                        </div>
                        <CardTitle className="text-lg">{promo.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>{promo.description}</p>
                        <p>Діє до {formatDay(promo.endsAt)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            <section className="space-y-4">
              <div className="flex items-end justify-between">
                <h2 className="text-2xl font-semibold">Наші центри</h2>
                <Link href="/centers" className="text-sm text-primary hover:underline">
                  Показати на карті
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {centers?.data?.map((center) => (
                  <CenterCard key={center.slug} center={center} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  );
}
