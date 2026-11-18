import { describe, expect, it } from 'vitest';

import { browseFieldsFromUrl, browseQueryString, searchTrigger } from './search-as-you-type';

describe('searchTrigger', () => {
  it('clears on empty or blank text', () => {
    expect(searchTrigger('')).toBe('clear');
    expect(searchTrigger('   ')).toBe('clear');
  });

  it('waits for a second character', () => {
    expect(searchTrigger('y')).toBe('wait');
    expect(searchTrigger('  y ')).toBe('wait');
  });

  it('searches from two characters', () => {
    expect(searchTrigger('ye')).toBe('search');
    expect(searchTrigger('  yeast ')).toBe('search');
  });

  it('counts code points, not UTF-16 units', () => {
    expect(searchTrigger('🍲')).toBe('wait');
    expect(searchTrigger('🍲🍲')).toBe('search');
    expect(searchTrigger('щ')).toBe('wait');
    expect(searchTrigger('щи')).toBe('search');
  });
});

describe('browseQueryString', () => {
  const empty = {
    query: '',
    category: '',
    tag: '',
    language: '',
    createdBy: '',
    sort: 'updatedAt',
    includeArchived: false,
  };

  it('keeps filled fields in a fixed order and trims them', () => {
    expect(
      browseQueryString({
        ...empty,
        query: '  yeast ',
        category: 'Baking',
        includeArchived: true,
      }),
    ).toBe('query=yeast&category=Baking&includeArchived=true');
  });

  it('leaves out the default sort but keeps another one', () => {
    expect(browseQueryString({ ...empty, query: 'yeast' })).toBe('query=yeast');
    expect(browseQueryString({ ...empty, query: 'yeast', sort: 'title' })).toBe(
      'query=yeast&sort=title',
    );
  });

  it('is empty when nothing is chosen', () => {
    expect(browseQueryString({ ...empty, query: '   ' })).toBe('');
  });
});

describe('browseFieldsFromUrl', () => {
  it('reads the address and ignores the cursor', () => {
    const fields = browseFieldsFromUrl(
      new URLSearchParams('query=yeast&category=Baking&cursor=abc&includeArchived=true'),
    );
    expect(fields).toMatchObject({
      query: 'yeast',
      category: 'Baking',
      sort: 'updatedAt',
      includeArchived: true,
    });
    expect(browseQueryString(fields)).toBe('query=yeast&category=Baking&includeArchived=true');
  });
});
