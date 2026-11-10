import { describe, expect, it } from 'vitest';

import { buildRecipeSearchChips } from '@/lib/recipe-search-chips';

const labels = {
  query: 'Search',
  ingredient: 'Ingredient',
  category: 'Category',
  tag: 'Tag',
  language: 'Language',
  contributor: 'Contributor',
  includeArchived: 'Include archived recipes',
  sort: 'Sort by',
  sortValue: (sort: 'createdAt' | 'title') => (sort === 'title' ? 'Title' : 'Date added'),
  contributorName: (userId: string) => (userId === 'user-1' ? 'Ada' : userId),
};

describe('buildRecipeSearchChips', () => {
  it('includes the contributor and a non-default sort', () => {
    const chips = buildRecipeSearchChips(
      { createdBy: 'user-1', sort: 'title', query: 'soup' },
      labels,
    );
    expect(chips.map((chip) => chip.label)).toEqual([
      'Search: soup',
      'Contributor: Ada',
      'Sort by: Title',
    ]);
  });

  it('omits the default sort', () => {
    expect(buildRecipeSearchChips({ sort: 'updatedAt' }, labels)).toEqual([]);
  });
});
