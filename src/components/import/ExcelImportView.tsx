import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { importApi } from '../../services/api';
import type { ImportBatch, ImportRecord, ImportCategory } from '../../types';
import { toFarsiDigits } from '../../utils/persianUtils';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  UserX,
  PhoneOff,
  Users,
  Sparkles,
  Stethoscope,
  Trash2,
  Edit3,
  GitMerge,
  UserCheck,
  RefreshCw,
  Info,
  Check,
  X
} from 'lucide-react';


export const ExcelImportView: React.FC = () => {
  const { refreshPatients } = useClinic();

  const [selectedPractice, setSelectedPractice] = useState<'aesthetic' | 'dental'>('dental');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [activeBatch, setActiveBatch] = useState<ImportBatch | null>(null);
  const [records, setRecords] = useState<ImportRecord[]>([]);
  const [activeCategoryTab, setActiveCategoryTab] = useState<ImportCategory | 'all'>('ready');
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Edit record modal state
  const [editingRecord, setEditingRecord] = useState<ImportRecord | null>(null);
  const [editPc, setEditPc] = useState<string>('');
  const [editName, setEditName] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Duplicate resolution modal state
  const [resolvingRecord, setResolvingRecord] = useState<ImportRecord | null>(null);
  const [isResolving, setIsResolving] = useState<boolean>(false);

  // Commit modal state
  const [isCommitting, setIsCommitting] = useState<boolean>(false);
  const [commitSuccessMsg, setCommitSuccessMsg] = useState<string | null>(null);

  // Fetch batches list on mount
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      const data = await importApi.getBatches();
      setBatches(data);
      if (data.length > 0 && !activeBatch) {
        loadBatchDetails(data[0].id);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const loadBatchDetails = async (batchId: string) => {
    setIsLoadingDetails(true);
    try {
      const data = await importApi.getBatchDetails(batchId);
      setActiveBatch(data.batch);
      setRecords(data.records);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const res = await importApi.uploadExcelFile(selectedFile, selectedPractice);
      setSelectedFile(null);
      await loadBatches();
      if (res.batch) {
        await loadBatchDetails(res.batch.id);
      }
    } catch (err: any) {
      setUploadError(err.message || 'خطا در آپلود فایل اکسل');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDiscardBatch = async (batchId: string) => {
    if (!window.confirm('آیا از حذف این دسته‌بندی پیش‌نمایش اطمینان دارید؟')) return;
    try {
      await importApi.deleteBatch(batchId);
      setActiveBatch(null);
      setRecords([]);
      await loadBatches();
    } catch (err: any) {
      alert(err.message || 'خطا در حذف دسته‌بندی');
    }
  };

  // Record Inline Editing
  const openEditModal = (rec: ImportRecord) => {
    setEditingRecord(rec);
    setEditPc(rec.rawPc || '');
    setEditName(rec.rawName || '');
    setEditPhone(rec.rawPhone || '');
  };

  const handleSaveRecordEdit = async () => {
    if (!editingRecord || !activeBatch) return;
    setIsSavingEdit(true);
    try {
      await importApi.updateRecord(editingRecord.id, {
        rawPc: editPc,
        rawName: editName,
        rawPhone: editPhone
      });
      setEditingRecord(null);
      await loadBatchDetails(activeBatch.id);
    } catch (err: any) {
      alert(err.message || 'خطا در ویرایش رکورد');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Duplicate Resolution Action
  const handleDuplicateDecision = async (
    resolution: 'merged_same_person' | 'separate_different_person' | 'ignored'
  ) => {
    if (!resolvingRecord || !activeBatch) return;
    setIsResolving(true);
    try {
      await importApi.resolveDuplicate(
        resolvingRecord.id,
        resolution,
        resolvingRecord.duplicateTargetPatientId || undefined
      );
      setResolvingRecord(null);
      await loadBatchDetails(activeBatch.id);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت تصمیم تکرار');
    } finally {
      setIsResolving(false);
    }
  };

  // Final Commit Action
  const handleFinalCommit = async () => {
    if (!activeBatch) return;
    const confirmMsg = `آیا از ورود نهایی رکوردهای معتبر به دیتابیس اصلی کلینیک اطمینان دارید؟\nاین عملیات رکوردهای معتبر را به عنوان «پرونده‌های بیماران» وارد سیستم می‌کند.`;
    if (!window.confirm(confirmMsg)) return;

    setIsCommitting(true);
    try {
      const res = await importApi.commitBatch(activeBatch.id);
      setCommitSuccessMsg(res.message);
      await refreshPatients();
      await loadBatches();
      await loadBatchDetails(activeBatch.id);
    } catch (err: any) {
      alert(err.message || 'خطا در ثبت نهایی اکسل');
    } finally {
      setIsCommitting(false);
    }
  };

  // Counts calculation
  const readyRecords = records.filter(r => r.category === 'ready');
  const missingNameRecords = records.filter(r => r.category === 'missing_name');
  const missingPcRecords = records.filter(r => r.category === 'missing_pc');
  const invalidPhoneRecords = records.filter(r => r.category === 'invalid_phone');
  const duplicateRecords = records.filter(r => r.category === 'duplicate');

  const filteredRecords = activeCategoryTab === 'all'
    ? records
    : records.filter(r => r.category === activeCategoryTab);

  return (
    <div className="space-y-6 pb-16">
      {/* Upload Form Box */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-indigo-600" />
          <span>بارگذاری فایل Excel جدید</span>
        </h3>

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Practice Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              ۱. فایل اکسل مربوط به کدام مطب می‌باشد؟
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPractice === 'dental'
                    ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-500/20 text-teal-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="practice"
                  value="dental"
                  checked={selectedPractice === 'dental'}
                  onChange={() => setSelectedPractice('dental')}
                  className="hidden"
                />
                <div className="p-2 rounded-lg bg-white border border-teal-200 text-teal-600">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block font-extrabold">مطب دندانپزشکی</span>
                  <span className="text-[10px] text-slate-500 font-medium">ذخیره شماره پرونده در عضویت دندانپزشکی</span>
                </div>
              </label>

              <label
                className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPractice === 'aesthetic'
                    ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 text-purple-950 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <input
                  type="radio"
                  name="practice"
                  value="aesthetic"
                  checked={selectedPractice === 'aesthetic'}
                  onChange={() => setSelectedPractice('aesthetic')}
                  className="hidden"
                />
                <div className="p-2 rounded-lg bg-white border border-purple-200 text-purple-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs block font-extrabold">مطب زیبایی</span>
                  <span className="text-[10px] text-slate-500 font-medium">ذخیره شماره پرونده در عضویت پوست و زیبایی</span>
                </div>
              </label>
            </div>
          </div>

          {/* File Drag & Drop Zone */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block">
              ۲. فایل Excel را انتخاب یا رها کنید (.xlsx یا .xls)
            </label>
            <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors relative cursor-pointer group">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center gap-2">
                <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-extrabold text-indigo-700">{selectedFile.name}</p>
                    <p className="text-[10px] text-slate-500 font-medium">
                      حجم فایل: {toFarsiDigits((selectedFile.size / 1024).toFixed(1))} کیلوبایت
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">کلیک کنید یا فایل اکسل را اینجا بکشید</p>
                    <p className="text-[10px] text-slate-400">
                      ستون A = شماره پرونده (PC) | ستون B = نام و نام‌خانوادگی | ستون C = شماره همراه (PN)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {uploadError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                !selectedFile || isUploading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer'
              }`}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>در حال خواندن و اعتبارسنجی اکسل...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>شروع خواندن و اعتبارسنجی Excel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* History of Previous Upload Batches */}
      {batches.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700">فایل‌های اکسل بارگذاری‌شده قبلی</h4>
            <span className="text-[10px] text-slate-400">مجموع: {toFarsiDigits(batches.length)} فایل</span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {batches.map((b) => {
              const isSelected = activeBatch?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => loadBatchDetails(b.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>{b.fileName}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                    b.status === 'committed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {b.status === 'committed' ? 'ثبت نهایی شده' : 'پیش‌نمایش'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Notification Banner */}
      {commitSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 text-xs font-extrabold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{commitSuccessMsg}</span>
          </div>
          <button onClick={() => setCommitSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Review & Staging Dashboard */}
      {activeBatch && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
          
          {/* Batch Title & Meta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900">{activeBatch.fileName}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeBatch.practice === 'dental'
                    ? 'bg-teal-100 text-teal-800 border border-teal-200'
                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                }`}>
                  {activeBatch.practice === 'dental' ? 'مطب دندانپزشکی' : 'مطب زیبایی'}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeBatch.status === 'committed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {activeBatch.status === 'committed' ? 'ثبت نهایی شده در دیتابیس' : 'مرحله Review (پیش‌نمایش)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                تاریخ بارگذاری: {toFarsiDigits(activeBatch.createdAt)} | کل رکوردهای خوانده‌شده: {toFarsiDigits(activeBatch.totalRecords)} رکورد
              </p>
            </div>

            <div className="flex items-center gap-2">
              {activeBatch.status !== 'committed' && (
                <button
                  onClick={handleFinalCommit}
                  disabled={isCommitting || readyRecords.length === 0}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                    readyRecords.length === 0 || isCommitting
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>تأیید و ثبت نهایی رکوردهای معتبر ({toFarsiDigits(readyRecords.length)})</span>
                </button>
              )}

              <button
                onClick={() => handleDiscardBatch(activeBatch.id)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-rose-200"
                title="حذف پیش‌نمایش این فایل"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 5 Main Category Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            
            {/* Card 1: Ready */}
            <div
              onClick={() => setActiveCategoryTab('ready')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeCategoryTab === 'ready'
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/20'
                  : 'bg-emerald-50/50 border-emerald-200 text-emerald-950 hover:bg-emerald-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold">آماده ورود</span>
                <CheckCircle2 className={`w-4 h-4 ${activeCategoryTab === 'ready' ? 'text-white' : 'text-emerald-600'}`} />
              </div>
              <p className="text-xl font-black">{toFarsiDigits(readyRecords.length)}</p>
              <p className={`text-[10px] mt-1 ${activeCategoryTab === 'ready' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                اطلاعات کاملاً معتبر
              </p>
            </div>

            {/* Card 2: Missing Name */}
            <div
              onClick={() => setActiveCategoryTab('missing_name')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeCategoryTab === 'missing_name'
                  ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-amber-50/50 border-amber-200 text-amber-950 hover:bg-amber-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold">نیازمند تکمیل نام</span>
                <UserX className={`w-4 h-4 ${activeCategoryTab === 'missing_name' ? 'text-white' : 'text-amber-600'}`} />
              </div>
              <p className="text-xl font-black">{toFarsiDigits(missingNameRecords.length)}</p>
              <p className={`text-[10px] mt-1 ${activeCategoryTab === 'missing_name' ? 'text-amber-100' : 'text-amber-700'}`}>
                نام خالی یا نامعتبر
              </p>
            </div>

            {/* Card 3: Missing PC */}
            <div
              onClick={() => setActiveCategoryTab('missing_pc')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeCategoryTab === 'missing_pc'
                  ? 'bg-blue-500 text-white border-blue-600 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-blue-50/50 border-blue-200 text-blue-950 hover:bg-blue-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold">نیازمند شماره پرونده</span>
                <Info className={`w-4 h-4 ${activeCategoryTab === 'missing_pc' ? 'text-white' : 'text-blue-600'}`} />
              </div>
              <p className="text-xl font-black">{toFarsiDigits(missingPcRecords.length)}</p>
              <p className={`text-[10px] mt-1 ${activeCategoryTab === 'missing_pc' ? 'text-blue-100' : 'text-blue-700'}`}>
                فقدان شماره PC
              </p>
            </div>

            {/* Card 4: Invalid Phone */}
            <div
              onClick={() => setActiveCategoryTab('invalid_phone')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeCategoryTab === 'invalid_phone'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-md ring-2 ring-rose-500/20'
                  : 'bg-rose-50/50 border-rose-200 text-rose-950 hover:bg-rose-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold">شماره‌های نیازمند پیگیری</span>
                <PhoneOff className={`w-4 h-4 ${activeCategoryTab === 'invalid_phone' ? 'text-white' : 'text-rose-600'}`} />
              </div>
              <p className="text-xl font-black">{toFarsiDigits(invalidPhoneRecords.length)}</p>
              <p className={`text-[10px] mt-1 ${activeCategoryTab === 'invalid_phone' ? 'text-rose-100' : 'text-rose-700'}`}>
                طول یا فرمت همراه اشتباه
              </p>
            </div>

            {/* Card 5: Duplicate */}
            <div
              onClick={() => setActiveCategoryTab('duplicate')}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                activeCategoryTab === 'duplicate'
                  ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-500/20'
                  : 'bg-purple-50/50 border-purple-200 text-purple-950 hover:bg-purple-100/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold">مشکوک به تکرار</span>
                <GitMerge className={`w-4 h-4 ${activeCategoryTab === 'duplicate' ? 'text-white' : 'text-purple-600'}`} />
              </div>
              <p className="text-xl font-black">{toFarsiDigits(duplicateRecords.length)}</p>
              <p className={`text-[10px] mt-1 ${activeCategoryTab === 'duplicate' ? 'text-purple-100' : 'text-purple-700'}`}>
                نیازمند بررسی منشی
              </p>
            </div>

          </div>

          {/* Staging Data Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>فهرست رکوردهای دسته:</span>
                <span className="text-indigo-600">
                  {activeCategoryTab === 'ready' && 'آماده ورود'}
                  {activeCategoryTab === 'missing_name' && 'نیازمند تکمیل نام'}
                  {activeCategoryTab === 'missing_pc' && 'نیازمند شماره پرونده'}
                  {activeCategoryTab === 'invalid_phone' && 'شماره‌های نیازمند پیگیری منشی'}
                  {activeCategoryTab === 'duplicate' && 'موارد مشکوک به تکراری'}
                  {activeCategoryTab === 'all' && 'همه رکوردها'}
                </span>
                <span className="text-slate-400 font-normal">({toFarsiDigits(filteredRecords.length)} رکورد)</span>
              </h4>

              <button
                onClick={() => setActiveCategoryTab('all')}
                className={`text-[11px] font-bold hover:underline cursor-pointer ${
                  activeCategoryTab === 'all' ? 'text-indigo-600 font-black' : 'text-slate-500'
                }`}
              >
                نمایش همه رکوردها
              </button>
            </div>

            {isLoadingDetails ? (
              <div className="py-12 text-center text-slate-400 font-bold text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>در حال بارگذاری اطلاعات Staging...</span>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 font-semibold text-xs">
                هیچ رکوردی در این دسته‌بندی وجود ندارد.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <th className="py-3 px-3">ردیف Excel</th>
                        <th className="py-3 px-3">شماره پرونده (PC)</th>
                        <th className="py-3 px-3">نام و نام خانوادگی</th>
                        <th className="py-3 px-3">شماره همراه (PN)</th>
                        <th className="py-3 px-3">اشکالات / وضعیت اعتبارسنجی</th>
                        <th className="py-3 px-3 text-center">عملیات Review</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {filteredRecords.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                            {toFarsiDigits(r.excelRowNumber)}
                          </td>

                          <td className="py-3 px-3">
                            {r.normalizedPc ? (
                              <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded dir-ltr inline-block">
                                {toFarsiDigits(r.normalizedPc)}
                              </span>
                            ) : (
                              <span className="text-rose-500 font-bold italic">بدون PC</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            {r.normalizedName ? (
                              <span className="font-extrabold text-slate-900">{r.normalizedName}</span>
                            ) : (
                              <span className="text-amber-600 font-bold italic">نامشخص</span>
                            )}
                          </td>

                          <td className="py-3 px-3 dir-ltr text-right">
                            {r.rawPhone ? (
                              <span className={`font-bold font-mono ${
                                r.category === 'invalid_phone' ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200' : 'text-indigo-700'
                              }`}>
                                {toFarsiDigits(r.rawPhone)}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">بدون شماره</span>
                            )}
                          </td>

                          <td className="py-3 px-3">
                            <div className="flex flex-wrap gap-1">
                              {r.category === 'ready' && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                                  ✓ آماده ورود
                                </span>
                              )}
                              {r.issues && r.issues.length > 0 && (
                                r.issues.map((iss, i) => (
                                  <span key={i} className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md text-[10px] font-bold">
                                    {iss}
                                  </span>
                                ))
                              )}
                              {r.category === 'duplicate' && (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                                  r.duplicateResolution === 'merged_same_person'
                                    ? 'bg-emerald-100 text-emerald-900'
                                    : r.duplicateResolution === 'separate_different_person'
                                    ? 'bg-blue-100 text-blue-900'
                                    : 'bg-purple-100 text-purple-900 border border-purple-300'
                                }`}>
                                  {r.duplicateResolution === 'merged_same_person' && 'تأیید ادغام (یک نفر)'}
                                  {r.duplicateResolution === 'separate_different_person' && 'تأیید پرونده مستقل (دو نفر)'}
                                  {r.duplicateResolution === 'unresolved' && 'مشکوک به تکرار (نیازمند تعیین تکلیف)'}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {r.category === 'duplicate' ? (
                                <button
                                  onClick={() => setResolvingRecord(r)}
                                  className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[10px] font-bold shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <GitMerge className="w-3 h-3" />
                                  <span>بررسی تکرار</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => openEditModal(r)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-500" />
                                  <span>اصلاح داده</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL 1: Edit Staging Record */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600" />
                <span>اصلاح اطلاعات ردیف {toFarsiDigits(editingRecord.excelRowNumber)} Excel</span>
              </h4>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره پرونده فیزیکی (PC):</label>
                <input
                  type="text"
                  value={editPc}
                  onChange={(e) => setEditPc(e.target.value)}
                  placeholder="مثال: 105"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">نام و نام خانوادگی بیمار:</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="مثال: مریم احمدی"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">شماره همراه (PN):</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="مثال: 09123456789"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-800 outline-none focus:border-indigo-500 dir-ltr text-right"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSaveRecordEdit}
                disabled={isSavingEdit}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {isSavingEdit ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>ذخیره و اعتبارسنجی مجدد</span>
              </button>

              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Side-by-Side Duplicate Resolution */}
      {resolvingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 my-8">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-purple-900 font-extrabold text-sm">
                <GitMerge className="w-5 h-5 text-purple-600" />
                <span>تعیین تکلیف مورد مشکوک به تکراری (ردیف {toFarsiDigits(resolvingRecord.excelRowNumber)})</span>
              </div>
              <button onClick={() => setResolvingRecord(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Duplicate Reason Alert */}
            {resolvingRecord.duplicateReason && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-2xl text-purple-900 text-xs font-bold flex items-start gap-2">
                <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>علت شک سیستم به تکراری: {resolvingRecord.duplicateReason}</span>
              </div>
            )}

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Box 1: Excel Import Record */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                  اطلاعات خام در فایل Excel (ردیف {toFarsiDigits(resolvingRecord.excelRowNumber)})
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>نام و نام خانوادگی:</span>
                  <span className="font-extrabold text-slate-900">{resolvingRecord.normalizedName || resolvingRecord.rawName || '-'}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>شماره همراه:</span>
                  <span className="font-mono font-bold text-indigo-700 dir-ltr">{toFarsiDigits(resolvingRecord.rawPhone || '-')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700">
                  <span>شماره پرونده (PC):</span>
                  <span className="font-mono font-bold text-slate-900 dir-ltr">{toFarsiDigits(resolvingRecord.normalizedPc || '-')}</span>
                </div>

                <div className="flex justify-between items-center text-slate-700 pt-1 border-t border-slate-200/60">
                  <span>مطب انتخابی Excel:</span>
                  <span className="font-bold text-purple-700">
                    {resolvingRecord.practice === 'dental' ? 'مطب دندانپزشکی' : 'مطب زیبایی'}
                  </span>
                </div>
              </div>

              {/* Box 2: Matched DB Patient */}
              <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-2">
                <div className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider mb-2">
                  پرونده منطبق در دیتابیس فعلی سیستم
                </div>

                {resolvingRecord.matchedPatient ? (
                  <>
                    <div className="flex justify-between items-center text-indigo-950">
                      <span>نام بیمار:</span>
                      <span className="font-extrabold text-indigo-950">{resolvingRecord.matchedPatient.name}</span>
                    </div>

                    <div className="flex justify-between items-center text-indigo-950">
                      <span>شماره همراه:</span>
                      <span className="font-mono font-bold text-indigo-800 dir-ltr">{toFarsiDigits(resolvingRecord.matchedPatient.mobile)}</span>
                    </div>

                    <div className="flex justify-between items-center text-indigo-950">
                      <span>شماره پرونده کلی:</span>
                      <span className="font-mono font-bold text-indigo-900 dir-ltr">{toFarsiDigits(resolvingRecord.matchedPatient.fileNumber || '-')}</span>
                    </div>

                    <div className="flex justify-between items-center text-indigo-950 pt-1 border-t border-indigo-200/60">
                      <span>عضویت در مطب‌ها:</span>
                      <span className="font-bold text-indigo-900">
                        {resolvingRecord.matchedPatient.memberships.map(m => m.practice === 'dental' ? 'دندان' : 'زیبایی').join(' + ')}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-slate-400 italic">
                    مورد منطبق ردیف دیگری در همین فایل اکسل می‌باشد.
                  </div>
                )}
              </div>

            </div>

            {/* Secretary Decision Options */}
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold text-amber-900 block">
                تأیید منشی جهت تعیین‌تکلیف تکراری:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDuplicateDecision('merged_same_person')}
                  disabled={isResolving}
                  className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>«این دو نفر یک نفر هستند» (ادغام به ۱ بیمار با ۲ عضویت مطب)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDuplicateDecision('separate_different_person')}
                  disabled={isResolving}
                  className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                  <span>«این دو نفر افراد متفاوت هستند» (ایجاد ۲ بیمار مستقل)</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setResolvingRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                بستن
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
