import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm flex gap-3 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:mt-0.5',
  {
    variants: {
      variant: {
        default: 'border-border bg-muted/40 text-foreground',
        /* Tinted surfaces: keep body copy on `foreground` for contrast; role color reads via border. */
        success: 'border-success/50 bg-success/14 text-foreground',
        warning: 'border-warning/55 bg-warning/18 text-foreground',
        destructive: 'border-destructive/50 bg-destructive/14 text-foreground',
        info: 'border-info/50 bg-info/14 text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const alertRoles = {
  default: 'status',
  success: 'status',
  warning: 'status',
  destructive: 'alert',
  info: 'status',
} as const;

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, role, ...props }, ref) => {
  const resolved = variant ?? 'default';
  return (
    <div
      ref={ref}
      role={role ?? alertRoles[resolved]}
      className={cn(alertVariants({ variant: resolved }), className)}
      {...props}
    />
  );
});
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('mb-1 font-medium leading-none tracking-tight', className)}
    {...props}
  />
));
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
));
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertDescription, AlertTitle, alertVariants };
