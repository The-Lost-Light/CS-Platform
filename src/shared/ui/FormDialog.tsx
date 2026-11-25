import { X, type LucideIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";

import type { IconBadgeTone } from "./Badge";
import { Button, IconButton, type ButtonVariant } from "./Button";
import { CardHeader } from "./Card";
import { cn } from "./cn";

export function FormDialog({
  title,
  icon,
  iconTone,
  headerAction,
  closeLabel,
  onDismiss,
  pending,
  wide = false,
  role,
  describedBy,
  children,
}: {
  title: string;
  icon: LucideIcon;
  iconTone?: IconBadgeTone;
  headerAction?: ReactNode;
  closeLabel: string;
  onDismiss: () => void;
  pending: boolean;
  wide?: boolean;
  role?: "alertdialog";
  describedBy?: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={describedBy}
      className={cn(
        "ui-dialog fixed inset-0 m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] p-0 overflow-hidden open:flex flex-col",
        wide ? "max-w-2xl" : "max-w-md",
      )}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!pending) onDismiss();
      }}
    >
      <CardHeader
        as="header"
        icon={icon}
        iconTone={iconTone}
        iconSize="sm"
        title={title}
        titleId={titleId}
        truncateTitle={false}
        titleClassName="wrap-anywhere"
        layoutClassName={cn(
          "grid items-center gap-2 shrink-0",
          headerAction ? "grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]",
        )}
        actions={
          <>
            {headerAction}
            <IconButton
              icon={X}
              label={closeLabel}
              className="row-start-1 col-end-[-1]"
              disabled={pending}
              onClick={onDismiss}
            />
          </>
        }
      />
      <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-4">{children}</div>
    </dialog>
  );
}

export function FormDialogActions({
  cancelLabel,
  submitLabel,
  submitVariant = "primary",
  disabled = false,
  onDismiss,
  onSubmit,
}: {
  cancelLabel: string;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  disabled?: boolean;
  onDismiss: () => void;
  onSubmit?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
      <Button variant="ghost" disabled={disabled} onClick={onDismiss}>
        {cancelLabel}
      </Button>
      <Button
        type={onSubmit ? "button" : "submit"}
        variant={submitVariant}
        disabled={disabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
