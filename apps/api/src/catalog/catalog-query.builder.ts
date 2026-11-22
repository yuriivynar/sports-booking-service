import type { AgeGroup, Prisma, SkillLevel } from '../generated/prisma/client.js';

export const SECTION_SORTS = ['name', 'price-asc', 'price-desc'] as const;
export type SectionSort = (typeof SECTION_SORTS)[number];

export const DEFAULT_PAGE_SIZE = 12;
export const MAX_PAGE_SIZE = 50;

const ORDER: Record<SectionSort, Prisma.SectionOrderByWithRelationInput[]> = {
  name: [{ name: 'asc' }],
  'price-asc': [{ sessionPrice: 'asc' }, { name: 'asc' }],
  'price-desc': [{ sessionPrice: 'desc' }, { name: 'asc' }],
};

/** Relations every catalog card needs, including the nearest upcoming session. */
export function sectionInclude(now: Date) {
  return {
    sport: { select: { slug: true, name: true, icon: true, photoUrl: true } },
    center: { select: { slug: true, name: true, address: true } },
    trainer: { select: { id: true, fullName: true } },
    sessions: {
      where: { startsAt: { gt: now }, isCancelled: false },
      orderBy: { startsAt: 'asc' },
      take: 1,
      include: { hall: { select: { id: true, name: true } } },
    },
  } satisfies Prisma.SectionInclude;
}

/** Result of CatalogQueryBuilder.build(). */
export interface SectionQuery {
  findMany: {
    where: Prisma.SectionWhereInput;
    orderBy: Prisma.SectionOrderByWithRelationInput[];
    skip: number;
    take: number;
    include: ReturnType<typeof sectionInclude>;
  };
  /** The same filter without paging, for counting all matches. */
  where: Prisma.SectionWhereInput;
  page: number;
  pageSize: number;
}

/**
 * Builder (GoF) for the section catalog query.
 *
 * The catalog has many optional filters. Instead of one function with a long
 * parameter list and a pile of ifs, each step adds one condition and returns
 * the builder, so calls chain:
 *
 *   new CatalogQueryBuilder()
 *     .forSport('yoga').atLevel('BEGINNER').inCenter('sporthub-tsentr')
 *     .sortedBy('price-asc').paginate(2)
 *     .build();
 *
 * Empty arguments are ignored, so the caller passes the visitor's filters
 * as they are. build() returns a plain Prisma query object; the builder
 * never touches the database, which makes it easy to unit test.
 */
export class CatalogQueryBuilder {
  private readonly conditions: Prisma.SectionWhereInput[] = [{ isActive: true }];
  private order: Prisma.SectionOrderByWithRelationInput[] = ORDER.name;
  private page = 1;
  private pageSize = DEFAULT_PAGE_SIZE;

  constructor(private readonly now: Date = new Date()) {}

  forSport(slug?: string): this {
    if (slug) this.conditions.push({ sport: { slug } });
    return this;
  }

  atLevel(level?: SkillLevel): this {
    if (level) this.conditions.push({ level });
    return this;
  }

  forAgeGroup(ageGroup?: AgeGroup): this {
    if (ageGroup) this.conditions.push({ ageGroup });
    return this;
  }

  inCenter(slug?: string): this {
    if (slug) this.conditions.push({ center: { slug } });
    return this;
  }

  /** Case-insensitive search in the name and description. */
  matching(text?: string): this {
    const query = text?.trim();
    if (query) {
      this.conditions.push({
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      });
    }
    return this;
  }

  sortedBy(sort?: SectionSort): this {
    if (sort) this.order = ORDER[sort];
    return this;
  }

  paginate(page = 1, pageSize = DEFAULT_PAGE_SIZE): this {
    this.page = Math.max(1, Math.floor(page));
    this.pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize)));
    return this;
  }

  build(): SectionQuery {
    const where: Prisma.SectionWhereInput = { AND: [...this.conditions] };
    return {
      findMany: {
        where,
        // id as the last key keeps paging stable when names or prices are equal.
        orderBy: [...this.order, { id: 'asc' }],
        skip: (this.page - 1) * this.pageSize,
        take: this.pageSize,
        include: sectionInclude(this.now),
      },
      where,
      page: this.page,
      pageSize: this.pageSize,
    };
  }
}
