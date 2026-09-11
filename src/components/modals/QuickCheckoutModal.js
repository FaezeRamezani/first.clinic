import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { formatCurrency, toFarsiDigits, getTodayJalaliDate, getJalaliDateOffset } from '../../utils/persianUtils';
import { X, AlertCircle, CheckCircle2, CalendarPlus } from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
export const QuickCheckoutModal = () => {
    const { isQuickCheckoutOpen, setIsQuickCheckoutOpen, selectedAppointmentForCheckout, services, doctors, appointments, recordCheckout, addAppointment, checkAppointmentConflict } = useClinic();
    const apt = selectedAppointmentForCheckout;
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [totalCost, setTotalCost] = useState(0);
    const [discount, setDiscount] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('pos_aesthetic');
    const [posAccount, setPosAccount] = useState('کارتخوان بانک سامان (مطب زیبایی)');
    const [debtDueDate, setDebtDueDate] = useState(getJalaliDateOffset(getTodayJalaliDate(), 10));
    const [notes] = useState('');
    // Follow-up Visit States
    const [isFollowUpVisitEnabled, setIsFollowUpVisitEnabled] = useState(false);
    const [nextVisitDate, setNextVisitDate] = useState(getJalaliDateOffset(getTodayJalaliDate(), 14));
    const [nextVisitTimeSlot, setNextVisitTimeSlot] = useState('۱۰:۰۰');
    const [nextVisitDoctorId, setNextVisitDoctorId] = useState('');
    const [nextVisitError, setNextVisitError] = useState('');
    useEffect(() => {
        if (apt) {
            const matchedService = services.find(s => s.id === apt.serviceId) || services[0];
            if (matchedService) {
                setSelectedServiceId(matchedService.id);
                setTotalCost(matchedService.price);
                setPaidAmount(matchedService.price);
            }
            setPaymentMethod(apt.practice === 'aesthetic' ? 'pos_aesthetic' : 'pos_dental');
            setPosAccount(apt.practice === 'aesthetic' ? 'کارتخوان بانک سامان (مطب زیبایی)' : 'کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
            setNextVisitDoctorId(apt.doctorId);
        }
    }, [apt, services]);
    if (!isQuickCheckoutOpen || !apt)
        return null;
    const handleServiceChange = (srvId) => {
        setSelectedServiceId(srvId);
        const srv = services.find(s => s.id === srvId);
        if (srv) {
            setTotalCost(srv.price);
            setPaidAmount(srv.price);
            setDiscount(0);
        }
    };
    const handleNextVisitChange = (newDate, newSlot, newDocId) => {
        setNextVisitDate(newDate);
        setNextVisitTimeSlot(newSlot);
        setNextVisitDoctorId(newDocId);
        if (isFollowUpVisitEnabled) {
            const isConflict = checkAppointmentConflict(newDate, newSlot, newDocId);
            if (isConflict) {
                setNextVisitError(`⚠️ زمان ${newSlot} در تاریخ ${newDate} برای پزشک انتخابی پر است.`);
            }
            else {
                setNextVisitError('');
            }
        }
    };
    const netCost = Math.max(0, totalCost - discount);
    const remainingDebt = Math.max(0, netCost - paidAmount);
    const handleSubmit = (e) => {
        e.preventDefault();
        const srv = services.find(s => s.id === selectedServiceId);
        // Generate Current Payment Timestamp e.g. "۱۴:۳۵"
        const now = new Date();
        const currentTimestamp = toFarsiDigits(now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }));
        // Record checkout transaction
        recordCheckout({
            patientId: apt.patientId,
            patientName: apt.patientName,
            fileNumber: apt.fileNumber,
            appointmentId: apt.id,
            practice: apt.practice,
            date: getTodayJalaliDate(),
            timestamp: currentTimestamp,
            serviceName: srv?.name || 'خدمت تخصصی',
            totalCost,
            discount,
            netCost,
            paidAmount,
            remainingDebt,
            paymentMethod,
            posAccount,
            debtDueDate: remainingDebt > 0 ? debtDueDate : undefined,
            notes
        });
        // Handle Follow-up Next Visit Appointment creation if requested
        if (isFollowUpVisitEnabled && !nextVisitError) {
            const docObj = doctors.find(d => d.id === nextVisitDoctorId) || doctors[0];
            addAppointment({
                patientId: apt.patientId,
                patientName: apt.patientName,
                patientMobile: apt.patientMobile,
                fileNumber: apt.fileNumber,
                doctorId: docObj.id,
                doctorName: docObj.name,
                practice: docObj.practice,
                date: nextVisitDate,
                timeSlot: nextVisitTimeSlot,
                duration: 30,
                status: 'pending',
                notes: `نوبت ویزیت مجدد رزرو شده در زمان تسویه (قبلی: ${apt.date})`,
                cabinetNumber: docObj.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'
            });
        }
        setIsQuickCheckoutOpen(false);
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-sm font-bold text-slate-800", children: "\u062B\u0628\u062A \u062E\u062F\u0645\u062A\u060C \u0635\u0648\u0631\u062A\u062D\u0633\u0627\u0628 \u0648 \u062A\u0633\u0648\u06CC\u0647 \u0641\u0648\u0631\u06CC \u0648\u06CC\u0632\u06CC\u062A" }), _jsxs("p", { className: "text-xs text-slate-500 font-medium", children: ["\u0628\u06CC\u0645\u0627\u0631: ", apt.patientName, " (", toFarsiDigits(apt.fileNumber), ")"] })] }), _jsx("button", { onClick: () => setIsQuickCheckoutOpen(false), className: "text-slate-400 hover:text-slate-600 transition-colors cursor-pointer", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 text-xs", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u062E\u062F\u0645\u062A \u0627\u0631\u0627\u0626\u0647 \u0634\u062F\u0647:" }), _jsx("select", { value: selectedServiceId, onChange: (e) => handleServiceChange(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: services
                                        .filter(s => s.practice === apt.practice)
                                        .map(s => (_jsxs("option", { value: s.id, children: [s.name, " (", formatCurrency(s.price), ")"] }, s.id))) })] }), _jsxs("div", { className: "grid grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-600 mb-1 text-[11px]", children: "\u0645\u0628\u0644\u063A \u06A9\u0644 (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", value: totalCost, onChange: (e) => setTotalCost(parseInt(e.target.value, 10) || 0), className: "w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-600 mb-1 text-[11px]", children: "\u062A\u062E\u0641\u06CC\u0641 (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", value: discount, onChange: (e) => setDiscount(parseInt(e.target.value, 10) || 0), className: "w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-900 outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-600 mb-1 text-[11px]", children: "\u0645\u0628\u0644\u063A \u0646\u0647\u0627\u06CC\u06CC \u0642\u0627\u0628\u0644 \u067E\u0631\u062F\u0627\u062E\u062A:" }), _jsx("div", { className: "py-2 px-2 text-xs font-black text-indigo-700 bg-indigo-50/70 rounded-xl border border-indigo-200", children: formatCurrency(netCost) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0631\u0648\u0634 \u0648 \u062D\u0633\u0627\u0628 \u0645\u0642\u0635\u062F:" }), _jsxs("select", { value: paymentMethod, onChange: (e) => {
                                                const m = e.target.value;
                                                setPaymentMethod(m);
                                                if (m === 'pos_aesthetic')
                                                    setPosAccount('کارتخوان بانک سامان (مطب زیبایی)');
                                                else if (m === 'pos_dental')
                                                    setPosAccount('کارتخوان بانک پاسارگاد (مطب دندانپزشکی)');
                                                else if (m === 'card_transfer')
                                                    setPosAccount('حساب کارت به کارت (بانک ملی)');
                                                else
                                                    setPosAccount('صندوق نقدی مطب');
                                            }, className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: [_jsx("option", { value: "pos_aesthetic", children: "\u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 \u0632\u06CC\u0628\u0627\u06CC\u06CC (\u0628\u0627\u0646\u06A9 \u0633\u0627\u0645\u0627\u0646)" }), _jsx("option", { value: "pos_dental", children: "\u06A9\u0627\u0631\u062A\u062E\u0648\u0627\u0646 \u062F\u0646\u062F\u0627\u0646\u067E\u0632\u0634\u06A9\u06CC (\u067E\u0627\u0633\u0627\u0631\u06AF\u0627\u062F)" }), _jsx("option", { value: "card_transfer", children: "\u06A9\u0627\u0631\u062A \u0628\u0647 \u06A9\u0627\u0631\u062A (\u0628\u0627\u0646\u06A9 \u0645\u0644\u06CC)" }), _jsx("option", { value: "cash", children: "\u062F\u0631\u06CC\u0627\u0641\u062A \u0646\u0642\u062F\u06CC" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0645\u0628\u0644\u063A \u067E\u0631\u062F\u0627\u062E\u062A\u06CC \u062F\u0631\u06CC\u0627\u0641\u062A\u06CC (\u062A\u0648\u0645\u0627\u0646):" }), _jsx("input", { type: "number", value: paidAmount, onChange: (e) => setPaidAmount(parseInt(e.target.value, 10) || 0), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 outline-none" })] })] }), remainingDebt > 0 ? (_jsxs("div", { className: "p-3 bg-rose-50 border border-rose-200 rounded-2xl space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-xs font-bold text-rose-900", children: [_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(AlertCircle, { className: "w-4 h-4 text-rose-600" }), _jsx("span", { children: "\u0628\u0627\u0642\u06CC\u0645\u0627\u0646\u062F\u0647 \u0628\u062F\u0647\u06CC / \u0642\u0633\u0637 \u062C\u062F\u06CC\u062F:" })] }), _jsx("span", { className: "text-sm font-black", children: formatCurrency(remainingDebt) })] }), _jsx("div", { children: _jsx(JalaliDatePicker, { label: "\u062A\u0639\u06CC\u06CC\u0646 \u062A\u0627\u0631\u06CC\u062E \u0633\u0631\u0631\u0633\u06CC\u062F \u067E\u0631\u062F\u0627\u062E\u062A \u0642\u0633\u0637:", value: debtDueDate, onChange: (d) => setDebtDueDate(d) }) })] })) : (_jsxs("div", { className: "p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2", children: [_jsx(CheckCircle2, { className: "w-4 h-4 text-emerald-600" }), _jsx("span", { children: "\u062A\u0633\u0648\u06CC\u0647 \u06A9\u0627\u0645\u0644 \u0627\u0646\u062C\u0627\u0645 \u0645\u06CC\u200C\u0634\u0648\u062F. (\u0628\u062F\u0648\u0646 \u0628\u062F\u0647\u06CC)" })] })), _jsxs("div", { className: "pt-2 border-t border-slate-100 space-y-3", children: [_jsxs("label", { className: "flex items-center gap-2 cursor-pointer text-xs font-extrabold text-indigo-900", children: [_jsx("input", { type: "checkbox", checked: isFollowUpVisitEnabled, onChange: (e) => {
                                                setIsFollowUpVisitEnabled(e.target.checked);
                                                if (e.target.checked)
                                                    handleNextVisitChange(nextVisitDate, nextVisitTimeSlot, nextVisitDoctorId);
                                            }, className: "w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer" }), _jsx(CalendarPlus, { className: "w-4 h-4 text-indigo-600" }), _jsx("span", { children: "\u062A\u0639\u06CC\u06CC\u0646 \u0648\u06CC\u0632\u06CC\u062A \u0645\u062C\u062F\u062F (\u0631\u0632\u0631\u0648 \u0646\u0648\u0628\u062A \u0628\u0639\u062F\u06CC \u062F\u0631\u0645\u0627\u0646 \u0628\u0631\u0627\u06CC \u0628\u06CC\u0645\u0627\u0631)" })] }), isFollowUpVisitEnabled && (_jsxs("div", { className: "p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-3 animate-in fade-in duration-150", children: [_jsxs("div", { className: "space-y-3", children: [_jsx(JalaliDatePicker, { label: "\u062A\u0627\u0631\u06CC\u062E \u0648\u06CC\u0632\u06CC\u062A \u0628\u0639\u062F\u06CC:", value: nextVisitDate, onChange: (d) => handleNextVisitChange(d || getTodayJalaliDate(), nextVisitTimeSlot, nextVisitDoctorId) }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1 text-[11px]", children: "\u067E\u0632\u0634\u06A9 \u0646\u0648\u0628\u062A \u0628\u0639\u062F\u06CC:" }), _jsx("select", { value: nextVisitDoctorId, onChange: (e) => handleNextVisitChange(nextVisitDate, nextVisitTimeSlot, e.target.value), className: "w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none", children: doctors.map(d => (_jsxs("option", { value: d.id, children: [d.name, " (", d.specialty, ")"] }, d.id))) })] }), _jsx(TimeSlotPicker, { label: "\u0633\u0627\u0639\u062A \u0648\u06CC\u0632\u06CC\u062A \u0628\u0639\u062F\u06CC:", value: nextVisitTimeSlot, onChange: (slot) => handleNextVisitChange(nextVisitDate, slot, nextVisitDoctorId), date: nextVisitDate, doctorId: nextVisitDoctorId, appointments: appointments })] }), nextVisitError && (_jsx("p", { className: "text-[11px] font-bold text-rose-600", children: nextVisitError }))] }))] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100", children: [_jsx("button", { type: "button", onClick: () => setIsQuickCheckoutOpen(false), className: "px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", disabled: isFollowUpVisitEnabled && !!nextVisitError, className: `px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer ${isFollowUpVisitEnabled && nextVisitError
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`, children: "\u062B\u0628\u062A \u0648\u06CC\u0632\u06CC\u062A \u0648 \u0635\u062F\u0648\u0631 \u0635\u0648\u0631\u062A\u062D\u0633\u0627\u0628" })] })] })] }) }));
};
