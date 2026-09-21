import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Monu semantic status chips — reserved for their documented meaning only
        'brand-primary': 'border-transparent bg-primary/[0.14] text-primary',
        'brand-secondary': 'border-transparent bg-brand-secondary/[0.14] text-brand-secondary',
        'accent-blue': 'border-transparent bg-accent-blue/[0.14] text-accent-blue',
        'accent-orange': 'border-transparent bg-accent-orange/[0.14] text-accent-orange',
        'accent-brown': 'border-transparent bg-accent-brown/[0.14] text-accent-brown',
        success: 'border-transparent bg-success/[0.14] text-success',
        danger: 'border-transparent bg-danger/[0.14] text-danger',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
