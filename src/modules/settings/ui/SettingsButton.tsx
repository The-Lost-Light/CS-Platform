import { useI18n } from "@modules/i18n";
import { Button, cn } from "@shared/ui";
import { Settings } from "lucide-react";

import { useSettings } from "../hooks/SettingsProvider";

export function SettingsButton() {
  const { t } = useI18n();
  const { isOpen, openSettings } = useSettings();

  return (
    <Button
      variant="outlined"
      icon={Settings}
      iconClassName="w-3.5 h-3.5 text-primary"
      aria-haspopup="dialog"
      aria-expanded={isOpen}
      title={t("settings.title")}
      onClick={() => openSettings()}
      className={cn(
        isOpen && "border-primary-outline bg-primary-container text-on-primary-container",
      )}
    >
      <span>{t("settings.button")}</span>
    </Button>
  );
}
