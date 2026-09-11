import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from 'react';
import { useClinic } from '../../context/ClinicContext';
import { X, UserPlus, Search, UserCheck, Calendar, Clock, Check, Stethoscope, Sparkles, RefreshCw } from 'lucide-react';
import { JalaliDatePicker } from '../common/JalaliDatePicker';
import { TimeSlotPicker } from '../common/TimeSlotPicker';
import { SearchableServiceSelect } from '../common/SearchableServiceSelect';
import { getTodayJalaliDate, toFarsiDigits, toEnglishDigits } from '../../utils/persianUtils';
export const NewAppointmentModal = () => {
    const { isNewAppointmentOpen, setIsNewAppointmentOpen, newAppointmentPrefill, setNewAppointmentPrefill, patients, doctors, services, addAppointment, selectedPatient, checkAppointmentConflict, appointments } = useClinic();
    // Navigation Steps: 'select_patient_type' | 'details'
    const [step, setStep] = useState('select_patient_type');
    // Patient Selection Mode & Form States
    const [patientTypeChoice, setPatientTypeChoice] = useState('existing');
    const [patientSearchTerm, setPatientSearchTerm] = useState('');
    const [chosenPatient, setChosenPatient] = useState(null);
    // New Patient Basic Info
    const [newPatientName, setNewPatientName] = useState('');
    const [newPatientMobile, setNewPatientMobile] = useState('');
    // Appointment Form States
    const [doctorId, setDoctorId] = useState('');
    const [date, setDate] = useState(getTodayJalaliDate());
    const [timeSlot, setTimeSlot] = useState('۱۰:۰۰');
    const [serviceId, setServiceId] = useState('');
    const [notes, setNotes] = useState('');
    const [conflictError, setConflictError] = useState('');
    // Is this booking triggered directly from clicking a specific slot in Calendar/Grid?
    const isSlotBooking = !!newAppointmentPrefill?.isSlotBooking;
    // Is this a rescheduling flow for an existing appointment? (Fixed Doctor, Commit on final confirmation)
    const isRescheduleMode = !!newAppointmentPrefill?.previousAppointmentId;

    const handleClose = () => {
        setIsNewAppointmentOpen(false);
        setNewAppointmentPrefill(null);
    };

    useEffect(() => {
        if (isNewAppointmentOpen) {
            // 1. Check prefill patient first
            if (newAppointmentPrefill?.patient) {
                setChosenPatient(newAppointmentPrefill.patient);
                setStep('details');
            }
            else {
                setChosenPatient(null);
                setStep('select_patient_type');
            }
            // 2. Set Doctor, Date, TimeSlot from prefill if present
            const initialDocId = newAppointmentPrefill?.doctorId || '';
            setDoctorId(initialDocId);
            if (newAppointmentPrefill?.date)
                setDate(newAppointmentPrefill.date);
            if (newAppointmentPrefill?.timeSlot)
                setTimeSlot(toFarsiDigits(newAppointmentPrefill.timeSlot));
            setServiceId('');
            setNotes('');
            setPatientSearchTerm('');
            setNewPatientName('');
            setNewPatientMobile('');
            setConflictError('');
            setPatientTypeChoice('existing');
        }
    }, [isNewAppointmentOpen, newAppointmentPrefill, doctors]);
    if (!isNewAppointmentOpen)
        return null;
    // Find currently selected doctor object
    const selectedDoctorObj = doctors.find(d => d.id === doctorId);
    // Filter services associated with the selected doctor's practice
    const availableServices = selectedDoctorObj
        ? services.filter(s => s.practice === selectedDoctorObj.practice && s.active)
        : [];
    // Handle Doctor Change with Service Reset logic (Section 4)
    const handleDoctorChange = (newDocId) => {
        const newDoc = doctors.find(d => d.id === newDocId);
        if (newDoc) {
            const newPracticeServices = services.filter(s => s.practice === newDoc.practice && s.active);
            const isCurrentServiceValid = newPracticeServices.some(s => s.id === serviceId);
            if (!isCurrentServiceValid) {
                setServiceId('');
            }
        }
        else {
            setServiceId('');
        }
        setDoctorId(newDocId);
        handleDateOrTimeOrDoctorChange(date, timeSlot, newDocId);
    };
    // Filter existing patients for Search Box
    const filteredPatients = patients.filter(p => {
        if (!patientSearchTerm.trim())
            return false;
        const term = toEnglishDigits(patientSearchTerm).toLowerCase().trim();
        const nameMatch = p.name.toLowerCase().includes(term);
        const mobileMatch = toEnglishDigits(p.mobile).includes(term);
        const fileMatch = toEnglishDigits(p.fileNumber).toLowerCase().includes(term);
        return nameMatch || mobileMatch || fileMatch;
    }).slice(0, 6);
    const handleDateOrTimeOrDoctorChange = (newDate, newSlot, newDocId) => {
        setDate(newDate);
        setTimeSlot(newSlot);
        setDoctorId(newDocId);
        if (newDocId) {
            const isConflict = checkAppointmentConflict(newDate, newSlot, newDocId, newAppointmentPrefill?.previousAppointmentId);
            if (isConflict) {
                const doc = doctors.find(d => d.id === newDocId);
                setConflictError(`⚠️ زمان ${newSlot} در تاریخ ${newDate} برای ${doc?.name || 'پزشک'} قبلاً پر شده است.`);
            }
            else {
                setConflictError('');
            }
        }
    };
    const handleSelectExistingPatient = (patient) => {
        setChosenPatient(patient);
        setStep('details');
    };
    const handleProceedWithNewPatient = (e) => {
        e.preventDefault();
        if (!newPatientName.trim())
            return;
        setStep('details');
    };
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!doctorId) {
            alert('لطفاً ابتدا پزشک معالج را انتخاب کنید.');
            return;
        }
        if (checkAppointmentConflict(date, timeSlot, doctorId, newAppointmentPrefill?.previousAppointmentId)) {
            setConflictError('⚠️ تداخل زمان وجود دارد. لطفاً زمان دیگری انتخاب کنید.');
            return;
        }
        let patName = chosenPatient?.name || newPatientName;
        let patMobile = chosenPatient?.mobile || newPatientMobile || '۰۹۱۲۰۰۰۰۰۰۰';
        let fileNum = chosenPatient?.fileNumber || `CL-${1000 + patients.length + 1}`;
        let patId = chosenPatient?.id || `pat-${Date.now()}`;
        if (!patName)
            return;
        const doc = doctors.find(d => d.id === doctorId) || doctors[0];
        const srv = services.find(s => s.id === serviceId);
        // FINAL COMMIT happens here on submit!
        addAppointment({
            patientId: patId,
            patientName: patName,
            patientMobile: patMobile,
            fileNumber: fileNum,
            doctorId: doc.id,
            doctorName: doc.name,
            practice: doc.practice,
            date: date || getTodayJalaliDate(),
            timeSlot: timeSlot || '۱۰:۰۰',
            duration: 30,
            status: 'pending',
            serviceId: srv?.id,
            serviceName: srv?.name,
            notes,
            previousAppointmentId: newAppointmentPrefill?.previousAppointmentId,
            cabinetNumber: doc.practice === 'aesthetic' ? 'اتاق پوست ۱' : 'یونیت دندانپزشکی ۱'
        });
        handleClose();
    };
    return (_jsx("div", { className: "fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-150 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-slate-100 pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [isRescheduleMode ? (_jsx(RefreshCw, { className: "w-5 h-5 text-indigo-600" })) : (_jsx(Calendar, { className: "w-5 h-5 text-indigo-600" })), _jsx("h3", { className: "text-sm font-bold text-slate-800", children: isRescheduleMode ? 'تغییر نوبت (تعیین زمان جدید)' : 'ثبت نوبت جدید در تقویم' })] }), _jsx("button", { onClick: handleClose, className: "text-slate-400 hover:text-slate-600 cursor-pointer", children: _jsx(X, { className: "w-5 h-5" }) })] }), step === 'select_patient_type' && (_jsxs("div", { className: "space-y-4 text-xs", children: [_jsxs("div", { className: "text-center space-y-1", children: [_jsx("h4", { className: "font-extrabold text-slate-800 text-sm", children: "\u0628\u0631\u0627\u06CC \u0686\u0647 \u0646\u0648\u0639 \u0628\u06CC\u0645\u0627\u0631\u06CC \u0645\u06CC\u200C\u062E\u0648\u0627\u0647\u06CC\u062F \u0646\u0648\u0628\u062A \u062B\u0628\u062A \u06A9\u0646\u06CC\u062F\u061F" }), _jsx("p", { className: "text-slate-500 font-medium text-[11px]", children: "\u0644\u0637\u0641\u0627\u064B \u0646\u0648\u0639 \u067E\u0631\u0648\u0646\u062F\u0647 \u0628\u06CC\u0645\u0627\u0631 \u0631\u0627 \u0645\u0634\u062E\u0635 \u06A9\u0646\u06CC\u062F." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3 pt-2", children: [_jsxs("button", { type: "button", onClick: () => setPatientTypeChoice('existing'), className: `p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${patientTypeChoice === 'existing'
                                        ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 font-bold shadow-2xs'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(UserCheck, { className: "w-5 h-5 text-indigo-600" }), patientTypeChoice === 'existing' && _jsx(Check, { className: "w-4 h-4 text-indigo-600" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-extrabold text-xs", children: "\u06F1. \u0628\u06CC\u0645\u0627\u0631 \u062F\u0627\u0631\u0627\u06CC \u067E\u0631\u0648\u0646\u062F\u0647" }), _jsx("p", { className: "text-[10px] text-slate-500 font-normal mt-0.5", children: "\u062C\u0633\u062A\u062C\u0648 \u062F\u0631 \u0633\u06CC\u0633\u062A\u0645 \u0628\u0627 \u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647" })] })] }), _jsxs("button", { type: "button", onClick: () => setPatientTypeChoice('new'), className: `p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-2 ${patientTypeChoice === 'new'
                                        ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-bold shadow-2xs'
                                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'}`, children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx(UserPlus, { className: "w-5 h-5 text-emerald-600" }), patientTypeChoice === 'new' && _jsx(Check, { className: "w-4 h-4 text-emerald-600" })] }), _jsxs("div", { children: [_jsx("p", { className: "font-extrabold text-xs", children: "\u06F2. \u0628\u06CC\u0645\u0627\u0631 \u062C\u062F\u06CC\u062F" }), _jsx("p", { className: "text-[10px] text-slate-500 font-normal mt-0.5", children: "\u062F\u0631\u06CC\u0627\u0641\u062A \u0633\u0631\u06CC\u0639 \u0646\u0627\u0645 \u0648 \u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647 \u062C\u0647\u062A \u062B\u0628\u062A \u0646\u0648\u0628\u062A" })] })] })] }), patientTypeChoice === 'existing' && (_jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" }), _jsx("input", { type: "text", autoFocus: true, value: patientSearchTerm, onChange: (e) => setPatientSearchTerm(e.target.value), placeholder: "\u062C\u0633\u062A\u062C\u0648\u06CC \u0628\u06CC\u0645\u0627\u0631 \u0628\u0627 \u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u06CC\u0627 \u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647...", className: "w-full bg-slate-50 border border-slate-300 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white" })] }), patientSearchTerm.trim() && filteredPatients.length === 0 && (_jsx("p", { className: "text-[11px] text-slate-400 text-center py-4", children: "\u0628\u06CC\u0645\u0627\u0631\u06CC \u0628\u0627 \u0627\u06CC\u0646 \u0634\u0645\u0627\u0631\u0647 \u067E\u0631\u0648\u0646\u062F\u0647 \u06CC\u0627 \u0647\u0645\u0631\u0627\u0647 \u06CC\u0627\u0641\u062A \u0646\u0634\u0641." })), filteredPatients.length > 0 && (_jsx("div", { className: "divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-slate-50 max-h-48 overflow-y-auto", children: filteredPatients.map(p => (_jsxs("div", { onClick: () => handleSelectExistingPatient(p), className: "p-2.5 hover:bg-indigo-50/70 transition-colors cursor-pointer flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-bold text-slate-900", children: p.name }), _jsx("p", { className: "text-[10px] text-slate-500 font-medium dir-ltr text-right", children: toFarsiDigits(p.mobile) })] }), _jsx("span", { className: "px-2 py-0.5 bg-white border border-slate-200 text-indigo-700 rounded-lg text-[10px] font-extrabold dir-ltr", children: toFarsiDigits(p.fileNumber) })] }, p.id))) }))] })), patientTypeChoice === 'new' && (_jsxs("form", { onSubmit: handleProceedWithNewPatient, className: "space-y-3 pt-2", children: [_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0646\u0627\u0645 \u0648 \u0646\u0627\u0645 \u062E\u0627\u0646\u0648\u0627\u062F\u06AF\u06CC \u0628\u06CC\u0645\u0627\u0631 \u062C\u062F\u06CC\u062F:" }), _jsx("input", { type: "text", required: true, value: newPatientName, onChange: (e) => setNewPatientName(e.target.value), placeholder: "\u0645\u062B\u0644\u0627: \u0645\u0631\u06CC\u0645 \u0631\u0636\u0627\u06CC\u06CC", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u0634\u0645\u0627\u0631\u0647 \u0647\u0645\u0631\u0627\u0647:" }), _jsx("input", { type: "text", required: true, value: newPatientMobile, onChange: (e) => setNewPatientMobile(e.target.value), placeholder: "\u06F0\u06F9\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9", className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500 dir-ltr text-right" })] }), _jsx("button", { type: "submit", className: "w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer", children: "\u0627\u062F\u0627\u0645\u0647 \u0648 \u062A\u0639\u06CC\u06CC\u0646 \u0632\u0645\u0627\u0646 \u0646\u0648\u0628\u062A" })] }))] })), step === 'details' && (_jsxs("form", { onSubmit: handleSubmit, className: "space-y-4 text-xs", children: [_jsxs("div", { className: "p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "font-extrabold text-slate-900 text-xs", children: ["\u0628\u06CC\u0645\u0627\u0631: ", chosenPatient ? chosenPatient.name : newPatientName] }), _jsxs("p", { className: "text-[10px] text-slate-600 font-medium dir-ltr text-right", children: [toFarsiDigits(chosenPatient ? chosenPatient.mobile : newPatientMobile), chosenPatient && ` | پرونده: ${toFarsiDigits(chosenPatient.fileNumber)}`] })] }), !selectedPatient && !newAppointmentPrefill?.patient && !isRescheduleMode && (_jsx("button", { type: "button", onClick: () => setStep('select_patient_type'), className: "text-[10px] text-indigo-700 hover:underline font-bold", children: "\u062A\u063A\u06CC\u06CC\u0631 \u0628\u06CC\u0645\u0627\u0631" }))] }), isSlotBooking ? (_jsxs("div", { className: "p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-1.5 font-bold text-xs text-amber-950", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { children: ["\u067E\u0632\u0634\u06A9: ", _jsx("strong", { className: "text-slate-900", children: selectedDoctorObj?.name || '-' }), " (", selectedDoctorObj?.specialty || '', ")"] }), _jsx("span", { className: "text-[10px] px-2 py-0.5 bg-amber-200 text-amber-900 rounded-md font-extrabold", children: "\u0645\u0634\u062E\u0635\u200C\u0634\u062F\u0647 \u0627\u0632 Slot" })] }), _jsxs("div", { className: "flex items-center justify-between text-slate-700 text-[11px] pt-1 border-t border-amber-200/60", children: [_jsxs("span", { children: ["\u062A\u0627\u0631\u06CC\u062E: ", _jsx("strong", { className: "dir-ltr inline-block text-slate-900", children: toFarsiDigits(date) })] }), _jsxs("span", { children: ["\u0633\u0627\u0639\u062A: ", _jsx("strong", { className: "dir-ltr inline-block text-slate-900", children: toFarsiDigits(timeSlot) })] })] })] })) : (_jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C / \u0645\u0637\u0628:" }), isRescheduleMode ? (_jsxs("div", { className: "p-3 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-800 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [selectedDoctorObj?.practice === 'aesthetic' ? (_jsx(Sparkles, { className: "w-4 h-4 text-indigo-600" })) : (_jsx(Stethoscope, { className: "w-4 h-4 text-teal-600" })), _jsxs("span", { children: [selectedDoctorObj?.name || 'پزشک فعلی', " (", selectedDoctorObj?.specialty, ")"] })] }), _jsx("span", { className: "px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-extrabold", children: "\u067E\u0632\u0634\u06A9 \u062B\u0627\u0628\u062A" })] })) : (_jsxs("select", { value: doctorId, onChange: (e) => handleDoctorChange(e.target.value), className: "w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-indigo-500", children: [_jsx("option", { value: "", children: "-- \u0627\u0646\u062A\u062E\u0627\u0628 \u067E\u0632\u0634\u06A9 \u0645\u0639\u0627\u0644\u062C --" }), doctors.map(d => (_jsxs("option", { value: d.id, children: [d.name, " (", d.specialty, ")"] }, d.id)))] }))] })), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u062E\u062F\u0645\u062A \u062F\u0631\u062E\u0648\u062D\u0633\u062A\u06CC (\u0648\u0627\u0628\u0633\u062A\u0647 \u0628\u0647 \u067E\u0632\u0634\u06A9):" }), _jsx(SearchableServiceSelect, { services: availableServices, selectedServiceId: serviceId, onChange: (srvId) => setServiceId(srvId), placeholder: !doctorId ? 'ابتدا پزشک را انتخاب کنید' : 'جستجوی خدمت...', disabled: !doctorId }), !doctorId && (_jsx("p", { className: "text-[11px] text-amber-700 font-medium mt-1", children: "\u26A0\uFE0F \u0627\u0628\u062A\u062F\u0627 \u067E\u0632\u0634\u06A9 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F \u062A\u0627 \u062E\u062F\u0645\u0627\u062A \u0645\u0631\u062A\u0628\u0637 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0634\u0648\u0646\u062F." }))] }), !isSlotBooking && (_jsxs(_Fragment, { children: [_jsx("div", { children: _jsx(JalaliDatePicker, { label: "\u062A\u0627\u0631\u06CC\u062E \u0646\u0648\u0628\u062A (\u0634\u0633\u06CC):", value: date, onChange: (newDate) => handleDateOrTimeOrDoctorChange(newDate || getTodayJalaliDate(), timeSlot, doctorId) }) }), _jsx("div", { children: _jsx(TimeSlotPicker, { value: timeSlot, onChange: (newSlot) => handleDateOrTimeOrDoctorChange(date, newSlot, doctorId), date: date, doctorId: doctorId, appointments: appointments, excludeAppointmentId: newAppointmentPrefill?.previousAppointmentId }) })] })), conflictError && (_jsx("div", { className: "p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-bold", children: conflictError })), _jsxs("div", { children: [_jsx("label", { className: "block font-bold text-slate-700 mb-1", children: "\u06CC\u0627\u062F\u062F\u0627\u0634\u062A \u0645\u0646\u0634\u06CC:" }), _jsx("textarea", { rows: 2, value: notes, onChange: (e) => setNotes(e.target.value), placeholder: "\u062A\u0648\u0636\u06CC\u062D\u0627\u062A \u062A\u06A9\u0645\u06CC\u0644\u06CC \u0646\u0648\u0628\u062A...", className: "w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 outline-none" })] }), _jsxs("div", { className: "flex items-center justify-end gap-2 pt-2 border-t border-slate-100", children: [_jsx("button", { type: "button", onClick: handleClose, className: "px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-200 transition-colors", children: "\u0627\u0646\u0635\u0631\u0627\u0641" }), _jsx("button", { type: "submit", disabled: !!conflictError || !doctorId, className: `px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors ${conflictError || !doctorId
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`, children: isRescheduleMode ? 'تأیید نهایی تغییر نوبت' : 'ثبت نوبت در تقویم' })] })] }))] }) }));
};
