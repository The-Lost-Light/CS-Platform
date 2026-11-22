import type { LucideIcon } from "lucide-react";
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "./cn";

export interface FormFieldProps {
  label: ReactNode;
  help?: ReactNode;
  helpId?: string;
  externalHelp?: boolean;
  className?: string;
  children: ReactNode;
}

export function FormField({
  label,
  help,
  helpId,
  externalHelp = false,
  className,
  children,
}: FormFieldProps) {
  const field = (
    <label className={cn("ui-field-label space-y-1.5", className)}>
      <span>{label}</span>
      {children}
      {help && !externalHelp && (
        <span id={helpId} className="ui-field-help">
          {help}
        </span>
      )}
    </label>
  );

  if (help && externalHelp) {
    return (
      <>
        {field}
        <p id={helpId} className="ui-field-help">
          {help}
        </p>
      </>
    );
  }

  return field;
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: LucideIcon;
  iconTone?: "subtle" | "primary";
  trailing?: ReactNode;
  mono?: boolean;
  compact?: boolean;
  wrapperClassName?: string;
}

export function TextInput({
  icon: Icon,
  iconTone = "subtle",
  trailing,
  mono = false,
  compact = false,
  wrapperClassName,
  className,
  ...props
}: TextInputProps) {
  const input = (
    <input
      className={cn(
        "ui-input",
        compact && "px-3 py-2",
        mono && "font-mono",
        Icon && "pl-10",
        Boolean(trailing) && "pr-11",
        className,
      )}
      {...props}
    />
  );

  if (!Icon && !trailing) {
    return input;
  }

  return (
    <div className={cn("relative", wrapperClassName)}>
      {Icon && (
        <Icon
          aria-hidden="true"
          className={cn(
            "w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none",
            iconTone === "primary" ? "text-primary" : "text-on-subtle",
          )}
        />
      )}
      {input}
      {trailing}
    </div>
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  mono?: boolean;
  compact?: boolean;
}

export function TextArea({ mono = false, compact = false, className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={cn("ui-input", compact && "px-3 py-2", mono && "font-mono", className)}
      {...props}
    />
  );
}

export function SelectField({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn("ui-input", className)} {...props}>
      {children}
    </select>
  );
}
