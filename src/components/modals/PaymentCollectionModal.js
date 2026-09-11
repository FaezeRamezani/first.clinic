import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits } from '../../utils/persianUtils';
import { X } from 'lucide-react';
export const PaymentCollectionModal = () => {
    const { isPaymentCollectionOpen, setIsPaymentCollectionOpen, selectedPatientForPayment, collectPayment } = useClinic();
    const pat = selectedPatientForPayment;
    const [amount, setAmount] = useState(pat ? Math.abs(pat.balance) : 0);
    const [method, setMethod] = useState('pos_aesthetic');
    const [posAccount, setPosAccount] = useState('کارتخوان بانک سامان (مطب زیبایی)');
    const [notes, setNotes] = useState('وصول قسط / بدهی بیمار');
    if (!isPaymentCollectionOpen || !pat)
        return null;
    const handleSubmit = (e) => {
        e.preventDefault();
        collectPayment(pat.id, amount, method, posAccount, notes);
        setIsPaymentCollectionOpen(false);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-bold text-slate-800", children: "\u062B\u0628\u062A \u062F\u0631\u06CC\u0627\u0641\u062A \u0648\u062C\u0647 / \u0648\u0635\u0648\u0644\u06CC \u0628\u062F\u0647\u06CC \u0628\u06CC\u0645\u0627\u0631" }), _jsxs("p", { className: "text-xs text-slate-500 font-medium", children: [pat.name, " (", toFarsiDigits(pat.fileNumber), ")"] })] }), _jsx("button", { onClick: () => setIsPaymentCollectionOpen(false), className: "text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 text-xs", children: [_jsxs("div", { className: "p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 font-bold flex items-center justify-between", children: [_jsx("span", { children: "\u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06CC \u06A9\u0646\u0648\u0646\u06CC \u0628\u06CC\u0645\u0627\u0631:" }), _jsx("span", { className: "text-sm font-black", children: formatCurrency(Math.abs(pat.balance)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0645\u0628\u0644\u063A \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u062C\u062F\u06CC\u062F (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", required: true, value: amount, onChange: (e) => setAmount(parseInt(e.target.value, 10) || 0), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0631\u0648\u0634 \u062F\u0631\u06CC\u0627\u0641\u062A \u0648 \u062D\u0633\u0627\u0628 \u0645\u0642\u0635\u062F:" }), _jsxs("select", { value: method, onChange: (e) => {
                                        const m = e.target.value;
                                        setMethod(m);
                                        if (m === 'pos_aesthetic')
                                            setPosAccount('کارتخوان بانک سامان (مطب زیبایی)');
                                        else if (m === 'pos_dental')
                                            setPosAccount('کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
                                        else if (m === 'card_transfer')
                                            setPosAccount('حساب کارت به کارت (بانک ملی)');
                                        else
                                            setPosAccount('صندوق نقدی مطب');
                                    }, className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "pos_aesthetic", children: "\u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 \u0632\u06CC\u0628\u0627\u06CC\u06CC (\u0628\u0627\u0646\u06A9 \u0633\u0627\u0645\u0627\u0646)" }), _jsx("option", { value: "pos_dental", children: "\u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC (\u067E\u0627\u0633\u0627\u0631\u06AF\u0627\u062F)" }), _jsx("option", { value: "card_transfer", children: "\u06A9\u0627\u0631\u062A \u0628\u0647 \u06A9\u0627\u0631\u062A (\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC)" }), _jsx("option", { value: "cash", children: "\u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0642\u062F\u06CC" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0631\u0633\u06CC\u062F (\u0627\u062E\u062A\u06CC\u0627\u0631\u06CC):" }), _jsx("input", { type: "text", value: notes, onChange: (e) => setNotes(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100", children: [_jsx("button", { type: "button", onClick: () => setIsPaymentCollectionOpen(false), className: "px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs", children: "\u062B\u0628\u062A \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC \u0648 \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u067E\u0631\u0648\u0646\u062F\u0647" })] })] })] }) }));
};
