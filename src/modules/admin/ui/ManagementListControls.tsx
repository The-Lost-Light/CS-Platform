import { useI18n, type MessageKey } from "@modules/i18n";
import { Button, CardHeader, TextInput, TransientNotice } from "@shared/ui";
import { Plus, Search, type LucideIcon } from "lucide-react";

export function ManagementListHeader({
  title,
  icon,
  disabled,
  notice,
  onAdd,
}: {
  title: string;
  icon: LucideIcon;
  disabled: boolean;
  notice?: MessageKey | null;
  onAdd: () => void;
}) {
  const { t } = useI18n();
  return (
    <CardHeader
      as="header"
      icon={icon}
      title={title}
      layoutClassName="flex flex-wrap items-center justify-between gap-3"
      actions={
        <div className="ml-auto flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2">
          <TransientNotice message={notice && t(notice)} />
          <Button
            icon={Plus}
            disabled={disabled}
            aria-haspopup="dialog"
            onClick={onAdd}
            className="px-4 py-2 shrink-0"
          >
            {t("admin.add")}
          </Button>
        </div>
      }
    />
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
    <TextInput
      icon={Search}
      type="search"
      aria-label={t("admin.search")}
      placeholder={t("admin.search")}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
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
        <Button
          variant="tonal"
          size="sm"
          disabled={disabled}
          aria-haspopup="dialog"
          onClick={onEdit}
        >
          {t("admin.edit")}
        </Button>
        <Button
          variant="danger-tonal"
          size="sm"
          disabled={disabled || deleteDisabledReason !== undefined}
          title={deleteDisabledReason}
          aria-haspopup="dialog"
          onClick={onDelete}
        >
          {t("admin.delete")}
        </Button>
      </div>
    </td>
  );
}
