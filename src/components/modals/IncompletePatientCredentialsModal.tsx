import React, { useState } from 'react';
import { X, Check, Copy, UserCheck, Key } from 'lucide-react';
import { toFarsiDigits } from '../../utils/persianUtils';
import type { Patient } from '../../types';

interface IncompletePatientCredentialsModalProps {
  patient: Patient;
  onClose: () => void;
}

export const IncompletePatientCredentialsModal: React.FC<IncompletePatientCredentialsModalProps> = ({
  patient,
  onClose
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const username = patient.loginCredentials?.username || patient.mobile;
  const password = patient.loginCredentials?.password || 'cl-123456';

  const textToCopy = `اطلاعات ورود به سیستم کلینیک:
نام بیمار: ${patient.name}
شماره پرونده: ${patient.fileNumber}
شماره موبایل: ${patient.mobile}
نام کاربری: ${username}
رمز عبور: ${password}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm">
            <UserCheck className="w-5 h-5 text-emerald-600" />
            <span>پرونده جدید ایجاد شد (در انتظار تکمیل)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Info Summary */}
        <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
          <div className="flex justify-between items-center text-slate-800 font-bold">
            <span>نام بیمار:</span>
            <span className="text-slate-900 font-black">{patient.name}</span>
          </div>
          <div className="flex justify-between items-center text-slate-800 font-semibold">
            <span>شماره موبایل:</span>
            <span className="dir-ltr text-indigo-700 font-bold">{toFarsiDigits(patient.mobile)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-800 font-semibold">
            <span>شماره پرونده اختصاصی:</span>
            <span className="dir-ltr text-emerald-700 font-mono font-bold">{toFarsiDigits(patient.fileNumber)}</span>
          </div>
        </div>

        {/* Login Credentials Box */}
        <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3">
          <div className="flex items-center gap-1.5 text-indigo-900 font-bold text-xs">
            <Key className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>اطلاعات ورود بیمار به وبسایت کلینیک:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-white rounded-xl border border-indigo-100">
              <span className="block text-[10px] text-slate-400 font-bold mb-0.5">نام کاربری:</span>
              <span className="block dir-ltr text-right font-mono font-bold text-indigo-950 text-xs truncate">
                {toFarsiDigits(username)}
              </span>
            </div>

            <div className="p-2.5 bg-white rounded-xl border border-indigo-100">
              <span className="block text-[10px] text-slate-400 font-bold mb-0.5">رمز عبور موقت:</span>
              <span className="block dir-ltr text-right font-mono font-bold text-indigo-950 text-xs truncate">
                {toFarsiDigits(password)}
              </span>
            </div>
          </div>
        </div>

        {/* Guidance Text */}
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed bg-amber-50/80 border border-amber-200/80 p-3 rounded-xl">
          💡 <strong>راهنمای منشی:</strong> این بیمار با انجام اولین عملیات مالی دارای پرونده اختصاصی گردید. اطلاعات ورود فوق را در اختیار بیمار قرار دهید تا در مراجعه بعدی با ورود به وبسایت کلینیک، اطلاعات تکمیلی پرونده پزشکی خود را کامل کند.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleCopy}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
            }`}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'اطلاعات کپی شد!' : 'کپی اطلاعات ورود'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            بستن
          </button>
        </div>

      </div>
    </div>
  );
};
