import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges Tailwind CSS class names, resolving conflicts intelligently.
 * Used by shadcn/ui components: cn('base-classes', conditionalClass && 'extra')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
