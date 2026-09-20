import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useClinic, hasPracticeMembership, getPhysicalFileNumber, getPatientFileNumberDisplay } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import {
  Search,
  Plus,
  Eye,
  CalendarPlus,
  CreditCard,
  Sparkles,
  Stethoscope,
  Users,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal
} from 'lucide-react';
import { PatientDetailModal } from './PatientDetailModal';
import type { PracticeType } from '../../types';

type SortField = 'fileNumber' | 'name' | 'mobile' | 'nationalId' | 'balance';
type SortDirection = 'asc' | 'desc';

type FinancialStatusFilter = 'settled' | 'positive' | 'negative';

interface AppliedFilters {
  financialStatus: FinancialStatusFilter[];
  practice: PracticeType[];
}

const INITIAL_FILTERS: AppliedFilters = {
  financialStatus: [],
  practice: []
};

export const PatientDirectoryView: React.FC = () => {
  const {
    scope,
    patients,
    setSelectedPatient,
    selectedPatient,
    setIsNewPatientOpen,
    openNewAppointment,
    openPaymentCollection
  } = useClinic();

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Sort state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

  // Filter Panel state
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const [stagedFilters, setStagedFilters] = useState<AppliedFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(INITIAL_FILTERS);

  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);

  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Close filter panel on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Prune local practice filters outside active Top Bar scope when scope changes
  useEffect(() => {
    if (scope !== 'unified') {
      setAppliedFilters(prev => {
        const valid = prev.practice.filter(p => p === scope);
        if (valid.length === prev.practice.length) return prev;
        return { ...prev, practice: valid as PracticeType[] };
      });
      setStagedFilters(prev => {
        const valid = prev.practice.filter(p => p === scope);
        if (valid.length === prev.practice.length) return prev;
        return { ...prev, practice: valid as PracticeType[] };
      });
    }
  }, [scope]);

  // Sync staged filters when opening panel
  const handleOpenFilterPanel = () => {
    const currentPracticeFilters = scope !== 'unified'
      ? appliedFilters.practice.filter(p => p === scope)
      : appliedFilters.practice;

    setStagedFilters({
      ...appliedFilters,
      practice: currentPracticeFilters
    });
    setIsFilterOpen(prev => !prev);
  };

  // Base scope filtering
  const scopePatients = useMemo(() => {
    return patients.filter(p => hasPracticeMembership(p, scope));
  }, [patients, scope]);

  // Search filtering
  const searchFilteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return scopePatients;
    const q = searchQuery.toLowerCase().trim();
    return scopePatients.filter(p => {
      const hasMatchName = p.name.toLowerCase().includes(q);
      const hasMatchMobile = p.mobile.includes(q);
      const hasMatchFile = (p.fileNumber && p.fileNumber.toLowerCase().includes(q)) ||
        getPhysicalFileNumber(p, 'dental').includes(q) ||
        getPhysicalFileNumber(p, 'aesthetic').includes(q);
      const hasMatchNational = p.nationalId && p.nationalId.includes(q);
      return hasMatchName || hasMatchMobile || hasMatchFile || hasMatchNational;
    });
  }, [scopePatients, searchQuery]);

  // Generic Filter logic (Group OR, Inter-group AND)
  const filterFilteredPatients = useMemo(() => {
    return searchFilteredPatients.filter(patient => {
      // 1. Financial Status Group (OR logic)
      if (appliedFilters.financialStatus.length > 0) {
        const matchesFinancial = appliedFilters.financialStatus.some(status => {
          if (status === 'settled') return patient.balance === 0;
          if (status === 'positive') return patient.balance > 0;
          if (status === 'negative') return patient.balance < 0;
          return false;
        });
        if (!matchesFinancial) return false;
      }

      // 2. Practice Membership Group (OR logic)
      if (appliedFilters.practice.length > 0) {
        const matchesPractice = appliedFilters.practice.some(pType =>
          hasPracticeMembership(patient, pType)
        );
        if (!matchesPractice) return false;
      }

      return true;
    });
  }, [searchFilteredPatients, appliedFilters]);

  // Sorting logic on entire filtered dataset
  const sortedPatients = useMemo(() => {
    if (!sortField || !sortDirection) return filterFilteredPatients;

    return [...filterFilteredPatients].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'fa');
      } else if (sortField === 'mobile') {
        comparison = a.mobile.localeCompare(b.mobile);
      } else if (sortField === 'nationalId') {
        const natA = a.nationalId || '';
        const natB = b.nationalId || '';
        comparison = natA.localeCompare(natB);
      } else if (sortField === 'balance') {
        comparison = a.balance - b.balance;
      } else if (sortField === 'fileNumber') {
        const numAStr = getPhysicalFileNumber(a, scope) || a.fileNumber || '';
        const numBStr = getPhysicalFileNumber(b, scope) || b.fileNumber || '';
        const numA = parseInt(numAStr.replace(/\D/g, ''), 10);
        const numB = parseInt(numBStr.replace(/\D/g, ''), 10);
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = numAStr.localeCompare(numBStr, 'fa');
        }
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filterFilteredPatients, sortField, sortDirection, scope]);

  // Reset pagination on search, filter, or sort changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleApplyFilters = () => {
    setAppliedFilters(stagedFilters);
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setStagedFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setIsFilterOpen(false);
    setCurrentPage(1);
  };

  const handleRemoveSingleFilter = (type: keyof AppliedFilters, value: string) => {
    const updated = {
      ...appliedFilters,
      [type]: (appliedFilters[type] as string[]).filter(v => v !== value)
    } as AppliedFilters;
    setAppliedFilters(updated);
    setStagedFilters(updated);
    setCurrentPage(1);
  };

  // Toggle Column Sort
  const handleSortClick = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection('asc');
    } else {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    }
    setCurrentPage(1);
  };

  // Pagination slicing
  const totalItems = sortedPatients.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const activePage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const paginatedPatients = sortedPatients.slice(startIndex, startIndex + pageSize);

  // Active filter count calculation
  const activeFiltersCount = appliedFilters.financialStatus.length + appliedFilters.practice.length;

  return (
    <div className="space-y-6 pb-12">

      {/* Header & Search / Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-lg font-bold text-slate-800">بانک جامع پرونده‌های دیجیتال بیماران</h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            جستجوی سریع پرونده، سوابق درمان و گردش مالی بیماران
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="جستجو با نام، موبایل، کد ملی یا پرونده..."
              className="bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-1.5 text-xs font-semibold text-slate-800 outline-none w-64 focus:border-indigo-500 focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Popover Button */}
          <div className="relative" ref={filterPanelRef}>
            <button
              onClick={handleOpenFilterPanel}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${activeFiltersCount > 0 || isFilterOpen
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
              <span>فیلترها</span>
              {activeFiltersCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                  {toFarsiDigits(activeFiltersCount)}
                </span>
              )}
            </button>

            {/* Filter Popover Panel */}
            {isFilterOpen && (
              <div className="absolute left-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-xs font-bold text-slate-800">فیلتر پیشرفته پرونده‌ها</h3>
                  </div>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-4 max-h-80 overflow-y-auto pr-1">

                  {/* Financial Status Filter Group */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-2">
                      وضعیت مالی بیمار:
                    </label>
                    <div className="space-y-1.5">
                      {[
                        { id: 'negative', label: 'بالانس منفی (بدهکار)', color: 'text-rose-600' },
                        { id: 'positive', label: 'بالانس مثبت (بستانکار)', color: 'text-emerald-600' },
                        { id: 'settled', label: 'تسویه کامل', color: 'text-slate-600' }
                      ].map(opt => {
                        const isChecked = stagedFilters.financialStatus.includes(opt.id as FinancialStatusFilter);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold cursor-pointer transition-colors ${isChecked
                                ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900'
                                : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                              }`}
                          >
                            <span className={opt.color}>{opt.label}</span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const nextStatus = e.target.checked
                                  ? [...stagedFilters.financialStatus, opt.id as FinancialStatusFilter]
                                  : stagedFilters.financialStatus.filter(s => s !== opt.id);
                                setStagedFilters({ ...stagedFilters, financialStatus: nextStatus });
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Practice / Section Filter Group */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-bold text-slate-700 block">
                        عضویت در مطب / بخش:
                      </label>
                      {scope !== 'unified' && (
                        <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          محدود شده
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { id: 'dental', label: 'دندانپزشکی', icon: Stethoscope, color: 'text-teal-700' },
                        { id: 'aesthetic', label: 'داخلی و زیبایی', icon: Sparkles, color: 'text-indigo-700' }
                      ].map(opt => {
                        const IconComp = opt.icon;
                        const isOutsideScope = scope !== 'unified' && scope !== opt.id;
                        const isChecked = stagedFilters.practice.includes(opt.id as PracticeType) && !isOutsideScope;
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center justify-between p-2 rounded-xl border text-xs font-semibold transition-colors ${isOutsideScope
                                ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed opacity-60 select-none'
                                : isChecked
                                  ? 'bg-indigo-50/60 border-indigo-200 text-indigo-900 cursor-pointer'
                                  : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700 cursor-pointer'
                              }`}
                            title={isOutsideScope ? 'این بخش خارج از محدوده مطب انتخاب‌شده در Top Bar است' : undefined}
                          >
                            <div className="flex items-center gap-1.5">
                              <IconComp className={`w-3.5 h-3.5 ${isOutsideScope ? 'text-slate-400' : opt.color}`} />
                              <span>{opt.label}</span>
                              {isOutsideScope && (
                                <span className="text-[10px] text-slate-400 font-normal mr-1">
                                  (خارج از Scope فعلی)
                                </span>
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOutsideScope}
                              onChange={(e) => {
                                if (isOutsideScope) return;
                                const nextPractices = e.target.checked
                                  ? [...stagedFilters.practice, opt.id as PracticeType]
                                  : stagedFilters.practice.filter(p => p !== opt.id);
                                setStagedFilters({ ...stagedFilters, practice: nextPractices });
                              }}
                              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* Panel Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100 mt-4">
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>پاک کردن</span>
                  </button>
                  <button
                    onClick={handleApplyFilters}
                    className="px-4 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>اعمال فیلتر</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* New Patient Button */}
          <button
            onClick={() => setIsNewPatientOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ تشکیل پرونده جدید</span>
          </button>
        </div>
      </div>

      {/* Active Filter Chips Bar */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2 bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/80">
          <span className="text-xs font-bold text-indigo-900 ml-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            <span>فیلترهای فعال ({toFarsiDigits(activeFiltersCount)}):</span>
          </span>

          {appliedFilters.financialStatus.map(st => {
            const labelMap: Record<FinancialStatusFilter, string> = {
              settled: 'تسویه کامل',
              positive: 'بالانس مثبت',
              negative: 'بالانس منفی'
            };
            return (
              <span
                key={st}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold shadow-2xs"
              >
                <span>{labelMap[st]}</span>
                <button
                  onClick={() => handleRemoveSingleFilter('financialStatus', st)}
                  className="p-0.5 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer text-indigo-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          {appliedFilters.practice.map(p => {
            const labelMap: Record<PracticeType, string> = {
              dental: 'دندانپزشکی',
              aesthetic: 'داخلی و زیبایی'
            };
            return (
              <span
                key={p}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-indigo-200 text-indigo-900 rounded-lg text-xs font-bold shadow-2xs"
              >
                <span>{labelMap[p]}</span>
                <button
                  onClick={() => handleRemoveSingleFilter('practice', p)}
                  className="p-0.5 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer text-indigo-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}

          <button
            onClick={handleClearFilters}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline mr-auto cursor-pointer"
          >
            حذف همه فیلترها
          </button>
        </div>
      )}

      {/* Patients Counter & Results Indicator */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-xs">
            <Users className="w-4 h-4" />
            <span>نتایج پرونده‌ها</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white/20 text-white">
              {toFarsiDigits(totalItems)}
            </span>
          </div>

          {(activeFiltersCount > 0 || searchQuery.trim()) && (
            <span className="text-xs text-slate-500 font-medium">
              (از مجموع {toFarsiDigits(scopePatients.length)} پرونده)
            </span>
          )}
        </div>

        {/* Current Sort Indicator */}
        {sortField && sortDirection && (
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <span>مرتب‌سازی:</span>
            <span className="font-bold text-indigo-600">
              {sortField === 'name' && 'نام و نام خانوادگی'}
              {sortField === 'fileNumber' && 'شماره پرونده'}
              {sortField === 'mobile' && 'شماره موبایل'}
              {sortField === 'nationalId' && 'کد ملی'}
              {sortField === 'balance' && 'مانده حساب'}
              {' '}
              ({sortDirection === 'asc' ? 'صعودی ↑' : 'نزولی ↓'})
            </span>
            <button
              onClick={() => { setSortField(null); setSortDirection(null); }}
              className="text-slate-400 hover:text-rose-600 mr-1 cursor-pointer"
              title="حذف مرتب‌سازی"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 select-none">

                {/* File Number Header */}
                <th
                  onClick={() => handleSortClick('fileNumber')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>شماره پرونده</span>
                    <span className="text-slate-400 group-hover:text-indigo-600">
                      {sortField === 'fileNumber' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Patient Name Header */}
                <th
                  onClick={() => handleSortClick('name')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>نام و نام خانوادگی</span>
                    <span className="text-slate-400 group-hover:text-indigo-600">
                      {sortField === 'name' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Mobile Header */}
                <th
                  onClick={() => handleSortClick('mobile')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>شماره موبایل</span>
                    <span className="text-slate-400 group-hover:text-indigo-600">
                      {sortField === 'mobile' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* National ID Header */}
                <th
                  onClick={() => handleSortClick('nationalId')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>کد ملی</span>
                    <span className="text-slate-400 group-hover:text-indigo-600">
                      {sortField === 'nationalId' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Memberships Header */}
                <th className="py-3.5 px-4">عضویت در مطب‌ها</th>

                {/* Balance Header */}
                <th
                  onClick={() => handleSortClick('balance')}
                  className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors group"
                >
                  <div className="flex items-center gap-1.5">
                    <span>مانده حساب / تراز</span>
                    <span className="text-slate-400 group-hover:text-indigo-600">
                      {sortField === 'balance' ? (
                        sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600 font-bold" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60 group-hover:opacity-100" />
                      )}
                    </span>
                  </div>
                </th>

                {/* Actions Header */}
                <th className="py-3.5 px-4 text-center">عملیات پرونده</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <span>هیچ پرونده‌ای با این مشخصات یافت نشد.</span>
                      {(activeFiltersCount > 0 || searchQuery) && (
                        <button
                          onClick={() => {
                            handleSearchChange('');
                            handleClearFilters();
                          }}
                          className="mt-1 text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
                        >
                          پاک کردن فیلترها و جستجو
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedPatients.map((patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/80 transition-colors">

                    {/* File Number */}
                    <td className="py-3.5 px-4 font-bold text-indigo-600 dir-ltr text-right">
                      {toFarsiDigits(getPatientFileNumberDisplay(patient, scope))}
                    </td>

                    {/* Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {patient.name.charAt(0)}
                        </div>
                        <span className="font-bold text-slate-800">{patient.name}</span>
                      </div>
                    </td>

                    {/* Mobile */}
                    <td className="py-3.5 px-4 font-bold text-slate-700 dir-ltr text-right">
                      {toFarsiDigits(patient.mobile)}
                    </td>

                    {/* National ID */}
                    <td className="py-3.5 px-4 text-slate-500 font-semibold">
                      {patient.nationalId ? toFarsiDigits(patient.nationalId) : '-'}
                    </td>

                    {/* Practice Memberships */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {hasPracticeMembership(patient, 'dental') && (
                          <span className="px-2.5 py-1 bg-teal-50 text-teal-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                            <Stethoscope className="w-3 h-3 text-teal-500" /> دندانپزشکی
                          </span>
                        )}
                        {hasPracticeMembership(patient, 'aesthetic') && (
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-[10px] flex items-center gap-1 w-max">
                            <Sparkles className="w-3 h-3 text-indigo-500" /> زیبایی
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Account Balance */}
                    <td className="py-3.5 px-4">
                      {patient.balance < 0 && (
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-[11px] inline-block">
                          بدهکار ({formatCurrency(Math.abs(patient.balance))})
                        </span>
                      )}
                      {patient.balance > 0 && (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[11px] inline-block">
                          بستانکار ({formatCurrency(patient.balance)})
                        </span>
                      )}
                      {patient.balance === 0 && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-semibold rounded-lg text-[11px] inline-block">
                          تسویه کامل
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">

                        <button
                          onClick={() => setSelectedPatient(patient)}
                          className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>مشاهده پرونده</span>
                        </button>

                        <button
                          onClick={() => openNewAppointment({ patient })}
                          className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          <span>نوبت</span>
                        </button>

                        {patient.balance < 0 && (
                          <button
                            onClick={() => openPaymentCollection(patient)}
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>تسویه</span>
                          </button>
                        )}

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination Footer */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 bg-slate-50/80 border-t border-slate-200 text-xs text-slate-600 font-semibold">
            <div>
              <span>نمایش </span>
              <span className="font-bold text-slate-800">{toFarsiDigits(startIndex + 1)}</span>
              <span> تا </span>
              <span className="font-bold text-slate-800">{toFarsiDigits(Math.min(startIndex + pageSize, totalItems))}</span>
              <span> از کل </span>
              <span className="font-bold text-slate-800">{toFarsiDigits(totalItems)}</span>
              <span> پرونده</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={activePage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5"
              >
                <ChevronRight className="w-4 h-4" />
                <span>قبلی</span>
              </button>

              <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-800">
                صفحه {toFarsiDigits(activePage)} از {toFarsiDigits(totalPages)}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={activePage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white text-slate-700 transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center gap-1 px-2.5"
              >
                <span>بعدی</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Patient Digital Profile Drawer */}
      {selectedPatient && (
        <PatientDetailModal
          patient={selectedPatient}
          onClose={() => setSelectedPatient(null)}
        />
      )}

    </div>
  );
};
