import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import type { HomeFirstStep } from '@/lib/home-first-steps';

type StepCopy = Readonly<{ title: string; description: string; action?: string }>;

type Props = Readonly<{
  familyId: string;
  heading: string;
  intro: string;
  steps: readonly HomeFirstStep[];
  copy: Readonly<Record<HomeFirstStep['id'], StepCopy>>;
}>;

/** Numbered first steps for an empty cookbook. The caller passes only steps the role can do. */
export function HomeFirstSteps({ familyId, heading, intro, steps, copy }: Props) {
  return (
    <section
      aria-labelledby="home-first-steps-heading"
      className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground"
    >
      <div className="space-y-1">
        <h2
          id="home-first-steps-heading"
          className="font-serif-display text-xl font-semibold text-foreground"
        >
          {heading}
        </h2>
        <p className="text-sm text-muted-foreground">{intro}</p>
      </div>
      <ol className="list-none space-y-4 p-0">
        {steps.map((step, index) => {
          const text = copy[step.id];
          return (
            <li key={step.id} className="flex gap-3">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <h3 className="font-semibold text-foreground">{text.title}</h3>
                <p className="text-sm text-muted-foreground">{text.description}</p>
                {step.path && text.action ? (
                  <Button
                    asChild
                    variant={index === 0 ? 'default' : 'outline'}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    <Link href={`/f/${familyId}${step.path}`}>{text.action}</Link>
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
