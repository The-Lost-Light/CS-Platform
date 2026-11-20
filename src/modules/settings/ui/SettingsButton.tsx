import { useI18n } from "@modules/i18n";
import { Settings } from "lucide-react";

import { useSettings } from "../hooks/SettingsProvider";

export function SettingsButton() {
  const { t } = useI18n();
  const { isOpen, openSettings } = useSettings();

  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title={t("settings.title")}
      onClick={() => openSettings()}
      className={`ui-btn-outlined ${
        isOpen ? "border-primary-outline bg-primary-container text-on-primary-container" : ""
      }`}
    >
      <Settings aria-hidden="true" className="w-3.5 h-3.5 text-primary" />
      <span>{t("settings.button")}</span>
    </button>
  );
}
