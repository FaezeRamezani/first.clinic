import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X } from 'lucide-react';
import type { FollowUpStatus } from '../../types';

export const FollowUpResultModal: React.FC = () => {
  const { 
    isFollowUpResultOpen, 
    setIsFollowUpResultOpen, 
    selectedFollowUpTask, 
    updateFollowUp 
  } = useClinic();

  const task = selectedFollowUpTask;

  const [status, setStatus] = useState<FollowUpStatus>('called_confirmed');
  const [resultNote, setResultNote] = useState<string>('تماس برقرار شد و بیمار تایید نمود.');

  React.useEffect(() => {
    if (isFollowUpResultOpen && task) {
      setStatus('called_confirmed');
      setResultNote('تماس برقرار شد و بیمار تایید نمود.');
    }
  }, [isFollowUpResultOpen, task]);

  if (!isFollowUpResultOpen || !task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFollowUp(task.id, status, resultNote);
    setIsFollowUpResultOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150">
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800">ثبت وضعیت پیگیری و تماس منشی</h3>
            <p className="text-xs text-slate-500 font-medium">{task.patientName} ({task.description})</p>
          </div>
          <button onClick={() => setIsFollowUpResultOpen(false)} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          <div>
            <label className="block font-bold text-slate-700 mb-1">نتیجه پیگیری/تماس:</label>
            <select
              value={status}
              onChange={(e) => {
                const st = e.target.value as FollowUpStatus;
                setStatus(st);
                if (st === 'called_confirmed') setResultNote('تماس برقرار شد و بیمار تایید نمود.');
                else if (st === 'called_no_answer') setResultNote('تماس گرفته شد اما بیمار پاسخ نداد.');
                else if (st === 'rescheduled') setResultNote('نوبت مجدد برای تاریخ جدید هماهنگ گردید.');
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none"
            >
              <option value="called_confirmed">تماس موفق (پاسخ داد / تایید شد)</option>
              <option value="called_no_answer">تماس ناموفق (پاسخ نداد)</option>
              <option value="rescheduled">هماهنگی نوبت مجدد</option>
              <option value="completed">تکمیل ماموریت پیگیری</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">توضیحات و گزارش منشی:</label>
            <textarea
              rows={3}
              required
              value={resultNote}
              onChange={(e) => setResultNote(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsFollowUpResultOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              ثبت در کارتابل
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
