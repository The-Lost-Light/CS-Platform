import { useI18n } from "@modules/i18n";
import { Settings } from "lucide-react";

import { useSettings } from "../hooks/SettingsProvider";

export function SettingsButton({ variant = "navbar" }: { variant?: "navbar" | "elevated" }) {
  const { t } = useI18n();
  const { isOpen, openSettings } = useSettings();

  const idleClass =
    variant === "elevated"
      ? "border-outline-subtle bg-surface-elevated backdrop-blur-md text-on-muted hover:bg-surface-hover hover:text-on-surface shadow-m3-1"
      : "border-outline-subtle bg-surface-container text-on-muted hover:bg-surface-hover hover:text-on-surface";

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title={t("settings.title")}
      onClick={() => openSettings()}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        isOpen ? "border-primary-outline bg-primary-container text-on-primary-container" : idleClass
      }`}
    >
      <Settings aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
      <span>{t("settings.button")}</span>
    </button>
  );
}
