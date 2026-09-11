import React, { useState, useRef, useEffect } from 'react';
import type { ServiceItem } from '../../types';
import { formatCurrency, toEnglishDigits } from '../../utils/persianUtils';
import { Search, ChevronDown, X, Check } from 'lucide-react';

interface SearchableServiceSelectProps {
  services: ServiceItem[];
  selectedServiceId: string;
  onChange: (serviceId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const SearchableServiceSelect: React.FC<SearchableServiceSelectProps> = ({
  services,
  selectedServiceId,
  onChange,
  placeholder = 'جستجوی خدمت...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter services based on search query
  const filteredServices = services.filter((s) => {
    if (!searchQuery.trim()) return true;
    const qEng = toEnglishDigits(searchQuery).toLowerCase().trim();
    const nameMatch = s.name.toLowerCase().includes(qEng) || s.name.includes(searchQuery.trim());
    const codeMatch = s.code ? s.code.toLowerCase().includes(qEng) : false;
    const descMatch = s.description ? s.description.toLowerCase().includes(qEng) : false;
    return nameMatch || codeMatch || descMatch;
  });

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
    setIsOpen(false);
  };

  return (
    <div className="relative w-full text-right" ref={containerRef}>
      {/* Selector Trigger Input Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none flex items-center justify-between transition-all shadow-2xs ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-60' : 'hover:bg-slate-100/80 cursor-pointer focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
          }`}
      >
        {selectedService ? (
          <div className="flex items-center justify-between w-full min-w-0">
            <span className="text-slate-900 font-bold text-xs truncate">
              {selectedService.name} ({formatCurrency(selectedService.price)})
            </span>
            <div className="flex items-center gap-1.5 shrink-0 mr-2">
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-slate-600 transition-colors"
                title="پاک کردن خدمت انتخاب‌شده"
              >
                <X className="w-3.5 h-3.5" />
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between w-full text-slate-400">
            <span className="font-normal text-xs">{placeholder}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        )}
      </button>

      {/* Searchable Dropdown Overlay */}
      {isOpen && (
        <div className="absolute z-50 right-0 left-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 space-y-2 max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Search Box */}
          <div className="relative shrink-0">
            <Search className="w-4 h-4 text-indigo-600 absolute right-3 top-2.5 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی خدمت..."
              className="w-full bg-slate-100 border border-slate-200 rounded-xl pr-9 pl-8 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtered Services List */}
          <div className="overflow-y-auto max-h-52 space-y-1 pr-0.5">
            {filteredServices.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-medium">
                خدمتی یافت نشد
              </div>
            ) : (
              filteredServices.map((srv) => {
                const isSelected = srv.id === selectedServiceId;
                return (
                  <div
                    key={srv.id}
                    onClick={() => {
                      onChange(srv.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${isSelected
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                        : 'bg-slate-50/70 border-slate-100 hover:bg-indigo-50/50 hover:border-slate-200 text-slate-800 font-semibold'
                      }`}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold truncate">{srv.name}</span>
                        {srv.code && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200/80 text-slate-600 rounded font-bold shrink-0">
                            {srv.code}
                          </span>
                        )}
                      </div>
                      {srv.description && (
                        <span className="text-[10px] text-slate-500 font-normal truncate">
                          {srv.description}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 mr-2">
                      <span className="text-xs font-black text-indigo-700 dir-ltr">
                        {formatCurrency(srv.price)}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
