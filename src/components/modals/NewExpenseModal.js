import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X } from 'lucide-react';
export const NewExpenseModal = () => {
    const { isNewExpenseOpen, setIsNewExpenseOpen, addExpense } = useClinic();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('consumables');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('۱۴۰۵-۰۶-۱۶');
    const [practice, setPractice] = useState('aesthetic');
    const [receiptNumber, setReceiptNumber] = useState('');
    const [description] = useState('');
    if (!isNewExpenseOpen)
        return null;
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title || !amount)
            return;
        addExpense({
            title,
            category,
            amount: parseInt(amount, 10),
            date,
            practice,
            recordedBy: 'منشی پذیرش',
            receiptNumber,
            description
        });
        setIsNewExpenseOpen(false);
        setTitle('');
        setAmount('');
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsx("h3", { className: "text-sm font-bold text-slate-800", children: "\u062B\u0628\u062A \u0647\u0632\u06CC\u0646\u0647 \u0639\u0645\u0644\u06CC\u0627\u062A\u06CC / \u062C\u0627\u0631\u06CC \u062C\u062F\u06CC\u062F" }), _jsx("button", { onClick: () => setIsNewExpenseOpen(false), className: "text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0639\u0646\u0648\u0627\u0646 \u0647\u0632\u06CC\u0646\u0647:" }), _jsx("input", { type: "text", required: true, value: title, onChange: (e) => setTitle(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u062E\u0631\u06CC\u062F \u0645\u0648\u0627\u062F \u0628\u06CC\u062D\u0633\u06CC \u0648 \u0633\u0648\u0632\u0646 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u0647\u0632\u06CC\u0646\u0647:" }), _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "consumables", children: "\u0645\u0648\u0627\u062F \u0645\u0635\u0631\u0641\u06CC" }), _jsx("option", { value: "rent", children: "\u0627\u062C\u0627\u0631\u0647 \u0648 \u0631\u0647\u0646" }), _jsx("option", { value: "salaries", children: "\u062D\u0642\u0648\u0642 \u067E\u0631\u0633\u0646\u0644" }), _jsx("option", { value: "equipment", children: "\u062A\u062C\u0647\u06CC\u0632\u0627\u062A \u0648 \u062A\u0639\u0645\u06CC\u0631\u0627\u062A" }), _jsx("option", { value: "utilities", children: "\u0642\u0628\u0648\u0636 \u0648 \u0646\u06AF\u0647\u062F\u0627\u0631\u06CC" }), _jsx("option", { value: "other", children: "\u0645\u062A\u0641\u0631\u0642\u0647" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0645\u0628\u0644\u063A (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", required: true, value: amount, onChange: (e) => setAmount(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u06F5\u06F0\u06F0\u06F0\u06F0\u06F0\u06F0", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-rose-700 outline-none" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0645\u0637\u0628 \u0645\u0631\u0628\u0648\u0637\u0647:" }), _jsxs("select", { value: practice, onChange: (e) => setPractice(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "aesthetic", children: "\u0645\u0637\u0628 \u06F1 (\u0632\u06CC\u0628\u0627\u06CC\u06CC)" }), _jsx("option", { value: "dental", children: "\u0645\u0637\u0628 \u06F2 (\u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC)" }), _jsx("option", { value: "unified", children: "\u0645\u0634\u0627\u0639 (\u06A9\u0644 \u06A9\u0644\u06CC\u0646\u06CC\u06A9)" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0627\u0631\u06CC\u062E (\u0634\u0645\u0633\u06CC):" }), _jsx("input", { type: "text", value: date, onChange: (e) => setDate(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0641\u0627\u06A9\u062A\u0648\u0631 / \u0634\u0645\u0627\u0631\u0647 \u0631\u0633\u06CC\u062F \u062E\u0631\u06CC\u062F:" }), _jsx("input", { type: "text", value: receiptNumber, onChange: (e) => setReceiptNumber(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: REC-9921", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100", children: [_jsx("button", { type: "button", onClick: () => setIsNewExpenseOpen(false), className: "px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs", children: "\u062B\u0628\u062A \u0647\u0632\u06CC\u0646\u0647" })] })] })] }) }));
};
