import { describe, expect, it } from 'vitest';

import { parseRecipeSearchFromUrl } from './recipe-search-params';

const FAMILY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OWNER_A = '11111111-1111-4111-8111-111111111101';

describe('parseRecipeSearchFromUrl', () => {
  it('parses createdBy contributor filter', () => {
    const parsed = parseRecipeSearchFromUrl(FAMILY_ID, { createdBy: OWNER_A });
    expect(parsed.hadInvalidParams).toBe(false);
    expect(parsed.input?.createdBy).toBe(OWNER_A);
  });

  it('rejects malformed createdBy values', () => {
    const parsed = parseRecipeSearchFromUrl(FAMILY_ID, { createdBy: 'not-a-uuid' });
    expect(parsed.input).toBeNull();
    expect(parsed.hadInvalidParams).toBe(true);
  });
});
