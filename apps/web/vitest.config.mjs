import { mergeConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import base from '@family-cookbook/config/vitest/base';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(base, {
  test: {
    include: ['lib/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.join(dirname, '.'),
    },
  },
});
