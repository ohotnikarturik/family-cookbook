'use client';

import dynamic from 'next/dynamic';

/**
 * Radix Dialog wires `aria-controls` from React `useId()`.
 * Under Partial Prerender / Cache Components, SSR can emit IDs that don't match the client pass.
 * Load the dialog only on the client to avoid hydration mismatches.
 */
const DialogSample = dynamic(() => import('./dialog-sample').then((m) => m.DialogSample), {
  ssr: false,
});

export function DialogSampleLoader() {
  return <DialogSample />;
}
