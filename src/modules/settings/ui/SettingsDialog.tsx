import { EditAccountDialog, type AccountProfile } from "@modules/accounts";
import { SUPPORTED_LOCALES, useI18n, type LanguagePreference } from "@modules/i18n";
import {
  THEME_PALETTE_SWATCHES,
  useTheme,
  type ThemeMode,
  type ThemePalette,
} from "@modules/theme";
import { Dialog } from "@shared/ui";
import { Languages, Monitor, Moon, Palette, Settings, Sun, SunMoon, UserRound } from "lucide-react";
import { useId, useState } from "react";

import { useSettings } from "../hooks/SettingsProvider";
import {
  SettingActionRow,
  SettingChoiceGroup,
  SettingSection,
  type SettingChoiceOption,
} from "./SettingSection";

function SwatchDot({
  color,
  sizeClassName = "w-3.5 h-3.5",
}: {
  color: string;
  sizeClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${sizeClassName} rounded-full ring-1 ring-black/10 dark:ring-white/20 shrink-0`}
      style={{ backgroundColor: color }}
    />
  );
}

export function SettingsDialog({
  account,
}: {
  account?: AccountProfile & { id?: string; role: string };
}) {
  const { locale, preference, setPreference, t } = useI18n();
  const { mode, setMode, palette, setPalette, isDark } = useTheme();
  const { isOpen, expandedSection, closeSettings, toggleSection } = useSettings();

  const [editingAccount, setEditingAccount] = useState(false);
  const baseId = useId();

  function handleDismiss() {
    setEditingAccount(false);
    closeSettings();
  }

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
          <SwatchDot color={isDark ? item.darkPrimary : item.primary} />
          <SwatchDot color={isDark ? item.darkTint : item.tint} />
        </span>
      ),
    }),
  );

  const languageHeadingId = `${baseId}-language`;
  const languagePanelId = `${baseId}-language-panel`;
  const themeHeadingId = `${baseId}-theme`;
  const themePanelId = `${baseId}-theme-panel`;
  const paletteHeadingId = `${baseId}-palette`;
  const palettePanelId = `${baseId}-palette-panel`;

  return (
    <Dialog
      open={isOpen}
      wide
      closeOnBackdropClick
      title={t("settings.title")}
      icon={Settings}
      iconSize="md"
      iconClassName="rounded-xl"
      closeLabel={t("settings.close")}
      onDismiss={handleDismiss}
      contentClassName="space-y-3"
    >
      {account && (
        <SettingActionRow
          icon={UserRound}
          title={t("settings.account.edit")}
          description={account.email}
          onAction={() => setEditingAccount(true)}
        >
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
        </SettingActionRow>
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
            <SwatchDot
              color={isDark ? activeSwatch.darkPrimary : activeSwatch.primary}
              sizeClassName="w-2.5 h-2.5"
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
    </Dialog>
  );
}
