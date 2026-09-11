import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X } from 'lucide-react';
export const NewPatientModal = () => {
    const { isNewPatientOpen, setIsNewPatientOpen, addPatient, patients } = useClinic();
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [gender, setGender] = useState('female');
    const [birthDate] = useState('');
    const [primaryPractice, setPrimaryPractice] = useState('aesthetic');
    const [allergiesStr, setAllergiesStr] = useState('');
    const [medicalNotes, setMedicalNotes] = useState('');
    const [emergencyName] = useState('');
    const [emergencyPhone] = useState('');
    if (!isNewPatientOpen)
        return null;
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name || !mobile)
            return;
        // Check duplicate warning by mobile / national ID
        const duplicate = patients.find(p => p.mobile === mobile || (nationalId && p.nationalId === nationalId));
        if (duplicate) {
            if (!confirm(`هشدار: بیمار با این شماره موبایل یا کد ملی قبلاً با نام «${duplicate.name}» (پرونده ${duplicate.fileNumber}) ثبت شده است. آیا مطمئن به ایجاد پرونده مجزا هستید؟`)) {
                return;
            }
        }
        addPatient({
            name,
            mobile,
            nationalId: nationalId || '۰۰۰۰۰۰۰۰۰۰',
            gender,
            birthDate,
            primaryPractice,
            allergies: allergiesStr ? allergiesStr.split(',').map(s => s.trim()) : [],
            medicalNotes,
            emergencyContact: {
                name: emergencyName || '-',
                phone: emergencyPhone || '-',
                relation: 'بستگان'
            }
        });
        setIsNewPatientOpen(false);
        setName('');
        setMobile('');
        setNationalId('');
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsx("h3", { className: "text-sm font-bold text-slate-800", children: "\u062A\u0634\u06A9\u06CC\u0644 \u067E\u0631\u0648\u0646\u062F\u0647 \u0627\u0644\u06A9\u062A\u0631\u0648\u0646\u06CC\u06A9 \u0628\u06CC\u0645\u0627\u0631 \u062C\u062F\u06CC\u062F" }), _jsx("button", { onClick: () => setIsNewPatientOpen(false), className: "text-slate-400 hover:text-slate-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-3 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC \u0628\u06CC\u0645\u0627\u0631:" }), _jsx("input", { type: "text", required: true, value: name, onChange: (e) => setName(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u0646\u0627\u0647\u06CC\u062F \u0631\u0636\u0627\u06CC\u06CC", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0645\u0648\u0628\u0627\u06CC\u0644:" }), _jsx("input", { type: "text", required: true, value: mobile, onChange: (e) => setMobile(e.target.value), placeholder: "\u06F0\u06F9\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06A9\u062F \u0645\u0644\u06CC \u06F1\u06F0 \u0631\u0642\u0645\u06CC:" }), _jsx("input", { type: "text", value: nationalId, onChange: (e) => setNationalId(e.target.value), placeholder: "\u06F0\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062C\u0646\u0633\u06CC\u062A:" }), _jsxs("select", { value: gender, onChange: (e) => setGender(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "female", children: "\u0632\u0646" }), _jsx("option", { value: "male", children: "\u0645\u0631\u062F" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0645\u0637\u0628 \u0627\u0635\u0644\u06CC \u0645\u0631\u0627\u062C\u0639\u0647:" }), _jsxs("select", { value: primaryPractice, onChange: (e) => setPrimaryPractice(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "aesthetic", children: "\u0645\u0637\u0628 \u0632\u06CC\u0628\u0627\u06CC\u06CC (\u062F\u06A9\u062A\u0631 \u0631\u0645\u0636\u0627\u0646\u06CC)" }), _jsx("option", { value: "dental", children: "\u0645\u0637\u0628 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC (\u062F\u06A9\u062A\u0631 \u0622\u062E\u0631\u062A\u06CC)" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062D\u0633\u0627\u0633\u06CC\u062A\u200C\u0647\u0627\u06CC \u062F\u0627\u0631\u0648\u06CC\u06CC (\u0628\u0627 \u06A9\u0627\u0645\u0627 \u062C\u062F\u0627 \u06A9\u0646\u06CC\u062F):" }), _jsx("input", { type: "text", value: allergiesStr, onChange: (e) => setAllergiesStr(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u067E\u0646\u06CC\u200C\u0633\u06CC\u0644\u06CC\u0646\u060C \u0644\u06CC\u062F\u0648\u06A9\u0627\u0626\u06CC\u0646", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u0648 \u0633\u0648\u0627\u0628\u0642 \u067E\u0632\u0634\u06A9\u06CC \u0627\u0648\u0644\u06CC\u0647:" }), _jsx("textarea", { rows: 2, value: medicalNotes, onChange: (e) => setMedicalNotes(e.target.value), placeholder: "\u067E\u06CC\u0634\u06CC\u0646\u0647 \u0628\u06CC\u0645\u0627\u0631\u06CC \u06CC\u0627 \u062A\u0632\u0631\u06CC\u0642...", className: "w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100", children: [_jsx("button", { type: "button", onClick: () => setIsNewPatientOpen(false), className: "px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs", children: "\u062A\u0634\u06A9\u06CC\u0644 \u067E\u0631\u0648\u0646\u062F\u0647" })] })] })] }) }));
};
