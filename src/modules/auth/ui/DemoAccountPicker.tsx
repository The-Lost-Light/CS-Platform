import { useI18n } from "@modules/i18n";
import { ShieldCheck } from "lucide-react";

import type { User } from "../model/types";
import { DEMO_ACCOUNTS } from "../services/demoAccounts";

export function DemoAccountPicker({
  selectedAccount,
  onSelect,
}: {
  selectedAccount: string;
  onSelect: (account: User) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="pt-4 border-t border-outline-subtle space-y-2.5">
      <div className="text-xs font-semibold text-on-muted flex items-center gap-1.5">
        <ShieldCheck aria-hidden="true" className="w-4 h-4 text-primary" />
        <span>{t("auth.demoAccounts")}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account)}
            className={`p-2.5 rounded-2xl border text-left transition-colors cursor-pointer flex items-center gap-2.5 ${
              selectedAccount === account.studentId
                ? "bg-primary-container border-primary-outline text-on-primary-container"
                : "bg-surface-sunken hover:bg-surface-hover border-outline-subtle text-on-surface"
            }`}
          >
            <div
              style={{ backgroundColor: account.avatarColor }}
              className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
            >
              {account.name.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold truncate">{account.name}</div>
              <div className="text-[10px] text-on-muted font-mono truncate">
                {account.studentId}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
