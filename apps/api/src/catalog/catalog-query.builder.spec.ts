import { CatalogQueryBuilder, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from './catalog-query.builder.js';

describe('CatalogQueryBuilder', () => {
  const now = new Date('2026-11-22T10:00:00Z');

  it('lists only active sections, sorted by name, first page by default', () => {
    const query = new CatalogQueryBuilder(now).build();

    expect(query.where).toEqual({ AND: [{ isActive: true }] });
    expect(query.findMany.orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
    expect(query.findMany).toMatchObject({ skip: 0, take: DEFAULT_PAGE_SIZE });
  });

  it('adds one condition per chosen filter', () => {
    const query = new CatalogQueryBuilder(now)
      .forSport('yoga')
      .atLevel('BEGINNER')
      .forAgeGroup('ADULTS')
      .inCenter('sporthub-tsentr')
      .build();

    expect(query.where).toEqual({
      AND: [
        { isActive: true },
        { sport: { slug: 'yoga' } },
        { level: 'BEGINNER' },
        { ageGroup: 'ADULTS' },
        { center: { slug: 'sporthub-tsentr' } },
      ],
    });
  });

  it('ignores empty filters, so callers can pass query parameters as they are', () => {
    const query = new CatalogQueryBuilder(now)
      .forSport(undefined)
      .atLevel(undefined)
      .inCenter('')
      .matching('   ')
      .build();

    expect(query.where).toEqual({ AND: [{ isActive: true }] });
  });

  it('searches the name and description without case sensitivity', () => {
    const query = new CatalogQueryBuilder(now).matching(' йога ').build();

    expect(query.where.AND).toContainEqual({
      OR: [
        { name: { contains: 'йога', mode: 'insensitive' } },
        { description: { contains: 'йога', mode: 'insensitive' } },
      ],
    });
  });

  it('sorts by price with name as a tie-breaker', () => {
    const query = new CatalogQueryBuilder(now).sortedBy('price-desc').build();

    expect(query.findMany.orderBy).toEqual([
      { sessionPrice: 'desc' },
      { name: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('turns page numbers into skip/take and clamps bad values', () => {
    expect(new CatalogQueryBuilder(now).paginate(3, 10).build().findMany).toMatchObject({
      skip: 20,
      take: 10,
    });
    expect(new CatalogQueryBuilder(now).paginate(0, 500).build()).toMatchObject({
      page: 1,
      pageSize: MAX_PAGE_SIZE,
    });
  });

  it('includes only the nearest upcoming session for each card', () => {
    const { sessions } = new CatalogQueryBuilder(now).build().findMany.include;

    expect(sessions).toMatchObject({
      where: { startsAt: { gt: now }, isCancelled: false },
      orderBy: { startsAt: 'asc' },
      take: 1,
    });
  });
});
