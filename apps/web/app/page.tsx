import { applicationBootstrapMarker } from '@family-cookbook/application';
import { PACKAGE_VERSION as contractsVersion } from '@family-cookbook/contracts';

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-16 font-sans">
      <h1 className="text-2xl font-semibold tracking-tight">Family Cookbook</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Monorepo bootstrap placeholder. Product UI arrives in later tasks.
      </p>
      <dl className="rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
        <div className="flex justify-between gap-4">
          <dt className="text-zinc-500">contracts</dt>
          <dd className="font-mono">{contractsVersion}</dd>
        </div>
        <div className="mt-2 flex justify-between gap-4">
          <dt className="text-zinc-500">application layers</dt>
          <dd className="font-mono text-right">{JSON.stringify(applicationBootstrapMarker)}</dd>
        </div>
      </dl>
    </main>
  );
}
