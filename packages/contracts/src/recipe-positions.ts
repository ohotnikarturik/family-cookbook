import type { z } from 'zod';

type Positioned = { position: number };

export function assertContiguousOneBasedPositions(
  ctx: z.RefinementCtx,
  items: Positioned[],
  pathPrefix: (string | number)[],
): void {
  if (items.length === 0) {
    return;
  }

  const positions = items.map((item) => item.position);
  const unique = new Set(positions);
  if (unique.size !== positions.length) {
    ctx.addIssue({
      code: 'custom',
      message: 'Duplicate positions are not allowed',
      path: pathPrefix,
    });
    return;
  }

  const sorted = [...positions].sort((a, b) => a - b);
  for (let index = 0; index < sorted.length; index += 1) {
    const expected = index + 1;
    if (sorted[index] !== expected) {
      ctx.addIssue({
        code: 'custom',
        message: 'Positions must be contiguous starting at 1',
        path: pathPrefix,
      });
      return;
    }
  }
}
