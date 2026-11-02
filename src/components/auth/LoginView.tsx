import { useI18n } from '../../i18n';
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
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accountInput.trim()) {
      setErrorMsg('請輸入學號或電子郵件帳號');
      return;
    }
    if (!passwordInput.trim()) {
      setErrorMsg('請輸入登入密碼');
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
      <div className="self-end mb-6 flex flex-wrap items-center gap-1 bg-white dark:bg-[#1E1F23] p-1 rounded-full border border-slate-200 dark:border-[#33353A] shadow-xs">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => onChangeThemeMode?.('system')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
            themeMode === 'system'
              ? 'bg-[#D3E3FD] dark:bg-[#004A77] text-[#041E49] dark:text-[#C2E7FF]'
              : 'text-[#444746] dark:text-[#C4C7C5]'
          }`}
        >
          <Monitor className="w-3.5 h-3.5" />
          <span>{t("自動")}</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeThemeMode?.('light')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
            themeMode === 'light'
              ? 'bg-[#D3E3FD] text-[#041E49]'
              : 'text-[#444746] dark:text-[#C4C7C5]'
          }`}
        >
          <Sun className="w-3.5 h-3.5" />
          <span>{t("淺色")}</span>
        </button>
        <button
          type="button"
          onClick={() => onChangeThemeMode?.('dark')}
          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold transition ${
            themeMode === 'dark'
              ? 'bg-[#004A77] text-[#C2E7FF]'
              : 'text-[#444746] dark:text-[#C4C7C5]'
          }`}
        >
          <Moon className="w-3.5 h-3.5" />
          <span>{t("深色")}</span>
        </button>
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
              <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-xs font-medium tracking-wide">
                Material Design 3 Edition
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug">
                CodePulse Edu
                <br />{t("課程作業平台")}</h1>
              <p className="text-sm text-blue-100 leading-relaxed">{t("整合基礎 Python 線上評測（Pyodide + 編輯行為追蹤 + AI 助教）與進階軟體工程專題（C4 架構圖設計 + GitHub 架構比對）。")}</p>
            </div>
          </div>

          <div className="pt-8 space-y-3 border-t border-white/15 text-xs text-blue-100">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{t("即時記錄插入、刪除、替換三種編輯操作")}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{t("自動比對 C4 架構圖與 GitHub 檔案結構")}</span>
            </div>
          </div>
        </div>

        {/* Right Login Form Column (7 cols) */}
        <div className="md:col-span-7 p-7 sm:p-10 flex flex-col justify-between bg-white dark:bg-[#1E1F23]">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#1F1F1F] dark:text-[#E3E2E6]">{t("登入課程作業系統")}</h2>
              <p className="text-xs sm:text-sm text-[#444746] dark:text-[#C4C7C5] mt-1">{t("請輸入您的學號與密碼，或點選下方快速測試帳號直接登入儀表板")}</p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#FAD2CF] dark:bg-[#8C1D18]/40 border border-[#F28B82] text-[#B3261E] dark:text-[#F2B8B5] text-xs font-medium">
                {t(errorMsg)}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t("學號 / 帳號 (Student ID)")}</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={accountInput}
                      onChange={(e) => setAccountInput(e.target.value)}
                      placeholder={t("例如: B11204018")}
                      className="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-300 dark:border-[#444746] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t("姓名顯示 (Display Name)")}</label>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder={t("您的姓名")}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-300 dark:border-[#444746] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t("密碼 (Password)")}</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder={t("請輸入密碼")}
                      className="w-full pl-10 pr-10 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-300 dark:border-[#444746] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-800"
                      title={showPassword ? t("隱藏密碼") : t("顯示密碼")}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] mb-1.5">{t("登入身分 (Role)")}</label>
                  <select
                    value={roleInput}
                    onChange={(e) => setRoleInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#F8FAFD] dark:bg-[#121316] border border-slate-300 dark:border-[#444746] rounded-xl text-sm text-[#1F1F1F] dark:text-[#E3E2E6] font-medium focus:outline-hidden focus:ring-2 focus:ring-[#0B57D0]"
                  >
                    <option value="學生 (Student)">{t("學生 (Student)")}</option>
                    <option value="專題組長 (Team Lead)">{t("專題組長 (Team Lead)")}</option>
                    <option value="課程助教 (TA)">{t("課程助教 (TA)")}</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 px-6 rounded-full bg-[#0B57D0] hover:bg-[#0842A0] text-white font-semibold text-sm shadow-xs hover:shadow-md flex items-center justify-center gap-2 transition"
                >
                  <span>{t("登入進入作業儀表板")}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick One-Click Demo Accounts */}
            <div className="pt-4 border-t border-slate-200 dark:border-[#33353A] space-y-2.5">
              <div className="text-xs font-semibold text-[#444746] dark:text-[#C4C7C5] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0B57D0] dark:text-[#A8C7FA]" />
                <span>{t("快速切換測試帳號（點擊帶入並可立即登入）：")}</span>
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
                        : 'bg-[#F8FAFD] dark:bg-[#121316] hover:bg-slate-100 dark:hover:bg-[#282A2F] border-slate-200 dark:border-[#33353A] text-[#1F1F1F] dark:text-[#E3E2E6]'
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
