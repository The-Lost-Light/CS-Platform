import { useI18n, type MessageKey } from '../../i18n';
import type { User as AppUser } from '../../types';
import React, { useState } from 'react';
import { LanguageSwitcher } from '../layout/LanguageSwitcher';
import { ThemeSwitcher } from '../layout/ThemeSwitcher';
import {
  Code2,
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    id: 'student-1',
    studentId: 'B11204018',
    name: '陳宥軒 (資工三甲)',
    email: 'b11204018@university.edu.tw',
    role: '學生 (Student)',
    avatarColor: 'var(--chart-1)',
  },
  {
    id: 'student-2',
    studentId: 'B11204042',
    name: '林博宇 (資工三乙)',
    email: 'b11204042@university.edu.tw',
    role: '專題組長 (Team Lead)',
    avatarColor: 'var(--chart-5)',
  },
  {
    id: 'ta-1',
    studentId: 'TA-901',
    name: '張簡助教 (Course TA)',
    email: 'ta.se@university.edu.tw',
    role: '課程助教 (TA)',
    avatarColor: 'var(--chart-2)',
  },
];

export function LoginView({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: AppUser) => void;
}) {
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
    <div className="min-h-screen bg-canvas text-on-surface flex flex-col justify-center items-center p-4 sm:p-6 relative transition-colors">
      {/* Top-Right Theme Mode Switcher on Login Screen */}
      <div className="self-end mb-6 flex flex-wrap items-center gap-1.5 bg-surface p-1.5 rounded-full border border-outline-subtle shadow-xs">
        <LanguageSwitcher />
        <ThemeSwitcher size="sm" />
      </div>

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
                {t('app.title')}
              </h1>
              <p className="text-sm text-on-brand-banner-muted leading-relaxed">{t('auth.intro')}</p>
            </div>
          </div>

          <div className="pt-8 space-y-3 border-t border-white/15 text-xs text-on-brand-banner-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-outline shrink-0" />
              <span>{t('auth.features.design')}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success-outline shrink-0" />
              <span>{t('auth.features.comparison')}</span>
            </div>
          </div>
        </div>

        {/* Right Login Form Column (7 cols) */}
        <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-surface">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-on-surface">{t('auth.title')}</h2>
              <p className="text-xs sm:text-sm text-on-muted mt-1">{t('auth.description')}</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-danger-container border border-danger-outline text-on-danger-container text-xs font-medium">
                {errorMsg && t(errorMsg)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-muted mb-1.5">{t('auth.accountLabel')}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-on-subtle absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={accountInput}
                      onChange={(e) => setAccountInput(e.target.value)}
                      placeholder={t('auth.accountPlaceholder')}
                      className="ui-input pl-10 pr-3.5 py-2.5 text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-muted mb-1.5">{t('auth.nameLabel')}</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={t('auth.namePlaceholder')}
                    className="ui-input px-3.5 py-2.5 text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-on-muted mb-1.5">{t('auth.passwordLabel')}</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-on-subtle absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={t('auth.passwordPlaceholder')}
                      className="ui-input pl-10 pr-10 py-2.5 text-sm font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-on-subtle hover:text-on-surface transition"
                      title={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-muted mb-1.5">{t('auth.roleLabel')}</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="ui-input px-3.5 py-2.5 text-sm font-medium"
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
                  className="w-full py-3 px-6 rounded-full bg-secondary hover:bg-secondary-hover text-on-secondary font-semibold text-sm shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition"
                >
                  <span>{t('auth.submit')}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick One-Click Demo Accounts */}
            <div className="pt-4 border-t border-outline space-y-2.5">
              <div className="text-xs font-semibold text-on-muted flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-secondary" />
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
                        ? 'bg-secondary-container/60 border-secondary text-on-secondary-container'
                        : 'bg-surface-sunken hover:bg-surface-hover border-outline text-on-surface'
                    }`}
                  >
                    <div
                      style={{ backgroundColor: acct.avatarColor }}
                      className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                    >
                      {acct.name.slice(0, 1)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{acct.name}</div>
                      <div className="text-[10px] text-on-muted font-mono truncate">
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
