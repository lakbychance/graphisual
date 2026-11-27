import { Field as UIField, FieldDescription as UIFieldDescription, FieldLabel as UIFieldLabel } from "@ui-sdk/react/field";
import { Input as UIInput } from "@ui-sdk/react/input";
import { Textarea as UITextarea } from "@ui-sdk/react/textarea";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Field({ className, ...props }: ComponentProps<typeof UIField>) {
  return <UIField className={cn("gs-field", className as string)} {...props} />;
}

export function FieldLabel({ className, ...props }: ComponentProps<typeof UIFieldLabel>) {
  return <UIFieldLabel className={cn("gs-label", className as string)} {...props} />;
}

export function FieldDescription({ className, ...props }: ComponentProps<typeof UIFieldDescription>) {
  return <UIFieldDescription className={cn("gs-description", className as string)} {...props} />;
}

/** Input — sunken text well with an inset focus ring. */
export function Input({ className, ...props }: ComponentProps<typeof UIInput>) {
  return <UIInput className={cn("gs-input", className as string)} {...props} />;
}

/** Textarea — the input's sunken well, many lines tall. */
export function Textarea({ className, ...props }: ComponentProps<typeof UITextarea>) {
  return <UITextarea className={cn("gs-input gs-textarea", className as string)} {...props} />;
}
