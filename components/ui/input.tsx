import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-quest border border-ink-600 bg-ink-900 px-3 text-sm text-mist-100",
        "placeholder:text-mist-500",
        "focus:border-quest-teal focus:outline-none focus:ring-1 focus:ring-quest-teal",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label
      ref={ref}
      className={cn("mb-1.5 block text-sm font-medium text-mist-300", className)}
      {...props}
    />
  )
);
Label.displayName = "Label";
