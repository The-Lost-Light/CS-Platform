import { useI18n } from "@modules/i18n";
import { Plus, Search, type LucideIcon } from "lucide-react";

export function ManagementListHeader({
  title,
  icon: Icon,
  className,
  disabled,
  onAdd,
}: {
  title: string;
  icon: LucideIcon;
  className: string;
  disabled: boolean;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <header className={`ui-card-header ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="ui-icon-badge w-9 h-9">
          <Icon aria-hidden="true" className="w-4 h-4" />
        </div>
        <h2 className="text-base font-bold text-on-primary-container truncate">{title}</h2>
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        onClick={onAdd}
        className="ui-btn-primary px-4 py-2 text-xs sm:text-sm shrink-0"
      >
        <Plus aria-hidden="true" className="w-4 h-4" />
        {t("admin.add")}
      </button>
    </header>
  );
}

export function ManagementSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="ui-field-label">
      {t("admin.search")}
      <div className="relative mt-1.5">
        <Search
          aria-hidden="true"
          className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
        />
        <input
          type="search"
          className="ui-input pl-10"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

export function ManagementRowActions({
  disabled,
  deleteDisabledReason,
  onEdit,
  onDelete,
}: {
  disabled: boolean;
  deleteDisabledReason?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  return (
    <td className="whitespace-nowrap">
      <div className="inline-flex items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          className="ui-btn-tonal px-3 py-1.5"
          aria-haspopup="dialog"
          onClick={onEdit}
        >
          {t("admin.edit")}
        </button>
        <button
          type="button"
          disabled={disabled || deleteDisabledReason !== undefined}
          title={deleteDisabledReason}
          className="ui-btn-danger-tonal px-3 py-1.5"
          onClick={onDelete}
        >
          {t("admin.delete")}
        </button>
      </div>
    </td>
  );
}
