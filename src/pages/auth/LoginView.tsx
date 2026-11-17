import { CheckCircle2, Code2 } from "lucide-react";
import { useI18n } from "../../i18n";
import { LanguageSwitcher } from "../layout/LanguageSwitcher";
import { ThemeSwitcher } from "../layout/ThemeSwitcher";
import { LoginForm } from "./LoginForm";
import type { LoginHandler } from "../../auth/useLoginForm";

export function LoginView({ onLogin }: { onLogin: LoginHandler }) {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-canvas text-on-surface flex flex-col items-center gap-6 p-4 sm:p-6 relative transition-colors">
      {/* Keep page controls at the top, independently of the centered login card. */}
      <div className="relative z-10 self-end flex max-w-full flex-wrap justify-end items-center gap-1.5 bg-surface p-1.5 rounded-3xl sm:rounded-full border border-outline-subtle shadow-xs">
        <LanguageSwitcher />
        <ThemeSwitcher size="sm" />
      </div>

      <div className="flex w-full flex-1 items-center justify-center">
        {/* Main Material 3 Split Card */}
        <div className="w-full max-w-4xl bg-surface rounded-[28px] shadow-md border border-outline-subtle overflow-hidden grid grid-cols-1 md:grid-cols-12">
          {/* Left Brand & Info Column (5 cols) */}
          <div className="md:col-span-5 bg-brand-banner text-white p-8 flex flex-col justify-between">
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-xs">
                <Code2 className="w-7 h-7 text-white" />
              </div>
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-xs font-semibold tracking-wide">
                  Material Design 3 Edition
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                  CodePulse Edu
                  <br />
                  {t("app.title")}
                </h1>
                <p className="text-sm text-on-brand-banner-muted leading-relaxed">
                  {t("auth.intro")}
                </p>
              </div>
            </div>

            <div className="pt-8 space-y-3 border-t border-white/15 text-xs text-on-brand-banner-muted">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-outline shrink-0" />
                <span>{t("auth.features.design")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-success-outline shrink-0" />
                <span>{t("auth.features.github")}</span>
              </div>
            </div>
          </div>

          {/* Right Login Form Column (7 cols) */}
          <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-surface">
            <LoginForm onLogin={onLogin} />
          </div>
        </div>
      </div>
    </div>
  );
}
