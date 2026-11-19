import { EditAccountDialog, type AccountProfile } from "@modules/accounts";
import { SUPPORTED_LOCALES, useI18n, type LanguagePreference } from "@modules/i18n";
import {
  THEME_PALETTE_SWATCHES,
  useTheme,
  type ThemeMode,
  type ThemePalette,
} from "@modules/theme";
import {
  Eye,
  EyeOff,
  ChevronRight,
  KeyRound,
  Languages,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  SunMoon,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useSettings } from "../hooks/SettingsProvider";
import { SettingChoiceGroup, SettingSection, type SettingChoiceOption } from "./SettingSection";

export function SettingsDialog({
  showGithubToken = true,
  account,
}: {
  showGithubToken?: boolean;
  account?: AccountProfile & { id?: string; role: string };
}) {
  const { locale, preference, setPreference, t } = useI18n();
  const { mode, setMode, palette, setPalette, isDark } = useTheme();
  const {
    isOpen,
    focusSection,
    expandedSection,
    closeSettings,
    toggleSection,
    githubToken,
    setGithubToken,
    clearGithubToken,
  } = useSettings();

  const [showToken, setShowToken] = useState(false);
  const [editingAccount, setEditingAccount] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const githubSectionRef = useRef<HTMLElement>(null);
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const baseId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
      if (focusSection === "github" && showGithubToken) {
        githubSectionRef.current?.scrollIntoView({ block: "nearest" });
        tokenInputRef.current?.focus();
      }
    } else if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [isOpen, focusSection, showGithubToken]);

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

  const hasToken = Boolean(githubToken);
  const titleId = `${baseId}-title`;
  const languageHeadingId = `${baseId}-language`;
  const languagePanelId = `${baseId}-language-panel`;
  const themeHeadingId = `${baseId}-theme`;
  const themePanelId = `${baseId}-theme-panel`;
  const paletteHeadingId = `${baseId}-palette`;
  const palettePanelId = `${baseId}-palette-panel`;
  const githubHeadingId = `${baseId}-github`;
  const githubPanelId = `${baseId}-github-panel`;
  const tokenInputId = `${baseId}-token-input`;
  const tokenHelpId = `${baseId}-token-help`;

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
        setShowToken(false);
        if (isOpen) closeSettings();
      }}
    >
      <div className="flex max-h-[min(86vh,46rem)] flex-col">
        <header className="ui-card-header flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="ui-icon-badge w-9 h-9 rounded-xl">
              <Settings aria-hidden="true" className="w-4 h-4" />
            </div>
            <h2 id={titleId} className="text-base font-bold text-on-primary-container truncate">
              {t("settings.title")}
            </h2>
          </div>
          <button
            type="button"
            aria-label={t("settings.close")}
            className="ui-btn-icon w-8 h-8 shrink-0"
            onClick={closeSettings}
          >
            <X aria-hidden="true" className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 sm:p-6 space-y-3 overflow-y-auto">
          {account && (
            <div className="ui-setting-section">
              <button
                type="button"
                aria-haspopup="dialog"
                onClick={() => setEditingAccount(true)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-hover cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
              >
                <span className="ui-icon-badge-tonal w-9 h-9 rounded-xl">
                  <UserRound aria-hidden="true" className="w-4 h-4" />
                </span>
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

          {showGithubToken && (
            <SettingSection
              id={githubHeadingId}
              panelId={githubPanelId}
              sectionRef={githubSectionRef}
              icon={KeyRound}
              title={t("settings.github.title")}
              description={t("settings.github.description")}
              expanded={expandedSection === "github"}
              onToggle={() => toggleSection("github")}
              valueTone={hasToken ? "success" : "default"}
              valueContent={
                <span className="truncate">
                  {t(hasToken ? "settings.github.configured" : "settings.github.notConfigured")}
                </span>
              }
            >
              <div className="space-y-2.5">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <label htmlFor={tokenInputId} className="sr-only">
                    {t("settings.github.label")}
                  </label>
                  <div className="relative flex-1">
                    <KeyRound
                      aria-hidden="true"
                      className="w-4 h-4 text-on-subtle absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    />
                    <input
                      ref={tokenInputRef}
                      id={tokenInputId}
                      type={showToken ? "text" : "password"}
                      autoComplete="off"
                      spellCheck={false}
                      value={githubToken}
                      onChange={(event) => setGithubToken(event.target.value)}
                      placeholder={t("workspace.tokenPlaceholder")}
                      aria-describedby={tokenHelpId}
                      className="ui-input pl-10 pr-11 py-2 text-xs sm:text-sm font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((visible) => !visible)}
                      className="ui-btn-icon w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2"
                      title={t(
                        showToken ? "settings.github.hideToken" : "settings.github.showToken",
                      )}
                      aria-label={t(
                        showToken ? "settings.github.hideToken" : "settings.github.showToken",
                      )}
                    >
                      {showToken ? (
                        <EyeOff aria-hidden="true" className="w-4 h-4" />
                      ) : (
                        <Eye aria-hidden="true" className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={!hasToken}
                    onClick={clearGithubToken}
                    className="ui-btn-danger-tonal shrink-0 px-3.5 py-2"
                  >
                    <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                    <span>{t("settings.github.clear")}</span>
                  </button>
                </div>
                <p id={tokenHelpId} className="ui-field-help mt-0">
                  {t("settings.github.help")}
                </p>
              </div>
            </SettingSection>
          )}
        </div>
      </div>
    </dialog>
  );
}
