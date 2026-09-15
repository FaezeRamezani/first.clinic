import React, { useState, useEffect } from 'react';
import { useClinic, getPhysicalFileNumber, hasPracticeMembership } from '../../context/ClinicContext';
import { toFarsiDigits, formatCurrency } from '../../utils/persianUtils';
import { Search, X, Sparkles, Stethoscope } from 'lucide-react';

export const GlobalSearchModal: React.FC = () => {
  const { isGlobalSearchOpen, setIsGlobalSearchOpen, patients, setSelectedPatient } = useClinic();
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (isGlobalSearchOpen) {
      setQuery('');
    }
  }, [isGlobalSearchOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen, setIsGlobalSearchOpen]);

  if (!isGlobalSearchOpen) return null;

  const results = query.trim() === '' ? [] : patients.filter(p => {
    const q = query.toLowerCase().trim();
    const dentalFile = getPhysicalFileNumber(p, 'dental');
    const aestheticFile = getPhysicalFileNumber(p, 'aesthetic');
    return (
      p.name.toLowerCase().includes(q) ||
      p.mobile.includes(q) ||
      (p.fileNumber && p.fileNumber.toLowerCase().includes(q)) ||
      dentalFile.includes(q) ||
      aestheticFile.includes(q) ||
      (p.nationalId && p.nationalId.includes(q))
    );
  });

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setIsGlobalSearchOpen(false);
        }
      }}
      className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-16 p-4"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-4 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 bg-slate-100 px-4 py-3 rounded-2xl border border-slate-200">
          <Search className="w-5 h-5 text-indigo-600" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی سریع بیمار با نام، شماره پرونده، کد ملی یا شماره موبایل..."
            className="w-full bg-transparent text-xs font-bold text-slate-800 outline-none placeholder:text-slate-400"
          />
          <button onClick={() => setIsGlobalSearchOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
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
              برای جستجو شروع به تایپ کنید... (مثلاً مریم حسینی، 101 یا 0912...)
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
                <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 text-indigo-600 font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
                  {pat.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-700">{pat.name}</span>
                    
                    {/* Membership Badges */}
                    {hasPracticeMembership(pat, 'dental') && (
                      <span className="px-1.5 py-0.5 bg-teal-100 text-teal-900 rounded font-bold text-[10px] flex items-center gap-1">
                        <Stethoscope className="w-3 h-3 text-teal-600" />
                        <span>دندان ({toFarsiDigits(getPhysicalFileNumber(pat, 'dental') || '-')})</span>
                      </span>
                    )}
                    {hasPracticeMembership(pat, 'aesthetic') && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-900 rounded font-bold text-[10px] flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        <span>زیبایی ({toFarsiDigits(getPhysicalFileNumber(pat, 'aesthetic') || '-')})</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    موبایل: {toFarsiDigits(pat.mobile)} • کد ملی: {pat.nationalId ? toFarsiDigits(pat.nationalId) : 'ثبت نشده'}
                  </p>
                </div>
              </div>

              <div className="text-left shrink-0">
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
