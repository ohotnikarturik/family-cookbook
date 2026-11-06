import type { ReactNode } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = Readonly<{
  titleLabel: string;
  titlePlaceholder: string;
  notesLabel: string;
  notesPlaceholder: string;
  helper: string;
}>;

export function FormFieldSample({
  titleLabel,
  titlePlaceholder,
  notesLabel,
  notesPlaceholder,
  helper,
}: Props) {
  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <FieldGroup>
        <Label htmlFor="sample-title">{titleLabel}</Label>
        <Input
          id="sample-title"
          name="title"
          type="text"
          placeholder={titlePlaceholder}
          autoComplete="off"
        />
      </FieldGroup>
      <FieldGroup>
        <Label htmlFor="sample-notes">{notesLabel}</Label>
        <Textarea
          id="sample-notes"
          name="notes"
          placeholder={notesPlaceholder}
          rows={4}
          aria-describedby="sample-notes-hint"
        />
        <p id="sample-notes-hint" className="text-xs text-muted-foreground">
          {helper}
        </p>
      </FieldGroup>
    </div>
  );
}

function FieldGroup({ children }: Readonly<{ children: ReactNode }>) {
  return <div className="space-y-2">{children}</div>;
}
