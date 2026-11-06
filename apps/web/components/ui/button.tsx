import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-[var(--transition-normal)] ease-[var(--ease-standard)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-[length:var(--ring-width)] focus-visible:ring-ring focus-visible:ring-offset-[length:var(--ring-offset)] focus-visible:ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/92',
        secondary:
          'border border-border bg-secondary text-secondary-foreground hover:bg-secondary/85',
        outline: 'border border-border bg-transparent hover:bg-muted',
        ghost: 'hover:bg-muted',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92',
        quiet: 'text-muted-foreground hover:text-foreground',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-md px-6 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
