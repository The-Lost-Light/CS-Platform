import { X, type LucideIcon } from "lucide-react";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";

export function FormDialog({
  title,
  icon: Icon,
  headerAction,
  closeLabel,
  onDismiss,
  pending,
  wide = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  headerAction?: ReactNode;
  closeLabel: string;
  onDismiss: () => void;
  pending: boolean;
  wide?: boolean;
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
      aria-labelledby={titleId}
      className={`ui-dialog fixed inset-0 m-auto w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] p-0 overflow-hidden open:flex flex-col ${wide ? "max-w-2xl" : "max-w-md"}`}
      onCancel={(event) => {
        if (event.target !== event.currentTarget) return;
        event.preventDefault();
        if (!pending) onDismiss();
      }}
    >
      <header
        className={`ui-card-header grid items-center gap-2 shrink-0 ${headerAction ? "grid-cols-[minmax(0,1fr)_auto_auto]" : "grid-cols-[minmax(0,1fr)_auto]"}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="ui-icon-badge w-8 h-8">
            <Icon aria-hidden="true" className="w-4 h-4" />
          </span>
          <h2 id={titleId} className="text-base font-bold text-on-primary-container wrap-anywhere">
            {title}
          </h2>
        </div>
        {headerAction}
        <button
          type="button"
          aria-label={closeLabel}
          className="ui-btn-icon w-8 h-8 row-start-1 col-end-[-1]"
          disabled={pending}
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="w-4 h-4" />
        </button>
      </header>
      <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain space-y-4">{children}</div>
    </dialog>
  );
}

export function FormDialogActions({
  cancelLabel,
  submitLabel,
  onDismiss,
}: {
  cancelLabel: string;
  submitLabel: string;
  onDismiss: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
      <button type="button" className="ui-btn-text-muted" onClick={onDismiss}>
        {cancelLabel}
      </button>
      <button type="submit" className="ui-btn-primary">
        {submitLabel}
      </button>
    </div>
  );
}
