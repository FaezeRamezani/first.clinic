import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { getTodayJalaliDate, getJalaliDateOffset, getDateRelationToToday, formatJalaliDateLong, toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
import { isValidBookingSlot } from '../../utils/timeUtils';
import { Sparkles, Stethoscope, Plus, CheckCircle2, ChevronRight, ChevronLeft, RefreshCw, XCircle, ArrowRightLeft } from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
export const TimeBlockGrid = () => {
    const { scope, appointments, doctors, openNewAppointment, openQuickCheckout, updateAppointmentStatus, updateAppointmentPresenceStatus, openCancelAppointment } = useClinic();
    const todayStr = getTodayJalaliDate();
    const [selectedDate, setSelectedDate] = useState(todayStr);
    const [selectedInterval, setSelectedInterval] = useState(30); // 30 or 60
    const [selectedDoctorId, setSelectedDoctorId] = useState('all');
    const dateRelation = getDateRelationToToday(selectedDate);
    // Doctors list based on Global Scope & Doctor Dropdown selection
    const scopeDoctors = doctors.filter(doc => scope === 'unified' || doc.practice === scope);
    // Reset selected doctor if no longer available in current practice scope
    useEffect(() => {
        if (selectedDoctorId !== 'all' && !scopeDoctors.some(d => d.id === selectedDoctorId)) {
            setSelectedDoctorId('all');
        }
    }, [scope, scopeDoctors, selectedDoctorId]);
    const visibleDoctors = scopeDoctors.filter(doc => selectedDoctorId === 'all' || doc.id === selectedDoctorId);
    // Generate time slots based on interval (09:00 to 20:30)
    const generateTimeSlots = (intervalMinutes) => {
        const slots = [];
        let currentMinutes = 9 * 60; // 09:00
        const endMinutes = 20 * 60 + 30; // 20:30
        while (currentMinutes <= endMinutes) {
            const hours = Math.floor(currentMinutes / 60);
            const mins = currentMinutes % 60;
            const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
            slots.push(formatted);
            currentMinutes += intervalMinutes;
        }
        return slots;
    };
    const timeSlots = generateTimeSlots(selectedInterval);
    // Filter ALL appointments matching scope and selected date (historical ones stay in calendar)
    const dateAppointments = appointments.filter(a => {
        const normApptDate = toEnglishDigits(a.date).trim().replace(/\//g, '-');
        const normSelDate = toEnglishDigits(selectedDate).trim().replace(/\//g, '-');
        return normApptDate === normSelDate;
    });
    // Get appointments for a specific doctor and slot block
    const getAppointmentsForDoctorAndSlot = (doctorId, slot) => {
        const slotHour = parseInt(toEnglishDigits(slot).split(':')[0], 10);
        const slotMin = parseInt(toEnglishDigits(slot).split(':')[1], 10);
        const slotTotalMins = slotHour * 60 + slotMin;
        const slotEndMins = slotTotalMins + selectedInterval;
        return dateAppointments.filter(a => {
            if (a.doctorId !== doctorId)
                return false;
            const apptTime = toEnglishDigits(a.timeSlot).trim();
            const parts = apptTime.split(':');
            if (parts.length < 2)
                return false;
            const apptMins = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
            return apptMins >= slotTotalMins && apptMins < slotEndMins;
        });
    };
    // State Machine Guards
    const handleCheckoutGuard = (apt) => {
        if (apt.status === 'completed') {
            alert('این نوبت قبلاً کاملاً تسویه شده است.');
            return;
        }
        if (apt.status === 'canceled' || apt.status === 'rescheduled') {
            alert('نوبت‌های لغوشده یا منتقل‌شده قابل تسویه نمی‌باشند.');
            return;
        }
        openQuickCheckout(apt);
    };
    const handlePresenceGuard = (apt, newPresence) => {
        if (apt.status === 'completed' || apt.status === 'canceled' || apt.status === 'rescheduled') {
            alert('پس از بسته‌شدن، لغو یا انتقال نوبت، امکان تغییر وضعیت حضور وجود ندارد.');
            return;
        }
        if (dateRelation === 'future') {
            alert('ثبت حضور برای تاریخ‌های آینده هنوز امکان‌پذیر نیست.');
            return;
        }
        updateAppointmentPresenceStatus(apt.id, newPresence);
    };
    const handleCheckInGuard = (apt) => {
        if (apt.status === 'completed' || apt.status === 'canceled' || apt.status === 'rescheduled')
            return;
        if (dateRelation === 'future')
            return;
        updateAppointmentStatus(apt.id, 'checked_in');
        updateAppointmentPresenceStatus(apt.id, 'present');
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3", children: [_jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center justify-between gap-4", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200", children: [_jsx("button", { onClick: () => setSelectedDate(getJalaliDateOffset(todayStr, -1)), className: `px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedDate === getJalaliDateOffset(todayStr, -1)
                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'}`, children: "\u062F\u06CC\u0631\u0648\u0632" }), _jsx("button", { onClick: () => setSelectedDate(todayStr), className: `px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedDate === todayStr
                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'}`, children: "\u0627\u0645\u0631\u0648\u0632" }), _jsx("button", { onClick: () => setSelectedDate(getJalaliDateOffset(todayStr, 1)), className: `px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedDate === getJalaliDateOffset(todayStr, 1)
                                                    ? 'bg-indigo-600 text-white shadow-2xs'
                                                    : 'text-slate-600 hover:text-slate-900'}`, children: "\u0641\u0631\u062F\u0627" })] }), _jsx("div", { className: "w-44", children: _jsx(JalaliDatePicker, { value: selectedDate, onChange: (newDate) => setSelectedDate(newDate || todayStr) }) }), _jsxs("div", { className: "inline-flex items-center", children: [dateRelation === 'past' && (_jsx("span", { className: "px-2.5 py-1 bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px]", children: "\u062A\u0627\u0631\u06CC\u062E \u06AF\u0630\u0634\u062A\u0647 (\u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0646\u0648\u0628\u062A\u200C\u0647\u0627)" })), dateRelation === 'today' && (_jsxs("span", { className: "px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-[11px] flex items-center gap-1", children: [_jsx("span", { className: "w-2 h-2 rounded-full bg-emerald-500 animate-pulse" }), "\u0628\u0631\u0646\u0627\u0645\u0647 \u0627\u0645\u0631\u0648\u0632 \u06A9\u0644\u06CC\u0646\u06CC\u06A9"] })), dateRelation === 'future' && (_jsx("span", { className: "px-2.5 py-1 bg-indigo-100 text-indigo-800 font-bold rounded-xl text-[11px]", children: "\u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0627\u0631\u06CC\u062E \u0622\u06CC\u0646\u062F\u0647" }))] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0", children: [_jsx("span", { className: "text-slate-600 font-bold", children: "\u0627\u0646\u062A\u062E\u0627\u0628 \u067E\u0632\u0634\u06A9:" }), _jsxs("select", { value: selectedDoctorId, onChange: (e) => setSelectedDoctorId(e.target.value), className: "bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer focus:border-indigo-500", children: [_jsx("option", { value: "all", children: "\u0647\u0645\u0647 \u067E\u0632\u0634\u06A9\u0627\u0646" }), scopeDoctors.map((doc) => (_jsx("option", { value: doc.id, children: doc.name }, doc.id)))] })] }), _jsxs("div", { className: "flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0", children: [_jsx("span", { className: "text-slate-600 font-bold", children: "\u0628\u0627\u0632\u0647 \u0632\u0645\u0627\u0646\u06CC:" }), _jsxs("select", { value: selectedInterval, onChange: (e) => setSelectedInterval(Number(e.target.value)), className: "bg-white border border-slate-300 text-slate-800 font-bold text-xs rounded-lg px-2.5 py-1 outline-none cursor-pointer", children: [_jsx("option", { value: 30, children: "\u06F3\u06F0 \u062F\u0642\u06CC\u0642\u0647" }), _jsx("option", { value: 60, children: "\u06F6\u06F0 \u062F\u0642\u06CC\u0642\u0647" })] })] })] })] }), _jsxs("div", { className: "text-xs text-slate-500 font-medium pt-1 border-t border-slate-100 flex items-center justify-between", children: [_jsx("span", { children: formatJalaliDateLong(selectedDate) }), _jsxs("span", { className: "text-slate-400", children: ["\u062A\u0639\u062F\u0627\u062F \u06A9\u0644 \u0646\u0648\u0628\u062A\u200C\u0647\u0627\u06CC \u0627\u06CC\u0646 \u0631\u0648\u0632: ", _jsx("strong", { className: "text-indigo-600 font-bold", children: toFarsiDigits(dateAppointments.length) }), " \u0646\u0648\u0628\u062A"] })] })] }), _jsxs("div", { className: "bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 border-b border-slate-200 bg-slate-50/70", children: doctors.map((doc) => {
                            const isAesthetic = doc.practice === 'aesthetic';
                            const countForDoc = dateAppointments.filter(a => a.doctorId === doc.id).length;
                            const isScopeMatch = scope === 'unified' || doc.practice === scope;
                            const isDoctorSelected = selectedDoctorId === 'all' || selectedDoctorId === doc.id;
                            const isVisible = isScopeMatch && isDoctorSelected;
                            return (_jsxs("div", { onClick: () => {
                                    if (!isScopeMatch)
                                        return;
                                    setSelectedDoctorId(selectedDoctorId === doc.id ? 'all' : doc.id);
                                }, title: isScopeMatch ? "برای فیلتر تک‌پزشک کلیک کنید" : "خارج از مطب فعال", className: `p-4 flex items-center justify-between transition-all duration-200 ${!isVisible
                                    ? 'opacity-20 pointer-events-none bg-slate-100/50 hidden md:flex'
                                    : isDoctorSelected && selectedDoctorId !== 'all'
                                        ? 'bg-indigo-50/70 border-b-2 border-b-indigo-600 opacity-100 cursor-pointer'
                                        : 'bg-white/40 hover:bg-slate-100/50 opacity-100 cursor-pointer'}`, children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-2xs ${isAesthetic ? 'bg-indigo-600' : 'bg-teal-600'}`, children: isAesthetic ? _jsx(Sparkles, { className: "w-5 h-5" }) : _jsx(Stethoscope, { className: "w-5 h-5" }) }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("h3", { className: "text-sm font-extrabold text-slate-900", children: doc.name }), !isScopeMatch ? (_jsx("span", { className: "text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.2 rounded font-bold", children: "\u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u062F\u0631 \u0627\u06CC\u0646 \u0645\u0637\u0628" })) : isDoctorSelected && selectedDoctorId !== 'all' ? (_jsx("span", { className: "text-[10px] bg-indigo-600 text-white px-1.5 py-0.2 rounded font-bold", children: "\u0627\u0646\u062A\u062E\u0627\u0628\u200C\u0634\u062F\u0647" })) : null] }), _jsx("p", { className: "text-[11px] text-slate-500 font-semibold mt-0.5", children: doc.specialty })] })] }), _jsxs("span", { className: `px-2.5 py-1 rounded-xl text-xs font-extrabold ${isAesthetic ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700'}`, children: [toFarsiDigits(countForDoc), " \u0646\u0648\u0628\u062A"] })] }, doc.id));
                        }) }), _jsx("div", { className: "divide-y divide-slate-100 max-h-[640px] overflow-y-auto", children: timeSlots.map((slot) => {
                            const isFarsiSlot = toFarsiDigits(slot);
                            const isAllowedSlot = isValidBookingSlot(slot);
                            return (_jsxs("div", { className: "flex items-stretch min-h-[64px] hover:bg-slate-50/40 transition-colors", children: [_jsx("div", { className: `w-20 border-l border-slate-200 px-2 py-3 font-bold text-xs text-center flex flex-col justify-center shrink-0 select-none ${isAllowedSlot ? 'bg-slate-50/90 text-slate-800' : 'bg-slate-100/60 text-slate-400'}`, children: _jsx("span", { className: "dir-ltr text-sm font-black", children: isFarsiSlot }) }), _jsx("div", { className: "flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 p-2", children: doctors.map((doc) => {
                                            const isScopeMatch = scope === 'unified' || doc.practice === scope;
                                            const isDoctorSelected = selectedDoctorId === 'all' || selectedDoctorId === doc.id;
                                            const isVisible = isScopeMatch && isDoctorSelected;
                                            const docSlotAppts = getAppointmentsForDoctorAndSlot(doc.id, slot);
                                            const isAesthetic = doc.practice === 'aesthetic';
                                            return (_jsx("div", { className: `flex items-center min-h-[48px] transition-all duration-200 ${!isVisible
                                                    ? 'opacity-20 pointer-events-none select-none hidden md:flex'
                                                    : 'opacity-100 pointer-events-auto'}`, children: docSlotAppts.length > 0 ? (_jsx("div", { className: "w-full space-y-2", children: docSlotAppts.map((apt) => {
                                                        const isCompleted = apt.status === 'completed';
                                                        const isRescheduled = apt.status === 'rescheduled';
                                                        const isCanceled = apt.status === 'canceled';
                                                        const isInactive = isCompleted || isRescheduled || isCanceled;
                                                        // Muted/grayed styling for finalized or canceled/rescheduled historical records
                                                        const cardBgClass = isRescheduled
                                                            ? 'bg-amber-50/80 border-amber-300 text-amber-950 opacity-75 grayscale-25'
                                                            : isCanceled
                                                                ? 'bg-rose-50/80 border-rose-300 text-rose-950 opacity-75 grayscale-25'
                                                                : isCompleted
                                                                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950 opacity-90 font-medium'
                                                                    : isAesthetic
                                                                        ? 'bg-purple-100/80 hover:bg-purple-100 border-purple-300 text-purple-950 font-bold shadow-2xs'
                                                                        : 'bg-teal-100/80 hover:bg-teal-100 border-teal-300 text-teal-950 font-bold shadow-2xs';
                                                        return (_jsx("div", { className: `p-3 rounded-2xl border transition-all ${cardBgClass}`, children: _jsxs("div", { className: "flex items-start justify-between gap-2", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("p", { className: "font-extrabold text-xs text-slate-900", children: apt.patientName }), _jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded font-bold bg-white/90 border border-slate-200 text-slate-600", children: toFarsiDigits(apt.fileNumber) })] }), _jsx("p", { className: "text-[11px] text-slate-600 mt-0.5 font-medium", children: apt.serviceName || 'ویزیت عمومی' })] }), _jsxs("div", { className: "flex items-center gap-1.5 flex-wrap", children: [isRescheduled && (_jsxs("span", { className: "px-2 py-0.5 bg-amber-100 text-amber-900 font-extrabold rounded-lg text-[10px] flex items-center gap-1", children: [_jsx(ArrowRightLeft, { className: "w-3 h-3 text-amber-600" }), " \u0645\u0646\u062A\u0642\u0644 \u0634\u062F"] })), isCanceled && (_jsxs("span", { className: "px-2 py-0.5 bg-rose-100 text-rose-900 font-extrabold rounded-lg text-[10px] flex items-center gap-1", children: [_jsx(XCircle, { className: "w-3 h-3 text-rose-600" }), " \u0644\u063A\u0648 \u0634\u062F"] })), isCompleted && (_jsxs("span", { className: "px-2 py-1 bg-emerald-100 text-emerald-900 font-extrabold rounded-lg text-[10px] flex items-center gap-1 border border-emerald-300", children: [_jsx(CheckCircle2, { className: "w-3.5 h-3.5 text-emerald-600" }), " \u2713 \u062A\u0633\u0648\u06CC\u0647\u200C\u0634\u062F"] })), !isInactive && (dateRelation === 'future' ? (_jsx("span", { className: "px-2 py-0.5 bg-indigo-100/80 text-indigo-800 font-bold rounded-lg text-[10px]", children: "\u0632\u0645\u0627\u0646 \u0646\u0631\u0633\u06CC\u062F\u0647" })) : (_jsxs("select", { value: apt.presenceStatus || 'pending', onChange: (e) => handlePresenceGuard(apt, e.target.value), className: "bg-white border border-slate-300 text-slate-800 text-[10px] font-bold rounded-lg px-2 py-1 outline-none cursor-pointer", children: [_jsx("option", { value: "pending", children: "\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631" }), _jsx("option", { value: "present", children: "\u062D\u0627\u0636\u0631 \u062F\u0631 \u0645\u0637\u0628" }), _jsx("option", { value: "absent", children: "\u0639\u062F\u0645 \u062D\u0636\u0648\u0631 \u062F\u0631 \u0645\u0637\u0628" })] }))), !isInactive && dateRelation === 'today' && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleCheckoutGuard(apt), className: "px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer", children: "\u062A\u0633\u0648\u06CC\u0647" }), _jsx("button", { onClick: () => handleCancelGuard(apt), className: "px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer", children: "\u0644\u063A\u0648 / \u062C\u0627\u0628\u062C\u0627\u06CC\u06CC" })] })), !isInactive && dateRelation === 'past' && (_jsx("button", { onClick: () => handleCheckoutGuard(apt), className: "px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-bold transition-colors cursor-pointer", children: "\u062A\u0639\u06CC\u06CC\u0646 \u062A\u06A9\u0644\u06CC\u0641 / \u062A\u0633\u0648\u06CC\u0647" }))] })] }) }, apt.id));
                                                    }) })) : (isAllowedSlot ? (_jsxs("button", { onClick: () => openNewAppointment({ doctorId: doc.id, date: selectedDate, timeSlot: isFarsiSlot, isSlotBooking: true }), disabled: !isVisible, className: "w-full h-full min-h-[42px] rounded-xl border border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 text-[11px] font-medium transition-all group cursor-pointer", children: [_jsx(Plus, { className: "w-3.5 h-3.5 group-hover:scale-110 transition-transform text-indigo-500" }), _jsxs("span", { children: ["\u0631\u0632\u0631\u0648 \u0632\u0645\u0627\u0646 \u062E\u0627\u0644\u06CC (", isFarsiSlot, ")"] })] })) : (_jsx("div", { className: "w-full h-full min-h-[42px] rounded-xl border border-slate-100 bg-slate-50/40 text-slate-300 flex items-center justify-center text-[10px] font-medium select-none", children: _jsx("span", { children: "\u062E\u0627\u0631\u062C \u0627\u0632 \u0633\u0627\u0639\u062A \u0631\u0632\u0631\u0648 \u0645\u062C\u0627\u0632" }) }))) }, doc.id));
                                        }) })] }, slot));
                        }) })] })] }));
};
