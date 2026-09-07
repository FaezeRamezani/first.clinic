import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { toFarsiDigits, formatCurrency } from '../../utils/persianUtils';
import { Search, X } from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const { isGlobalSearchOpen, setIsGlobalSearchOpen, patients, setSelectedPatient } = useClinic();
  const [query, setQuery] = useState<string>('');

  if (!isGlobalSearchOpen) return null;

  const results = query.trim() === '' ? [] : patients.filter(p => {
    const q = query.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      p.fileNumber.toLowerCase().includes(q) ||
      p.nationalId.includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-4 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 bg-slate-100 px-4 py-3 rounded-2xl border border-slate-200">
          <Search className="w-5 h-5 text-indigo-600" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی سریع بیمار با نام، شماره پرونده، کلید کد ملی یا شماره موبایل..."
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button onClick={() => setIsGlobalSearchOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Results List */}
        <div className="max-h-80 overflow-y-auto space-y-2">
          {query && results.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 font-medium">
              هیچ بیماری با مشخصات «{query}» پیدا نشد.
            </div>
          )}

          {!query && (
            <div className="py-6 text-center text-xs text-slate-400 font-medium">
              برای جستجو شروع به تایپ کنید... (مثلاً مریم حسینی، CL-1001 یا 0912...)
            </div>
          )}

          {results.map((pat) => (
            <div
              key={pat.id}
              onClick={() => {
                setIsGlobalSearchOpen(false);
                setSelectedPatient(pat);
              }}
              className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-2xl border border-slate-200 cursor-pointer transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 font-bold flex items-center justify-center text-sm shadow-2xs">
                  {pat.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">{pat.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-indigo-100 text-indigo-800 rounded font-bold">
                      {toFarsiDigits(pat.fileNumber)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    موبایل: {toFarsiDigits(pat.mobile)} • کد ملی: {toFarsiDigits(pat.nationalId)}
                  </p>
                </div>
              </div>

              <div className="text-left">
                <span className={`text-[11px] font-bold ${
                  pat.balance < 0 ? 'text-rose-600' : pat.balance > 0 ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {pat.balance < 0 && `بدهکار (${formatCurrency(Math.abs(pat.balance))})`}
                  {pat.balance > 0 && `بستانکار (${formatCurrency(pat.balance)})`}
                  {pat.balance === 0 && 'تسویه کامل'}
                </span>
                <p className="text-[10px] text-indigo-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  نمایش پرونده ←
                </p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
