// Demo photos from Unsplash (https://unsplash.com/license: free to use, no
// permission needed). scripts/upload-seed-photos.ts copies them into the
// Supabase Storage bucket; seed.ts links them to sports, centers and halls.

export interface SeedPhoto {
  /** Path inside the "media" bucket. */
  path: string;
  /** Image id on images.unsplash.com. */
  image: string;
  pageUrl: string;
  photographer: string;
}

export const MEDIA_BUCKET = 'media';

export const HERO_PHOTO: SeedPhoto = {
  path: 'seed/hero.jpg',
  image: 'photo-1517836357463-d25dfeac3438',
  pageUrl: 'https://unsplash.com/photos/WvDYdXDzkhs',
  photographer: 'Victor Freitas',
};

export const SPORT_PHOTOS: Record<string, SeedPhoto> = {
  football: {
    path: 'seed/sports/football.jpg',
    image: 'photo-1587384474964-3a06ce1ce699',
    pageUrl: 'https://unsplash.com/photos/otuM-nw-_NY',
    photographer: 'Pascal Swier',
  },
  basketball: {
    path: 'seed/sports/basketball.jpg',
    image: 'photo-1546519638-68e109498ffc',
    pageUrl: 'https://unsplash.com/photos/BfphcCvhl6E',
    photographer: 'Markus Spiske',
  },
  volleyball: {
    path: 'seed/sports/volleyball.jpg',
    image: 'photo-1666901356149-93f2eb3ba5a2',
    pageUrl: 'https://unsplash.com/photos/pYHFDv6vI-o',
    photographer: 'Çağlar Oskay',
  },
  swimming: {
    path: 'seed/sports/swimming.jpg',
    image: 'photo-1487491506942-373c8f7a7ad5',
    pageUrl: 'https://unsplash.com/photos/G8OyN_tOIwY',
    photographer: 'CHUTTERSNAP',
  },
  yoga: {
    path: 'seed/sports/yoga.jpg',
    image: 'photo-1687783615494-b4a1f1af8b58',
    pageUrl: 'https://unsplash.com/photos/dwka5DDrnY0',
    photographer: 'Olga Pukhalskaya',
  },
  fitness: {
    path: 'seed/sports/fitness.jpg',
    image: 'photo-1517838277536-f5f99be501cd',
    pageUrl: 'https://unsplash.com/photos/hOuJYX2K5DA',
    photographer: 'Victor Freitas',
  },
  boxing: {
    path: 'seed/sports/boxing.jpg',
    image: 'photo-1716307043003-dbe6a5cc496e',
    pageUrl: 'https://unsplash.com/photos/TeL4E6S5BQU',
    photographer: 'Temple Noble Art',
  },
  tennis: {
    path: 'seed/sports/tennis.jpg',
    image: 'photo-1639161775388-db5b5d5cc9eb',
    pageUrl: 'https://unsplash.com/photos/2XPHSXVT_Ls',
    photographer: 'Simone Viani',
  },
};

export const CENTER_PHOTOS: Record<string, SeedPhoto> = {
  'sporthub-tsentr': {
    path: 'seed/centers/sporthub-tsentr.jpg',
    image: 'photo-1689877020200-403d8542d95d',
    pageUrl: 'https://unsplash.com/photos/1RNQ11ZODJM',
    photographer: 'Rick Barrett',
  },
  'sporthub-sykhiv': {
    path: 'seed/centers/sporthub-sykhiv.jpg',
    image: 'photo-1775993167393-f2add1f8eec2',
    pageUrl: 'https://unsplash.com/photos/AILEpOyczIk',
    photographer: 'Palak Pitroda',
  },
  'sporthub-lychakiv': {
    path: 'seed/centers/sporthub-lychakiv.jpg',
    image: 'photo-1771909716747-346cb2b09329',
    pageUrl: 'https://unsplash.com/photos/_XlTp6nHbm0',
    photographer: 'ARTO SURAJ',
  },
  'sporthub-stryiskyi': {
    path: 'seed/centers/sporthub-stryiskyi.jpg',
    image: 'photo-1782958995190-75701221aab4',
    pageUrl: 'https://unsplash.com/photos/7D9d-2hnOho',
    photographer: 'Andy Wang',
  },
};

export const ALL_PHOTOS: SeedPhoto[] = [
  HERO_PHOTO,
  ...Object.values(SPORT_PHOTOS),
  ...Object.values(CENTER_PHOTOS),
];

/** Public URL of a seed photo, or null when Supabase is not configured (for example in CI). */
export function publicPhotoUrl(photo: SeedPhoto | undefined): string | null {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  return photo && base ? `${base}/storage/v1/object/public/${MEDIA_BUCKET}/${photo.path}` : null;
}
