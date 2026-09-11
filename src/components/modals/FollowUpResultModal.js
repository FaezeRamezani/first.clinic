import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X } from 'lucide-react';
export const FollowUpResultModal = () => {
    const { isFollowUpResultOpen, setIsFollowUpResultOpen, selectedFollowUpTask, updateFollowUp } = useClinic();
    const task = selectedFollowUpTask;
    const [status, setStatus] = useState('called_confirmed');
    const [resultNote, setResultNote] = useState('تماس برقرار شد و بیمار تایید نمود.');
    if (!isFollowUpResultOpen || !task)
        return null;
    const handleSubmit = (e) => {
        e.preventDefault();
        updateFollowUp(task.id, status, resultNote);
        setIsFollowUpResultOpen(false);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-bold text-slate-800", children: "\u062B\u0628\u062A \u0648\u0636\u0639\u06CC\u062A \u067E\u06CC\u06AF\u06CC\u0631\u06CC \u0648 \u062A\u0645\u0627\u0633 \u0645\u0646\u0634\u06CC" }), _jsxs("p", { className: "text-xs text-slate-500 font-medium", children: [task.patientName, " (", task.description, ")"] })] }), _jsx("button", { onClick: () => setIsFollowUpResultOpen(false), className: "text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u062A\u06CC\u062C\u0647 \u067E\u06CC\u06AF\u06CC\u0631\u06CC/\u062A\u0645\u0627\u0633:" }), _jsxs("select", { value: status, onChange: (e) => {
                                        const st = e.target.value;
                                        setStatus(st);
                                        if (st === 'called_confirmed')
                                            setResultNote('تماس برقرار شد و بیمار تایید نمود.');
                                        else if (st === 'called_no_answer')
                                            setResultNote('تماس گرفته شد اما بیمار پاسخ نداد.');
                                        else if (st === 'rescheduled')
                                            setResultNote('نوبت مجدد برای تاریخ جدید هماهنگ گردید.');
                                    }, className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "called_confirmed", children: "\u062A\u0645\u0627\u0633 \u0645\u0648\u0641\u0642 (\u067E\u0627\u0633\u062E \u062F\u0627\u062F / \u062A\u0627\u06CC\u06CC\u062F \u0634\u062F)" }), _jsx("option", { value: "called_no_answer", children: "\u062A\u0645\u0627\u0633 \u0646\u0627\u0645\u0648\u0641\u0642 (\u067E\u0627\u0633\u062E \u0646\u062F\u0627\u062F)" }), _jsx("option", { value: "rescheduled", children: "\u0647\u0645\u0627\u0647\u0646\u06AF\u06CC \u0646\u0648\u0628\u062A \u0645\u062C\u062F\u062F" }), _jsx("option", { value: "completed", children: "\u062A\u06A9\u0645\u06CC\u0644 \u0645\u0627\u0645\u0648\u0631\u06CC\u062A \u067E\u06CC\u06AF\u06CC\u0631\u06CC" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u06AF\u0632\u0627\u0631\u0634 \u0645\u0646\u0634\u06CC:" }), _jsx("textarea", { rows: 3, required: true, value: resultNote, onChange: (e) => setResultNote(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100", children: [_jsx("button", { type: "button", onClick: () => setIsFollowUpResultOpen(false), className: "px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs", children: "\u062B\u0628\u062A \u062F\u0631 \u06A9\u0627\u0631\u062A\u0627\u0628\u0644" })] })] })] }) }));
};
