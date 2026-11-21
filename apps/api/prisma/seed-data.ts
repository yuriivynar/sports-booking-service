// Demo catalog for the SportHub network in Lviv. All names, phone numbers and
// people are fictional. Prices are in hryvnias here; seed.ts converts them
// to kopecks.

import type {
  AgeGroup,
  HallKind,
  MembershipKind,
  SkillLevel,
} from '../src/generated/prisma/client.js';

export interface SportSeed {
  slug: string;
  name: string;
  icon: string;
}

export interface HallSeed {
  name: string;
  description: string;
  kind: HallKind;
  capacity: number;
  hourlyPriceUah: number;
  sports: string[];
}

export interface TrainerSeed {
  fullName: string;
  bio: string;
  experienceYears: number;
  sessionPriceUah: number;
  sports: string[];
}

export interface SectionSeed {
  name: string;
  description: string;
  sport: string;
  level: SkillLevel;
  ageGroup: AgeGroup;
  hall: string;
  trainer: string;
  capacity: number;
  sessionPriceUah: number;
  /** ISO weekdays: 1 = Monday ... 7 = Sunday. */
  weekdays: number[];
  /** Local start time, HH:MM. */
  startTime: string;
  durationMinutes: number;
}

export interface CenterSeed {
  slug: string;
  name: string;
  description: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  openHour: number;
  closeHour: number;
  halls: HallSeed[];
  trainers: TrainerSeed[];
  sections: SectionSeed[];
}

export interface PlanSeed {
  name: string;
  description: string;
  kind: MembershipKind;
  priceUah: number;
  durationDays: number | null;
  visits: number | null;
  sport?: string;
}

export interface PromotionSeed {
  title: string;
  description: string;
  discountPercent: number;
  sport?: string;
  center?: string;
  /** Offsets from the seed date, in days. */
  startsInDays: number;
  endsInDays: number;
}

export const SPORTS: SportSeed[] = [
  { slug: 'football', name: 'Футбол', icon: 'goal' },
  { slug: 'basketball', name: 'Баскетбол', icon: 'trophy' },
  { slug: 'volleyball', name: 'Волейбол', icon: 'volleyball' },
  { slug: 'swimming', name: 'Плавання', icon: 'waves' },
  { slug: 'yoga', name: 'Йога', icon: 'flower-2' },
  { slug: 'fitness', name: 'Фітнес', icon: 'dumbbell' },
  { slug: 'boxing', name: 'Бокс', icon: 'hand-fist' },
  { slug: 'tennis', name: 'Теніс', icon: 'medal' },
];

export const CENTERS: CenterSeed[] = [
  {
    slug: 'sporthub-tsentr',
    name: 'SportHub Центр',
    description:
      'Флагманський центр мережі в історичній частині міста: ігровий зал, зала йоги та сучасна тренажерна зала.',
    address: 'просп. Свободи, 22',
    latitude: 49.8429,
    longitude: 24.0269,
    phone: '+380 32 000 00 01',
    openHour: 7,
    closeHour: 22,
    halls: [
      {
        name: 'Ігровий зал',
        description: 'Зал 30×18 м з паркетом для міні-футболу, баскетболу та волейболу.',
        kind: 'COURT',
        capacity: 30,
        hourlyPriceUah: 900,
        sports: ['football', 'basketball', 'volleyball'],
      },
      {
        name: 'Зала йоги',
        description: 'Тиха світла зала з килимками, блоками та ременями.',
        kind: 'STUDIO',
        capacity: 20,
        hourlyPriceUah: 500,
        sports: ['yoga'],
      },
      {
        name: 'Тренажерна зала',
        description: 'Силові тренажери, вільні ваги та зона функціонального тренінгу.',
        kind: 'GYM',
        capacity: 25,
        hourlyPriceUah: 400,
        sports: ['fitness', 'boxing'],
      },
    ],
    trainers: [
      {
        fullName: 'Олена Коваль',
        bio: 'Сертифікована інструкторка хатха-йоги. Допомагає новачкам безпечно почати практику.',
        experienceYears: 8,
        sessionPriceUah: 600,
        sports: ['yoga'],
      },
      {
        fullName: 'Андрій Мельник',
        bio: 'Тренер з функціонального тренінгу та боксу, майстер спорту.',
        experienceYears: 10,
        sessionPriceUah: 700,
        sports: ['fitness', 'boxing'],
      },
      {
        fullName: 'Тарас Бондар',
        bio: 'Колишній гравець студентської ліги, тренує баскетбол і волейбол.',
        experienceYears: 6,
        sessionPriceUah: 650,
        sports: ['basketball', 'volleyball'],
      },
    ],
    sections: [
      {
        name: 'Йога для початківців',
        description: 'Базові асани, дихання та розтяжка. Підходить без підготовки.',
        sport: 'yoga',
        level: 'BEGINNER',
        ageGroup: 'ADULTS',
        hall: 'Зала йоги',
        trainer: 'Олена Коваль',
        capacity: 15,
        sessionPriceUah: 250,
        weekdays: [1, 3, 5],
        startTime: '08:00',
        durationMinutes: 60,
      },
      {
        name: 'Хатха-йога',
        description: 'Поглиблена практика для тих, хто вже знає основні асани.',
        sport: 'yoga',
        level: 'INTERMEDIATE',
        ageGroup: 'ADULTS',
        hall: 'Зала йоги',
        trainer: 'Олена Коваль',
        capacity: 15,
        sessionPriceUah: 280,
        weekdays: [2, 4],
        startTime: '19:00',
        durationMinutes: 75,
      },
      {
        name: 'Функціональний тренінг',
        description: 'Кругові тренування на силу та витривалість у малих групах.',
        sport: 'fitness',
        level: 'INTERMEDIATE',
        ageGroup: 'ADULTS',
        hall: 'Тренажерна зала',
        trainer: 'Андрій Мельник',
        capacity: 12,
        sessionPriceUah: 220,
        weekdays: [1, 3, 5],
        startTime: '19:00',
        durationMinutes: 60,
      },
      {
        name: 'Баскетбол для підлітків',
        description: 'Техніка ведення, передачі та командна гра для школярів.',
        sport: 'basketball',
        level: 'BEGINNER',
        ageGroup: 'TEENS',
        hall: 'Ігровий зал',
        trainer: 'Тарас Бондар',
        capacity: 16,
        sessionPriceUah: 200,
        weekdays: [2, 4],
        startTime: '16:00',
        durationMinutes: 90,
      },
    ],
  },
  {
    slug: 'sporthub-sykhiv',
    name: 'SportHub Сихів',
    description: 'Сімейний центр на Сихові з басейном, футбольним полем і фітнес-студією.',
    address: 'просп. Червоної Калини, 62',
    latitude: 49.7946,
    longitude: 24.0563,
    phone: '+380 32 000 00 02',
    openHour: 7,
    closeHour: 22,
    halls: [
      {
        name: 'Басейн 25 м',
        description: 'Шість доріжок, температура води 28 °C.',
        kind: 'POOL',
        capacity: 24,
        hourlyPriceUah: 1200,
        sports: ['swimming'],
      },
      {
        name: 'Футбольне поле',
        description: 'Поле зі штучним покриттям 40×20 м під накриттям.',
        kind: 'FIELD',
        capacity: 22,
        hourlyPriceUah: 1500,
        sports: ['football'],
      },
      {
        name: 'Фітнес-студія',
        description: 'Студія з дзеркалами для групових занять і стретчингу.',
        kind: 'STUDIO',
        capacity: 18,
        hourlyPriceUah: 450,
        sports: ['fitness', 'yoga'],
      },
    ],
    trainers: [
      {
        fullName: 'Ірина Шевчук',
        bio: 'Тренерка з плавання, працює з дітьми та старшою віковою групою.',
        experienceYears: 12,
        sessionPriceUah: 800,
        sports: ['swimming'],
      },
      {
        fullName: 'Максим Ткаченко',
        bio: 'Дитячий футбольний тренер, ліцензія УЄФА C.',
        experienceYears: 9,
        sessionPriceUah: 700,
        sports: ['football'],
      },
      {
        fullName: 'Софія Лисенко',
        bio: 'Інструкторка пілатесу та стретчингу.',
        experienceYears: 5,
        sessionPriceUah: 550,
        sports: ['fitness', 'yoga'],
      },
    ],
    sections: [
      {
        name: 'Плавання для дітей',
        description: 'Навчання плаванню з нуля для дітей 6–10 років.',
        sport: 'swimming',
        level: 'BEGINNER',
        ageGroup: 'KIDS',
        hall: 'Басейн 25 м',
        trainer: 'Ірина Шевчук',
        capacity: 10,
        sessionPriceUah: 230,
        weekdays: [1, 3, 5],
        startTime: '17:00',
        durationMinutes: 45,
      },
      {
        name: 'Аквааеробіка 55+',
        description: 'М’яке навантаження у воді для суглобів і серця.',
        sport: 'swimming',
        level: 'BEGINNER',
        ageGroup: 'SENIORS',
        hall: 'Басейн 25 м',
        trainer: 'Ірина Шевчук',
        capacity: 12,
        sessionPriceUah: 200,
        weekdays: [2, 4],
        startTime: '10:00',
        durationMinutes: 45,
      },
      {
        name: 'Дитячий футбол',
        description: 'Ігрові тренування для дітей 7–11 років.',
        sport: 'football',
        level: 'BEGINNER',
        ageGroup: 'KIDS',
        hall: 'Футбольне поле',
        trainer: 'Максим Ткаченко',
        capacity: 18,
        sessionPriceUah: 180,
        weekdays: [2, 4, 6],
        startTime: '16:00',
        durationMinutes: 60,
      },
      {
        name: 'Стретчинг і пілатес',
        description: 'Гнучкість, постава та м’язи кору.',
        sport: 'fitness',
        level: 'BEGINNER',
        ageGroup: 'ADULTS',
        hall: 'Фітнес-студія',
        trainer: 'Софія Лисенко',
        capacity: 14,
        sessionPriceUah: 220,
        weekdays: [1, 3],
        startTime: '18:30',
        durationMinutes: 60,
      },
    ],
  },
  {
    slug: 'sporthub-lychakiv',
    name: 'SportHub Личаків',
    description: 'Камерний центр біля Личаківського парку: бокс, теніс і йога.',
    address: 'вул. Личаківська, 110',
    latitude: 49.8355,
    longitude: 24.069,
    phone: '+380 32 000 00 03',
    openHour: 8,
    closeHour: 22,
    halls: [
      {
        name: 'Боксерський зал',
        description: 'Ринг, груші та зона для роботи в парах.',
        kind: 'GYM',
        capacity: 16,
        hourlyPriceUah: 600,
        sports: ['boxing', 'fitness'],
      },
      {
        name: 'Тенісний корт',
        description: 'Критий хардовий корт з освітленням.',
        kind: 'COURT',
        capacity: 4,
        hourlyPriceUah: 700,
        sports: ['tennis'],
      },
      {
        name: 'Зала йоги',
        description: 'Невелика зала з видом на парк.',
        kind: 'STUDIO',
        capacity: 15,
        hourlyPriceUah: 450,
        sports: ['yoga'],
      },
    ],
    trainers: [
      {
        fullName: 'Дмитро Кравець',
        bio: 'Майстер спорту з боксу, тренує підлітків і дорослих.',
        experienceYears: 11,
        sessionPriceUah: 750,
        sports: ['boxing'],
      },
      {
        fullName: 'Наталія Гнатюк',
        bio: 'Тренерка з тенісу, кандидатка в майстри спорту.',
        experienceYears: 7,
        sessionPriceUah: 800,
        sports: ['tennis'],
      },
      {
        fullName: 'Марта Савчук',
        bio: 'Веде ранкову йогу для людей будь-якого віку.',
        experienceYears: 6,
        sessionPriceUah: 550,
        sports: ['yoga'],
      },
    ],
    sections: [
      {
        name: 'Бокс: перші кроки',
        description: 'Стійка, базові удари та фізична підготовка для підлітків.',
        sport: 'boxing',
        level: 'BEGINNER',
        ageGroup: 'TEENS',
        hall: 'Боксерський зал',
        trainer: 'Дмитро Кравець',
        capacity: 12,
        sessionPriceUah: 240,
        weekdays: [1, 3, 5],
        startTime: '17:30',
        durationMinutes: 60,
      },
      {
        name: 'Бокс для дорослих',
        description: 'Інтенсивні тренування зі спарингами для досвідчених.',
        sport: 'boxing',
        level: 'ADVANCED',
        ageGroup: 'ADULTS',
        hall: 'Боксерський зал',
        trainer: 'Дмитро Кравець',
        capacity: 10,
        sessionPriceUah: 300,
        weekdays: [2, 4],
        startTime: '19:30',
        durationMinutes: 90,
      },
      {
        name: 'Теніс у парах',
        description: 'Парні тренування з тактикою гри.',
        sport: 'tennis',
        level: 'INTERMEDIATE',
        ageGroup: 'ADULTS',
        hall: 'Тенісний корт',
        trainer: 'Наталія Гнатюк',
        capacity: 4,
        sessionPriceUah: 450,
        weekdays: [6],
        startTime: '11:00',
        durationMinutes: 90,
      },
      {
        name: 'Ранкова йога 60+',
        description: 'Спокійна практика для гнучкості та рівноваги.',
        sport: 'yoga',
        level: 'BEGINNER',
        ageGroup: 'SENIORS',
        hall: 'Зала йоги',
        trainer: 'Марта Савчук',
        capacity: 12,
        sessionPriceUah: 200,
        weekdays: [2, 4],
        startTime: '09:00',
        durationMinutes: 60,
      },
    ],
  },
  {
    slug: 'sporthub-stryiskyi',
    name: 'SportHub Стрийський',
    description: 'Найбільший центр мережі біля Стрийського парку з 50-метровим басейном.',
    address: 'вул. Стрийська, 52',
    latitude: 49.815,
    longitude: 24.0255,
    phone: '+380 32 000 00 04',
    openHour: 6,
    closeHour: 22,
    halls: [
      {
        name: 'Басейн 50 м',
        description: 'Олімпійський басейн на вісім доріжок.',
        kind: 'POOL',
        capacity: 40,
        hourlyPriceUah: 1800,
        sports: ['swimming'],
      },
      {
        name: 'Ігровий зал',
        description: 'Зал для баскетболу та волейболу з трибуною.',
        kind: 'COURT',
        capacity: 30,
        hourlyPriceUah: 850,
        sports: ['basketball', 'volleyball'],
      },
      {
        name: 'Тренажерна зала',
        description: 'Велика зала з кардіозоною та кросфіт-рамою.',
        kind: 'GYM',
        capacity: 30,
        hourlyPriceUah: 400,
        sports: ['fitness'],
      },
    ],
    trainers: [
      {
        fullName: 'Олег Романюк',
        bio: 'Тренер збірної області з плавання.',
        experienceYears: 15,
        sessionPriceUah: 900,
        sports: ['swimming'],
      },
      {
        fullName: 'Василь Петрук',
        bio: 'Тренує баскетбол і волейбол для підлітків та аматорів.',
        experienceYears: 8,
        sessionPriceUah: 650,
        sports: ['basketball', 'volleyball'],
      },
      {
        fullName: 'Юлія Ярема',
        bio: 'Кросфіт-тренерка, сертифікат CF-L2.',
        experienceYears: 4,
        sessionPriceUah: 500,
        sports: ['fitness'],
      },
    ],
    sections: [
      {
        name: 'Спортивне плавання',
        description: 'Техніка всіх стилів і підготовка до змагань.',
        sport: 'swimming',
        level: 'ADVANCED',
        ageGroup: 'TEENS',
        hall: 'Басейн 50 м',
        trainer: 'Олег Романюк',
        capacity: 16,
        sessionPriceUah: 280,
        weekdays: [1, 3, 5],
        startTime: '07:00',
        durationMinutes: 90,
      },
      {
        name: 'Аматорський волейбол',
        description: 'Вечірні ігри для дорослих середнього рівня.',
        sport: 'volleyball',
        level: 'INTERMEDIATE',
        ageGroup: 'ADULTS',
        hall: 'Ігровий зал',
        trainer: 'Василь Петрук',
        capacity: 14,
        sessionPriceUah: 220,
        weekdays: [2, 4],
        startTime: '20:00',
        durationMinutes: 90,
      },
      {
        name: 'Кросфіт',
        description: 'Високоінтенсивні тренування для підготовлених.',
        sport: 'fitness',
        level: 'ADVANCED',
        ageGroup: 'ADULTS',
        hall: 'Тренажерна зала',
        trainer: 'Юлія Ярема',
        capacity: 12,
        sessionPriceUah: 250,
        weekdays: [1, 3, 5],
        startTime: '18:00',
        durationMinutes: 60,
      },
      {
        name: 'Баскетбол 3×3',
        description: 'Вуличний формат гри для підлітків.',
        sport: 'basketball',
        level: 'INTERMEDIATE',
        ageGroup: 'TEENS',
        hall: 'Ігровий зал',
        trainer: 'Василь Петрук',
        capacity: 12,
        sessionPriceUah: 200,
        weekdays: [6],
        startTime: '12:00',
        durationMinutes: 90,
      },
    ],
  },
];

export const PLANS: PlanSeed[] = [
  {
    name: 'Разове відвідування',
    description: 'Одне заняття будь-якої секції протягом 30 днів.',
    kind: 'SINGLE',
    priceUah: 250,
    durationDays: 30,
    visits: 1,
  },
  {
    name: 'Місячний: 8 занять',
    description: 'Вісім групових занять у будь-якому центрі мережі.',
    kind: 'MONTHLY',
    priceUah: 1100,
    durationDays: 30,
    visits: 8,
  },
  {
    name: 'Місячний безліміт',
    description: 'Необмежена кількість групових занять протягом місяця.',
    kind: 'MONTHLY',
    priceUah: 1500,
    durationDays: 30,
    visits: null,
  },
  {
    name: 'Басейн: 10 відвідувань',
    description: 'Десять занять з плавання протягом двох місяців.',
    kind: 'MONTHLY',
    priceUah: 1600,
    durationDays: 60,
    visits: 10,
    sport: 'swimming',
  },
  {
    name: 'Корпоративний',
    description: 'Безліміт для працівників компаній-партнерів, ціна за одну особу.',
    kind: 'CORPORATE',
    priceUah: 1200,
    durationDays: 30,
    visits: null,
  },
];

export const PROMOTIONS: PromotionSeed[] = [
  {
    title: 'Тиждень йоги: −20%',
    description: 'Знижка 20% на всі заняття з йоги в мережі.',
    discountPercent: 20,
    sport: 'yoga',
    startsInDays: -2,
    endsInDays: 12,
  },
  {
    title: 'Ранкове плавання на Стрийському',
    description: 'Мінус 15% на плавання в центрі SportHub Стрийський.',
    discountPercent: 15,
    sport: 'swimming',
    center: 'sporthub-stryiskyi',
    startsInDays: -5,
    endsInDays: 40,
  },
  {
    title: 'Зимовий старт',
    description: 'Знижка 10% на будь-яке бронювання до кінця акції.',
    discountPercent: 10,
    startsInDays: 0,
    endsInDays: 30,
  },
];
