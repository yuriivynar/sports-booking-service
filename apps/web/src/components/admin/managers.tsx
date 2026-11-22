'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { CenterForm, HallForm, SectionForm, TrainerForm } from '@/components/admin/catalog-forms';
import { CrudList } from '@/components/admin/crud-list';
import { PlanForm, PromotionForm } from '@/components/admin/offer-forms';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type {
  AdminCenter,
  AdminHall,
  AdminPlan,
  AdminPromotion,
  AdminSection,
  AdminTrainer,
  Sport,
} from '@/lib/api';
import { browserApi } from '@/lib/api/browser';
import {
  AGE_GROUP_LABELS,
  formatDate,
  formatPrice,
  HALL_KIND_LABELS,
  LEVEL_LABELS,
  MEMBERSHIP_KIND_LABELS,
  pluralize,
} from '@/lib/format';

const remove = (path: Parameters<typeof deletePath>[0]) => (item: { id: string }) =>
  deletePath(path, item.id);

async function deletePath(
  path:
    | '/api/admin/centers/{id}'
    | '/api/admin/halls/{id}'
    | '/api/admin/trainers/{id}'
    | '/api/admin/sections/{id}'
    | '/api/admin/promotions/{id}'
    | '/api/admin/plans/{id}',
  id: string,
) {
  const api = await browserApi();
  return api.DELETE(path, { params: { path: { id } } });
}

export function CentersManager({ centers }: { centers: AdminCenter[] }) {
  return (
    <CrudList
      items={centers}
      addLabel="Новий центр"
      empty="Центрів ще немає"
      remove={remove('/api/admin/centers/{id}')}
      renderRow={(center) => (
        <div className="space-y-1">
          <Link
            href={`/admin/centers/${center.id}`}
            className="group inline-flex items-center gap-1 text-lg font-semibold hover:text-ink"
          >
            {center.name}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="text-sm text-muted-foreground">
            {center.address} · {center.openHour}:00–{center.closeHour}:00
          </p>
          <p className="text-sm">
            {pluralize(center.hallCount, ['зал', 'зали', 'залів'])} ·{' '}
            {pluralize(center.trainerCount, ['тренер', 'тренери', 'тренерів'])} ·{' '}
            {pluralize(center.sectionCount, ['секція', 'секції', 'секцій'])}
          </p>
        </div>
      )}
      renderForm={(center, close) => <CenterForm item={center} onDone={close} />}
    />
  );
}

/** Halls, trainers and sections of one center, in tabs. */
export function CenterContents({
  centerId,
  halls,
  trainers,
  sections,
  sports,
}: {
  centerId: string;
  halls: AdminHall[];
  trainers: AdminTrainer[];
  sections: AdminSection[];
  sports: Sport[];
}) {
  return (
    <Tabs defaultValue="sections">
      <TabsList>
        <TabsTrigger value="sections">Секції · {sections.length}</TabsTrigger>
        <TabsTrigger value="halls">Зали · {halls.length}</TabsTrigger>
        <TabsTrigger value="trainers">Тренери · {trainers.length}</TabsTrigger>
      </TabsList>
      <TabsContent value="sections" className="pt-4">
        <CrudList
          items={sections}
          addLabel="Нова секція"
          empty="Секцій ще немає"
          remove={remove('/api/admin/sections/{id}')}
          renderRow={(section) => (
            <div className="space-y-1">
              <p className="text-lg font-semibold">{section.name}</p>
              <p className="text-sm text-muted-foreground">
                {section.sport.name} · {LEVEL_LABELS[section.level]} ·{' '}
                {AGE_GROUP_LABELS[section.ageGroup]} · {formatPrice(section.sessionPrice)}
              </p>
              <p className="text-sm">
                {section.trainer?.fullName ?? 'Без тренера'} ·{' '}
                {pluralize(section.upcomingSessions, [
                  'майбутнє заняття',
                  'майбутні заняття',
                  'майбутніх занять',
                ])}
              </p>
            </div>
          )}
          renderForm={(section, close) => (
            <SectionForm
              item={section}
              onDone={close}
              centerId={centerId}
              sports={sports}
              trainers={trainers}
            />
          )}
        />
      </TabsContent>
      <TabsContent value="halls" className="pt-4">
        <CrudList
          items={halls}
          addLabel="Новий зал"
          empty="Залів ще немає"
          remove={remove('/api/admin/halls/{id}')}
          renderRow={(hall) => (
            <div className="space-y-1">
              <p className="text-lg font-semibold">{hall.name}</p>
              <p className="text-sm text-muted-foreground">
                {HALL_KIND_LABELS[hall.kind]} · до {hall.capacity} осіб ·{' '}
                {formatPrice(hall.hourlyPrice)}/год
              </p>
              <p className="text-sm">{hall.sports.map((s) => s.name).join(', ')}</p>
            </div>
          )}
          renderForm={(hall, close) => (
            <HallForm item={hall} onDone={close} centerId={centerId} sports={sports} />
          )}
        />
      </TabsContent>
      <TabsContent value="trainers" className="pt-4">
        <CrudList
          items={trainers}
          addLabel="Новий тренер"
          empty="Тренерів ще немає"
          remove={remove('/api/admin/trainers/{id}')}
          renderRow={(trainer) => (
            <div className="space-y-1">
              <p className="text-lg font-semibold">{trainer.fullName}</p>
              <p className="text-sm text-muted-foreground">
                {pluralize(trainer.experienceYears, ['рік', 'роки', 'років'])} досвіду ·{' '}
                {formatPrice(trainer.sessionPrice)}/год
              </p>
              <p className="text-sm">{trainer.sports.map((s) => s.name).join(', ')}</p>
            </div>
          )}
          renderForm={(trainer, close) => (
            <TrainerForm item={trainer} onDone={close} centerId={centerId} sports={sports} />
          )}
        />
      </TabsContent>
    </Tabs>
  );
}

export function PromotionsManager({
  promotions,
  sports,
  centers,
}: {
  promotions: AdminPromotion[];
  sports: Sport[];
  centers: AdminCenter[];
}) {
  return (
    <CrudList
      items={promotions}
      addLabel="Нова акція"
      empty="Акцій ще немає"
      remove={remove('/api/admin/promotions/{id}')}
      renderRow={(promotion) => (
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            −{promotion.discountPercent}% · {promotion.title}
          </p>
          <p className="text-sm text-muted-foreground">
            {promotion.sport?.name ?? 'Усі види спорту'} · {promotion.center?.name ?? 'уся мережа'}
          </p>
          <p className="text-sm">
            {formatDate(promotion.startsAt)} — {formatDate(promotion.endsAt)}
          </p>
        </div>
      )}
      renderForm={(promotion, close) => (
        <PromotionForm item={promotion} onDone={close} sports={sports} centers={centers} />
      )}
    />
  );
}

export function PlansManager({
  plans,
  sports,
  centers,
}: {
  plans: AdminPlan[];
  sports: Sport[];
  centers: AdminCenter[];
}) {
  return (
    <CrudList
      items={plans}
      addLabel="Новий тариф"
      empty="Тарифів ще немає"
      remove={remove('/api/admin/plans/{id}')}
      renderRow={(plan) => (
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            {plan.name} · {formatPrice(plan.price)}
          </p>
          <p className="text-sm text-muted-foreground">
            {MEMBERSHIP_KIND_LABELS[plan.kind]} ·{' '}
            {plan.durationDays
              ? pluralize(plan.durationDays, ['день', 'дні', 'днів'])
              : 'безстроковий'}{' '}
            ·{' '}
            {plan.visits
              ? pluralize(plan.visits, ['відвідування', 'відвідування', 'відвідувань'])
              : 'безліміт'}
          </p>
          <p className="text-sm">
            {plan.sport?.name ?? 'Будь-який спорт'} · {plan.center?.name ?? 'уся мережа'} · продано:{' '}
            {plan.soldCount}
          </p>
        </div>
      )}
      renderForm={(plan, close) => (
        <PlanForm item={plan} onDone={close} sports={sports} centers={centers} />
      )}
    />
  );
}
