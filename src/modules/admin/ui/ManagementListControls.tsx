import { useI18n, type MessageKey } from "@modules/i18n";
import {
  Button,
  Card,
  CardHeader,
  DataTable,
  FeedbackBanner,
  LoadingPanel,
  TextInput,
  TransientNotice,
} from "@shared/ui";
import { Plus, Search, type LucideIcon } from "lucide-react";
import { useImperativeHandle, type ReactNode, type Ref } from "react";

import { ConfirmDelete } from "./ConfirmDelete";
import type { ManagementListHandle } from "./ManagementListHandle";

export function ManagementSection({
  ref,
  onResetDialogs,
  title,
  icon,
  notice,
  onAdd,
  search,
  onSearchChange,
  errorMessage,
  onRetry,
  pending,
  loading = false,
  headers,
  isEmpty,
  deleteConfirm,
  dialogs,
  children,
}: {
  ref: Ref<ManagementListHandle>;
  onResetDialogs: () => void;
  title: string;
  icon: LucideIcon;
  notice?: MessageKey | null;
  onAdd: () => void;
  search: string;
  onSearchChange: (value: string) => void;
  errorMessage?: string | null;
  onRetry?: () => void;
  pending: boolean;
  loading?: boolean;
  headers: readonly ReactNode[];
  isEmpty: boolean;
  deleteConfirm?: {
    name: string;
    account?: boolean;
    onCancel: () => void;
    onConfirm: () => void;
  };
  dialogs?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  useImperativeHandle(ref, () => ({ showList: onResetDialogs }));

  return (
    <Card overflowHidden>
      <ManagementListHeader
        title={title}
        icon={icon}
        disabled={Boolean(deleteConfirm)}
        notice={notice}
        onAdd={onAdd}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {errorMessage && !deleteConfirm && (
          <FeedbackBanner
            kind="error"
            onRetry={onRetry}
            retryLabel={t("auth.retry")}
            retryDisabled={pending}
          >
            {errorMessage}
          </FeedbackBanner>
        )}

        <ManagementSearch value={search} onChange={onSearchChange} />

        {loading ? (
          <LoadingPanel label={t("common.loading")} />
        ) : (
          <DataTable headers={headers} isEmpty={isEmpty} emptyMessage={t("admin.empty")}>
            {children}
          </DataTable>
        )}
      </div>

      {dialogs}

      {deleteConfirm && (
        <ConfirmDelete
          name={deleteConfirm.name}
          account={deleteConfirm.account}
          pending={pending}
          error={errorMessage}
          onCancel={deleteConfirm.onCancel}
          onConfirm={deleteConfirm.onConfirm}
        />
      )}
    </Card>
  );
}

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
