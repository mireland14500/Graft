"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./ui";

/** A form submit button that shows a spinner and disables itself while the action runs. */
export function SubmitButton({ children, pendingText, ...props }: ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button {...props} disabled={pending || props.disabled} aria-busy={pending}>
      {pending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {pending ? pendingText ?? children : children}
    </Button>
  );
}
