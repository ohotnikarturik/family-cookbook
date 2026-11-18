'use client';

import { Camera, FileText, ImagePlus } from 'lucide-react';
import { useRef, useSyncExternalStore } from 'react';

import { Button } from '@/components/ui/button';
import { acceptForPick, type RecipeUploadPick } from '@/lib/recipe-asset-upload';

export type RecipeFilePickerAction = Readonly<{
  pick: RecipeUploadPick;
  label: string;
  /** Opens the camera on phones and tablets (`capture="environment"`). Shown only on touch screens. */
  camera?: boolean;
  primary?: boolean;
}>;

type Props = Readonly<{
  actions: readonly RecipeFilePickerAction[];
  disabled?: boolean;
  onPick: (file: File, pick: RecipeUploadPick) => void;
}>;

const COARSE_POINTER = '(pointer: coarse)';

function subscribeCoarsePointer(onChange: () => void): () => void {
  const query = window.matchMedia(COARSE_POINTER);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/** False on the server and during hydration, so the camera button never causes a mismatch. */
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    subscribeCoarsePointer,
    () => window.matchMedia(COARSE_POINTER).matches,
    () => false,
  );
}

/**
 * Localized buttons in front of hidden native file inputs. Choosing a file hands it to
 * `onPick` straight away; there is no separate upload button.
 */
export function RecipeFilePicker({ actions, disabled, onPick }: Props) {
  const coarsePointer = useCoarsePointer();
  const visible = actions.filter((action) => !action.camera || coarsePointer);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      {visible.map((action) => (
        <PickButton
          key={action.label}
          action={action}
          disabled={disabled === true}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

function PickButton({
  action,
  disabled,
  onPick,
}: Readonly<{
  action: RecipeFilePickerAction;
  disabled: boolean;
  onPick: (file: File, pick: RecipeUploadPick) => void;
}>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const Icon = action.camera ? Camera : action.pick === 'scan' ? FileText : ImagePlus;

  return (
    <>
      <Button
        type="button"
        variant={action.primary ? 'default' : 'outline'}
        className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        <Icon aria-hidden />
        {action.label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={acceptForPick(action.pick)}
        {...(action.camera ? { capture: 'environment' as const } : {})}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        disabled={disabled}
        onChange={(event) => {
          const input = event.currentTarget;
          const file = input.files?.[0];
          // Clear it so choosing the same file again still fires `change`.
          input.value = '';
          if (file) {
            onPick(file, action.pick);
          }
        }}
      />
    </>
  );
}
