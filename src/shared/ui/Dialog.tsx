import { X, type LucideIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, type FormEventHandler, type ReactNode } from "react";

import type { IconBadgeSize, IconBadgeTone } from "./Badge";
import { Button, IconButton, type ButtonVariant } from "./Button";
import { CardHeader } from "./Card";
import { cn } from "./cn";
import { FeedbackBanner } from "./FeedbackBanner";

export interface DialogProps {
  title: string;
  icon: LucideIcon;
  iconTone?: IconBadgeTone;
  iconSize?: IconBadgeSize;
  iconClassName?: string;
  headerAction?: ReactNode;
  closeLabel: string;
  onDismiss: () => void;
  open?: boolean;
  pending?: boolean;
  wide?: boolean;
  closeOnBackdropClick?: boolean;
  role?: "alertdialog";
  describedBy?: string;
  contentClassName?: string;
  children: ReactNode;
}

export function Dialog({
  title,
  icon,
  iconTone,
  iconSize = "sm",
  iconClassName,
  headerAction,
  closeLabel,
  onDismiss,
  open = true,
  pending = false,
  wide = false,
  closeOnBackdropClick = false,
  role,
  describedBy,
  contentClassName,
  children,
}: DialogProps) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
      return () => {
        if (dialog.open && typeof dialog.close === "function") {
          dialog.close();
        }
      };
    }
    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [open]);

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
      onClick={(event) => {
        if (closeOnBackdropClick && !pending && event.target === ref.current) {
          onDismiss();
        }
      }}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!pending) onDismiss();
      }}
      onClose={(event) => {
        if (event.target === event.currentTarget && open && !pending) {
          onDismiss();
        }
      }}
    >
      <CardHeader
        as="header"
        icon={icon}
        iconTone={iconTone}
        iconSize={iconSize}
        iconClassName={iconClassName}
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
      <div
        className={cn("p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-4", contentClassName)}
      >
        {children}
      </div>
    </dialog>
  );
}

export interface FormDialogProps extends Omit<DialogProps, "open" | "closeOnBackdropClick"> {
  pending: boolean;
  error?: ReactNode;
  cancelLabel: string;
  submitLabel: string;
  submitVariant?: ButtonVariant;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onConfirm?: () => void;
}

export function FormDialog({
  pending,
  error,
  cancelLabel,
  submitLabel,
  submitVariant = "primary",
  onDismiss,
  onSubmit,
  onConfirm,
  children,
  ...dialogProps
}: FormDialogProps) {
  const body = (
    <>
      {children}
      {error && <FeedbackBanner kind="error">{error}</FeedbackBanner>}
      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button variant="ghost" disabled={pending} onClick={onDismiss}>
          {cancelLabel}
        </Button>
        <Button
          type={onSubmit ? "submit" : "button"}
          variant={submitVariant}
          disabled={pending}
          onClick={onSubmit ? undefined : onConfirm}
        >
          {submitLabel}
        </Button>
      </div>
    </>
  );

  return (
    <Dialog {...dialogProps} pending={pending} onDismiss={onDismiss}>
      {onSubmit ? (
        <form onSubmit={onSubmit}>
          <fieldset disabled={pending} className="space-y-4 disabled:opacity-60">
            {body}
          </fieldset>
        </form>
      ) : (
        body
      )}
    </Dialog>
  );
}
