import { EditAccountDialog, type AccountProfile } from "@modules/accounts";
import { SUPPORTED_LOCALES, useI18n, type LanguagePreference } from "@modules/i18n";
import {
  THEME_PALETTE_SWATCHES,
  useTheme,
  type ThemeMode,
  type ThemePalette,
} from "@modules/theme";
import { CardHeader, IconBadge, IconButton } from "@shared/ui";
import {
  ChevronRight,
  Languages,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  SunMoon,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useSettings } from "../hooks/SettingsProvider";
import { SettingChoiceGroup, SettingSection, type SettingChoiceOption } from "./SettingSection";

export function SettingsDialog({
  account,
}: {
  account?: AccountProfile & { id?: string; role: string };
}) {
  const { locale, preference, setPreference, t } = useI18n();
  const { mode, setMode, palette, setPalette, isDark } = useTheme();
  const { isOpen, expandedSection, closeSettings, toggleSection } = useSettings();

  const [editingAccount, setEditingAccount] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const baseId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    } else if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [isOpen]);

  const currentLanguage = SUPPORTED_LOCALES.find((item) => item.value === locale)!.label;
  const languageOptions: SettingChoiceOption<LanguagePreference>[] = [
    {
      value: "auto",
      label: t("common.auto"),
      hint: currentLanguage,
      leading: <Monitor aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />,
    },
    ...SUPPORTED_LOCALES.map((item) => ({
      value: item.value,
      label: item.label,
      lang: item.value,
      hint: item.value === "en" ? "EN" : "ZH-TW",
      leading: <Languages aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />,
    })),
  ];

  const themeOptions: SettingChoiceOption<ThemeMode>[] = [
    {
      value: "system",
      label: t("common.auto"),
      hint: t("settings.theme.autoHint"),
      leading: <Monitor aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />,
    },
    {
      value: "light",
      label: t("theme.light"),
      hint: t("settings.theme.lightHint"),
      leading: <Sun aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />,
    },
    {
      value: "dark",
      label: t("theme.dark"),
      hint: t("settings.theme.darkHint"),
      leading: <Moon aria-hidden="true" className="w-4 h-4 text-primary shrink-0" />,
    },
  ];

  const activeSwatch =
    THEME_PALETTE_SWATCHES.find((item) => item.value === palette) ?? THEME_PALETTE_SWATCHES[0];

  const paletteOptions: SettingChoiceOption<ThemePalette>[] = THEME_PALETTE_SWATCHES.map(
    (item) => ({
      value: item.value,
      label: t(`theme.palette.${item.value}`),
      tag: item.isDefault ? t("theme.palette.default") : undefined,
      leading: (
        <span aria-hidden="true" className="inline-flex items-center -space-x-1 shrink-0">
          <span
            className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
            style={{ backgroundColor: isDark ? item.darkPrimary : item.primary }}
          />
          <span
            className="w-3.5 h-3.5 rounded-full ring-1 ring-black/10 dark:ring-white/20"
            style={{ backgroundColor: isDark ? item.darkTint : item.tint }}
          />
        </span>
      ),
    }),
  );

  const titleId = `${baseId}-title`;
  const languageHeadingId = `${baseId}-language`;
  const languagePanelId = `${baseId}-language-panel`;
  const themeHeadingId = `${baseId}-theme`;
  const themePanelId = `${baseId}-theme-panel`;
  const paletteHeadingId = `${baseId}-palette`;
  const palettePanelId = `${baseId}-palette-panel`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="ui-dialog fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[min(86vh,46rem)] p-0 overflow-hidden"
      onClick={(event) => {
        if (event.target === dialogRef.current) closeSettings();
      }}
      onClose={(event) => {
        if (event.target !== event.currentTarget) return;
        setEditingAccount(false);
        if (isOpen) closeSettings();
      }}
    >
      <div className="flex max-h-[min(86vh,46rem)] flex-col">
        <CardHeader
          as="header"
          icon={Settings}
          iconClassName="rounded-xl"
          title={t("settings.title")}
          titleId={titleId}
          className="shrink-0"
          actions={<IconButton icon={X} label={t("settings.close")} onClick={closeSettings} />}
        />

        <div className="p-5 sm:p-6 space-y-3 overflow-y-auto">
          {account && (
            <div className="ui-setting-section">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setEditingAccount(true)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              >
                <IconBadge as="span" tone="tonal" icon={UserRound} className="rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{t("settings.account.edit")}</span>
                  <span className="block truncate text-xs text-on-muted mt-0.5">
                    {account.email}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="w-4 h-4 text-on-subtle shrink-0" />
              </button>
              {isOpen && editingAccount && (
                <EditAccountDialog
                  account={account}
                  management={
                    account.role === "admin" && account.id
                      ? { id: account.id, role: account.role, isSelf: true }
                      : undefined
                  }
                  onDismiss={() => setEditingAccount(false)}
                  onSaved={() => setEditingAccount(false)}
                />
              )}
            </div>
          )}
          <SettingSection
            id={languageHeadingId}
            panelId={languagePanelId}
            icon={Languages}
            title={t("language.label")}
            description={t("settings.language.description")}
            expanded={expandedSection === "language"}
            onToggle={() => toggleSection("language")}
            valueContent={
              <span className="truncate">
                {preference === "auto"
                  ? t("language.autoDetected", { language: currentLanguage })
                  : currentLanguage}
              </span>
            }
          >
            <SettingChoiceGroup
              labelledBy={languageHeadingId}
              value={preference}
              onChange={setPreference}
              options={languageOptions}
              columns={3}
            />
          </SettingSection>

          <SettingSection
            id={themeHeadingId}
            panelId={themePanelId}
            icon={SunMoon}
            title={t("settings.theme.title")}
            description={t("settings.theme.description")}
            expanded={expandedSection === "theme"}
            onToggle={() => toggleSection("theme")}
            valueContent={
              <span className="truncate">
                {mode === "system"
                  ? t("common.auto")
                  : mode === "light"
                    ? t("theme.light")
                    : t("theme.dark")}
              </span>
            }
          >
            <SettingChoiceGroup
              labelledBy={themeHeadingId}
              value={mode}
              onChange={setMode}
              options={themeOptions}
              columns={3}
            />
          </SettingSection>

          <SettingSection
            id={paletteHeadingId}
            panelId={palettePanelId}
            icon={Palette}
            title={t("theme.palette.label")}
            description={t("settings.palette.description")}
            expanded={expandedSection === "palette"}
            onToggle={() => toggleSection("palette")}
            valueContent={
              <>
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full ring-1 ring-black/10 dark:ring-white/20 shrink-0"
                  style={{
                    backgroundColor: isDark ? activeSwatch.darkPrimary : activeSwatch.primary,
                  }}
                />
                <span className="truncate">{t(`theme.palette.${activeSwatch.value}`)}</span>
              </>
            }
          >
            <SettingChoiceGroup
              labelledBy={paletteHeadingId}
              value={palette}
              onChange={setPalette}
              options={paletteOptions}
              columns={2}
            />
          </SettingSection>
        </div>
      </div>
    </dialog>
  );
}
