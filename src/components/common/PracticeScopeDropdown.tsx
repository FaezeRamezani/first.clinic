import React, { useState, useRef, useEffect } from 'react';
import { Building2, Sparkles, Stethoscope, ChevronDown, Check } from 'lucide-react';
import { useClinic } from '../../context/ClinicContext';
import type { ClinicScope } from '../../types';

interface Option {
  id: ClinicScope;
  label: string;
  subLabel: string;
  icon: React.ElementType;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  activeBg: string;
  iconColor: string;
}

export const scopeOptions: Option[] = [
  {
    id: 'unified',
    label: 'کل کلینیک',
    subLabel: 'هر دو مطب (مشترک)',
    icon: Building2,
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    borderColor: 'border-indigo-200',
    activeBg: 'bg-indigo-50/90 text-indigo-950 font-bold border-r-4 border-r-indigo-600',
    iconColor: 'text-indigo-600',
  },
  {
    id: 'aesthetic',
    label: 'داخلی و زیبایی',
    subLabel: 'مطب ۱ (پوست و زیبایی)',
    icon: Sparkles,
    badgeBg: 'bg-purple-50',
    badgeText: 'text-purple-700',
    borderColor: 'border-purple-200',
    activeBg: 'bg-purple-50/90 text-purple-950 font-bold border-r-4 border-r-purple-600',
    iconColor: 'text-purple-600',
  },
  {
    id: 'dental',
    label: 'دندانپزشکی',
    subLabel: 'مطب ۲ (دندانپزشکی)',
    icon: Stethoscope,
    badgeBg: 'bg-teal-50',
    badgeText: 'text-teal-700',
    borderColor: 'border-teal-200',
    activeBg: 'bg-teal-50/90 text-teal-950 font-bold border-r-4 border-r-teal-600',
    iconColor: 'text-teal-600',
  },
];

interface Props {
  className?: string;
  variant?: 'header' | 'compact' | 'full';
  labelPrefix?: string;
}

export const PracticeScopeDropdown: React.FC<Props> = ({ 
  className = '', 
  labelPrefix
}) => {
  const { scope, setScope } = useClinic();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = scopeOptions.find((o) => o.id === scope) || scopeOptions[0];
  const SelectedIcon = selectedOption.icon;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-right ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all duration-200 outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs hover:shadow-xs cursor-pointer ${selectedOption.badgeBg} ${selectedOption.badgeText} ${selectedOption.borderColor}`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className={`p-1 rounded-lg bg-white/80 border ${selectedOption.borderColor} shadow-2xs`}>
          <SelectedIcon className={`w-4 h-4 ${selectedOption.iconColor}`} />
        </div>
        <div className="text-right">
          {labelPrefix && <span className="block text-[10px] text-slate-400 font-normal">{labelPrefix}</span>}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-800 text-xs">{selectedOption.label}</span>
            <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">({selectedOption.subLabel})</span>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 mr-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
          role="listbox"
        >
          <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            تغییر حوزه مطب / کلینیک
          </div>
          {scopeOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = opt.id === scope;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setScope(opt.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 text-right text-xs transition-colors hover:bg-slate-50 cursor-pointer ${
                  isSelected ? opt.activeBg : 'text-slate-700'
                }`}
                role="option"
                aria-selected={isSelected}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1.5 rounded-lg ${opt.badgeBg} ${opt.badgeText} border ${opt.borderColor}`}>
                    <Icon className={`w-4 h-4 ${opt.iconColor}`} />
                  </div>
                  <div>
                    <span className="block font-bold text-slate-800">{opt.label}</span>
                    <span className="block text-[10px] text-slate-400 font-medium">{opt.subLabel}</span>
                  </div>
                </div>
                {isSelected && <Check className={`w-4 h-4 ${opt.iconColor}`} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
