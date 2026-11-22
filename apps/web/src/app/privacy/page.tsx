import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PageHeader } from '@/components/layout/page-header';

export const metadata: Metadata = {
  title: 'Політика конфіденційності',
  description: 'Які дані збирає SportHub, навіщо, де вони зберігаються і як їх видалити.',
};

const UPDATED = '22 листопада 2026 р.';
const REPOSITORY = 'https://github.com/yuriivynar/sports-booking-service';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="space-y-3 leading-relaxed text-muted-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Документи"
        title="Політика конфіденційності"
        lead={`SportHub — навчальний курсовий проєкт. Тут коротко й чесно про те, які дані він обробляє. Оновлено ${UPDATED}`}
      />
      <article className="mx-auto w-full max-w-3xl space-y-10 px-4 py-10">
        <Section title="Хто обробляє дані">
          <p>
            Сервіс створено як курсовий проєкт з дисципліни «Документування програмного забезпечення
            та шаблони проектування» (НУ «Львівська політехніка»). Він не є комерційним: оплата
            імітується, справжні гроші не списуються.
          </p>
        </Section>

        <Section title="Які дані ми збираємо">
          <ul>
            <li>
              <strong>Обліковий запис:</strong> email, а під час входу через Google — також імʼя та
              фото профілю Google.
            </li>
            <li>
              <strong>Профіль, який ви заповнюєте самі:</strong> імʼя, телефон, назва компанії (для
              корпоративного абонемента), улюблені види спорту, рівень підготовки, фото профілю,
              згода на листи.
            </li>
            <li>
              <strong>Дії в сервісі:</strong> бронювання, абонементи, бонусні бали, сповіщення та
              записи про імітовані оплати (сума, статус, службовий номер операції).
            </li>
          </ul>
          <p>
            <strong>Дані банківської картки не зберігаються.</strong> Номер, строк дії та CVC
            передаються лише в імітований платіжний модуль для перевірки й одразу відкидаються.
          </p>
        </Section>

        <Section title="Навіщо">
          <ul>
            <li>щоб ви могли входити, бронювати зали й заняття та купувати абонементи;</li>
            <li>
              щоб надсилати підтвердження, нагадування за 24 і 2 години та повідомлення про
              скасування;
            </li>
            <li>
              щоб нараховувати бонусні бали й визначати рівень лояльності (Standard, Premium,
              Corporate);
            </li>
            <li>
              щоб повідомляти про нові секції та акції з видів спорту, які ви обрали в профілі, а
              також про загальномережеві акції. Вимкнути листи можна в профілі.
            </li>
          </ul>
          <p>Ми не продаємо дані, не показуємо рекламу й не використовуємо аналітику.</p>
        </Section>

        <Section title="Дані з Google">
          <p>
            Вхід через Google запитує лише базовий профіль: email, імʼя та фото. Ми не маємо доступу
            до вашої пошти, контактів чи файлів. Використання інформації, отриманої з API Google,
            відповідає{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-ink underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              Google API Services User Data Policy
            </a>
            , зокрема вимогам Limited Use: ці дані використовуються тільки для входу й показу вашого
            профілю і нікому не передаються.
          </p>
        </Section>

        <Section title="Де зберігаються дані">
          <ul>
            <li>
              <strong>Supabase</strong> (база даних, вхід і файли) — сервери в Ірландії (ЄС).
            </li>
            <li>
              <strong>Vercel</strong> — хостинг сайту й API; у технічних журналах запитів недовго
              зберігаються IP-адреса та адреса сторінки.
            </li>
            <li>
              <strong>Google</strong> — лише як спосіб входу, якщо ви його обрали.
            </li>
            <li>
              <strong>Поштовий сервіс (SMTP)</strong> — отримує вашу адресу й текст листа, щоб
              доставити сповіщення, якщо листи увімкнено.
            </li>
          </ul>
          <p>Доступ до бази мають лише сервер API та адміністратор проєкту.</p>
        </Section>

        <Section title="Файли cookie та локальне сховище">
          <p>
            Ми використовуємо лише необхідні cookie сесії Supabase, без яких неможливо залишатися в
            обліковому записі, і локальне сховище браузера для вибраної теми (світла чи темна).
            Рекламних і аналітичних cookie немає.
          </p>
        </Section>

        <Section title="Скільки зберігаємо та ваші права">
          <p>
            Дані зберігаються, доки існує обліковий запис. Ви можете будь-коли переглянути й
            виправити профіль на сторінці профілю, вимкнути листи або попросити видалити обліковий
            запис разом з усіма бронюваннями, сповіщеннями й бонусами.
          </p>
        </Section>

        <Section title="Звʼязок">
          <p>
            Питання щодо конфіденційності чи запит на видалення можна залишити у{' '}
            <a
              href={`${REPOSITORY}/issues`}
              className="text-ink underline underline-offset-4"
              target="_blank"
              rel="noreferrer"
            >
              розділі Issues репозиторію проєкту
            </a>
            . Розділ публічний, тож не пишіть там email чи інші особисті дані: достатньо попросити
            звʼязатися, і ми підкажемо, як безпечно підтвердити, що акаунт ваш. Про суттєві зміни
            цієї політики повідомимо на сайті.
          </p>
        </Section>
      </article>
    </>
  );
}
