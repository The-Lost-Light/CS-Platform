import { useI18n, type MessageKey } from '../../i18n';
import type { User as AppUser } from '../../types';
import React, { useState } from 'react';
import { LanguageSwitcher } from '../layout/LanguageSwitcher';
import {
  Code2,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Monitor,
  Sun,
  Moon,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    id: 'student-1',
    studentId: 'B11204018',
    name: '陳宥軒 (資工三甲)',
    email: 'b11204018@university.edu.tw',
    role: '學生 (Student)',
    avatarBg: 'bg-[#0B57D0]',
  },
  {
    id: 'student-2',
    studentId: 'B11204042',
    name: '林博宇 (資工三乙)',
    email: 'b11204042@university.edu.tw',
    role: '專題組長 (Team Lead)',
    avatarBg: 'bg-[#006A60]',
  },
  {
    id: 'ta-1',
    studentId: 'TA-901',
    name: '張簡助教 (Course TA)',
    email: 'ta.se@university.edu.tw',
    role: '課程助教 (TA)',
    avatarBg: 'bg-[#6750A4]',
  },
];

export function LoginView({
  onLoginSuccess,
  themeMode = 'system',
  onChangeThemeMode,
}: { onLoginSuccess: (user: AppUser) => void; themeMode?: string; onChangeThemeMode: (mode: string) => void }) {
  const { t } = useI18n();
  const [accountInput, setAccountInput] = useState('B11204018');
  const [nameInput, setNameInput] = useState('陳宥軒');
  const [passwordInput, setPasswordInput] = useState('••••••••••••');
  const [roleInput, setRoleInput] = useState('學生 (Student)');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<MessageKey | ''>('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accountInput.trim()) {
      setErrorMsg('auth.errors.accountRequired');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMsg('auth.errors.passwordRequired');
      return;
    }
    setErrorMsg('');
    onLoginSuccess({
      studentId: accountInput.trim(),
      name: nameInput.trim() || accountInput.trim(),
      role: roleInput,
    });
  };

  const handleSelectDemoAccount = (acct: AppUser) => {
    setAccountInput(acct.studentId);
    setNameInput(acct.name);
    setRoleInput(acct.role);
    setPasswordInput('material2026');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-[#F0F4F9] dark:bg-[#121316] text-[#1F1F1F] dark:text-[#E3E2E6] flex flex-col justify-center items-center p-4 sm:p-6 relative transition-colors">
      {/* Top-Right Theme Mode Switcher on Login Screen */}
      <div className="self-end mb-6 flex flex-wrap items-center gap-1.5 bg-white dark:bg-[#1E1F23] p-1.5 rounded-full border border-slate-200/90 dark:border-[#33353A] shadow-xs">
        <LanguageSwitcher />
        <div
          className="inline-flex items-center bg-[#F0F4F9] dark:bg-[#121316] p-1 rounded-full border border-slate-200 dark:border-[#33353A]"
          role="group"
          aria-label={t('theme.label')}
        >
          <button
            type="button"
            onClick={() => onChangeThemeMode?.('system')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
              themeMode === 'system'
                ? 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF] shadow-2xs'
                : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6]'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{t('common.auto')}</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeThemeMode?.('light')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
              themeMode === 'light'
                ? 'bg-[#D3E3FD] text-[#041E49] shadow-2xs'
                : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>{t('theme.light')}</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeThemeMode?.('dark')}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition ${
              themeMode === 'dark'
                ? 'bg-[#004A77] text-[#C2E7FF] shadow-2xs'
                : 'text-[#444746] dark:text-[#C4C7C5] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>{t('theme.dark')}</span>
          </button>
        </div>
      </div>

      {/* Main Material 3 Split Card */}
      <div className="w-full max-w-4xl bg-white dark:bg-[#1E1F23] rounded-[28px] shadow-md border border-slate-200/90 dark:border-[#33353A] overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Brand & Info Column (5 cols) */}
        <div className="md:col-span-5 bg-[#0B57D0] dark:bg-[#0842A0] text-white p-8 flex flex-col justify-between">
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
                {t('app.title')}
              </h1>
              <p className="text-sm text-[#D3E3FD] leading-relaxed">{t('auth.intro')}</p>
            </div>
          </div>

          <div className="pt-8 space-y-3 border-t border-white/15 text-xs text-[#D3E3FD]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#81C995] shrink-0" />
              <span>{t('auth.features.design')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#81C995] shrink-0" />
              <span>{t('auth.features.comparison')}</span>
            </div>
          </div>
        </div>

        {/* Right Login Form Column (7 cols) */}
        <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-white dark:bg-[#1E1F23]">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t('auth.title')}</h2>
              <p className="text-xs sm:text-sm text-[#444746] dark:text-[#C4C7C5] mt-1">{t('auth.description')}</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FAD2CF] dark:bg-[#8C1D18]/40 border border-[#F28B82] text-[#B3261E] dark:text-[#F2B8B5] text-xs font-medium">
                {errorMsg && t(errorMsg)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t('auth.accountLabel')}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#5E5E5E] dark:text-[#8E918F] absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={accountInput}
                      onChange={(e) => setAccountInput(e.target.value)}
                      placeholder={t('auth.accountPlaceholder')}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t('auth.nameLabel')}</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA] transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t('auth.passwordLabel')}</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#5E5E5E] dark:text-[#8E918F] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#5E5E5E] dark:text-[#8E918F] hover:text-[#1F1F1F] dark:hover:text-[#E3E2E6] transition"
                      title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t('auth.roleLabel')}</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-200 dark:border-[#33353A] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0] dark:focus:ring-[#A8C7FA] transition"
                  >
                    <option value="學生 (Student)">{t('auth.roles.student')}</option>
                    <option value="專題組長 (Team Lead)">{t('auth.roles.teamLead')}</option>
                    <option value="課程助教 (TA)">{t('auth.roles.ta')}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] dark:bg-[#A8C7FA] dark:hover:bg-[#D3E3FD] text-white dark:text-[#041E49] font-semibold text-sm shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition"
                >
                  <span>{t('auth.submit')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick One-Click Demo Accounts */}
            <div className="pt-4 border-t border-slate-200 dark:border-[#33353A] space-y-2.5">
              <div className="text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
                <span>{t('auth.demoAccounts')}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acct)}
                    className={`p-2.5 rounded-2xl border text-left transition flex items-center gap-2.5 ${
                      accountInput === acct.studentId
                        ? 'bg-[#D3E3FD]/60 dark:bg-[#004A77]/60 border-[#0B57D0] dark:border-[#A8C7FA] text-[#041E49] dark:text-[#C2E7FF]'
                        : 'bg-[#F8FAFD] dark:bg-[#121316] hover:bg-[#F3EDF7]/60 dark:hover:bg-[#282A2F] border-slate-200 dark:border-[#33353A] text-[#1F1F1F] dark:text-[#E3E2E6]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full ${acct.avatarBg} text-white text-xs font-bold flex items-center justify-center shrink-0`}
                    >
                      {acct.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{acct.name}</div>
                      <div className="text-[10px] text-[#444746] dark:text-[#C4C7C5] font-mono truncate">
                        {acct.studentId}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
