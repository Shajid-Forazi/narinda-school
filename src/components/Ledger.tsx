import React, { useEffect, useState, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, Payment, CLASSES, MONTHS, SECTIONS } from '../types';
import { Printer, Loader2, X, Save, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, Plus } from 'lucide-react';
import { toBengaliNumber, formatCurrency } from '../utils';

const BENGALI_MONTHS_SHORT = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

const BENGALI_MONTHS_FULL = [
  'জানুয়ারী', 'ফেব্রুয়ারী', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

const SPECIAL_MONTHS = ['April', 'August', 'December'];

const STUDENTS_PER_CARD = 10;

export default function Ledger() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    class: 'One',
    section: 'A',
    year: new Date().getFullYear().toString(),
    cardDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
  });
  const [sortConfig, setSortConfig] = useState<{
    key: 'sl_no' | 'name_bengali' | 'class' | 'section' | 'total';
    direction: 'asc' | 'desc';
  }>({ key: 'sl_no', direction: 'asc' });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{studentId: string, month: string, field: keyof Payment} | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<number>(0);
  const [showSaveSuccess, setShowSaveSuccess] = useState<boolean>(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    let studentQuery = supabase
      .from('students')
      .select('*')
      .eq('class', filters.class)
      .order('sl_no', { ascending: true });
      
    if (filters.section) {
      studentQuery = studentQuery.eq('section', filters.section);
    }

    const { data: stdData, error: stdError } = await studentQuery;
    if (stdError) {
      console.error("Error fetching students:", stdError);
      alert("Failed to fetch students: " + stdError.message);
    }
    
    const { data: payData, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('year', filters.year);

    if (payError) {
      console.error("Error fetching payments:", payError);
      alert("Failed to fetch payments: " + payError.message);
    }

    if (stdData) setStudents(stdData);
    if (payData) setPayments(payData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters.class, filters.section, filters.year]);

  const handleCellClick = (studentId: string, month: string, field: keyof Payment, currentValue: number) => {
    setEditingCell({ studentId, month, field });
    setInlineEditValue(currentValue);
  };

  const handleInlineSave = async () => {
    if (!editingCell) return;
    setSaving(true);

    const { studentId, month, field } = editingCell;
    const existingPayment = payments.find(p => p.student_id === studentId && p.month === month && p.year === filters.year);

    const payload = {
      student_id: studentId,
      year: filters.year,
      month: month,
      ...existingPayment,
      [field]: inlineEditValue
    };

    const { data, error } = await supabase
      .from('payments')
      .upsert([payload], { onConflict: 'student_id,year,month' })
      .select();

    if (!error && data) {
      setPayments(prev => {
        const other = prev.filter(p => !(p.student_id === studentId && p.month === month && p.year === filters.year));
        return [...other, data[0]];
      });
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 1500); // Show checkmark for 1.5 seconds
    } else {
      console.error("Error saving payment:", error);
      alert("Failed to save payment: " + error?.message);
    }
    setSaving(false);
    setEditingCell(null);
  };

  const handleAddStudent = async () => {
    const studentName = prompt("নতুন ছাত্রের নাম লিখুন (Enter new student's Bengali name):");
    if (!studentName) return;

    const studentRoll = prompt("নতুন ছাত্রের রোল নম্বর লিখুন (Enter new student's roll number):");
    if (!studentRoll) return;

    setSaving(true);
    try {
      const newStudent: Omit<Student, 'id' | 'created_at'> = {
        sl_no: studentRoll,
        name_bengali: studentName,
        name_english: '', // Default empty
        father_name: '',
        father_occupation: '',
        mother_name: '',
        mother_occupation: '',
        present_address: '',
        present_phone: '',
        permanent_address: '',
        permanent_phone: '',
        date_of_birth: '2000-01-01', // Default date
        class: filters.class,
        section: filters.section,
        shift: 'Morning', // Default shift
        previous_institute: '',
        previous_address: '',
        previous_class: '',
        session: filters.year, // Use current year as session
        photo_url: null,
      };

      const { data, error } = await supabase
        .from('students')
        .insert([newStudent])
        .select();

      if (error) {
        console.error("Error adding student:", error);
        alert("ছাত্র যোগ করতে ব্যর্থ: " + error.message);
      } else if (data && data.length > 0) {
        setStudents(prev => [...prev, data[0]]);
        alert(`ছাত্র ${studentName} সফলভাবে যোগ করা হয়েছে।`);
        fetchData(); // Re-fetch all data to ensure payments are also updated if any defaults are set
      }
    } catch (error) {
      console.error("Unexpected error adding student:", error);
      alert("একটি অপ্রত্যাশিত ত্রুটি হয়েছে।");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (editingCell && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingCell]);

  const totals = useMemo(() => {
    const studentTotals: Record<string, {
      admission_fee: number;
      backdue: number;
      monthly_salary: Record<string, number>;
      monthly_exam: Record<string, number>;
      miscellaneous: number;
      grand_total: number;
    }> = {};
    const columnTotals = {
      admission_fee: 0,
      backdue: 0,
      jan_salary: 0, jan_exam: 0,
      feb_salary: 0, feb_exam: 0,
      mar_salary: 0, mar_exam: 0,
      apr_salary: 0, apr_exam: 0,
      may_salary: 0, may_exam: 0,
      jun_salary: 0, jun_exam: 0,
      jul_salary: 0, jul_exam: 0,
      aug_salary: 0, aug_exam: 0,
      sep_salary: 0, sep_exam: 0,
      oct_salary: 0, oct_exam: 0,
      nov_salary: 0, nov_exam: 0,
      dec_salary: 0, dec_exam: 0,
      miscellaneous: 0,
      grand_total: 0,
    };

    students.forEach(student => {
      studentTotals[student.id] = {
        admission_fee: 0,
        backdue: 0,
        monthly_salary: {},
        monthly_exam: {},
        miscellaneous: 0,
        grand_total: 0,
      };
    });

    payments.forEach(p => {
      const studentId = p.student_id;
      if (!studentTotals[studentId]) return; // Should not happen if students are fetched correctly

      const monthIndex = MONTHS.indexOf(p.month);
      if (monthIndex === -1) return;
      const monthKey = MONTHS[monthIndex].toLowerCase();

      studentTotals[studentId].admission_fee += p.admission_fee || 0;
      studentTotals[studentId].backdue += p.backdue || 0;
      studentTotals[studentId].monthly_salary[monthKey] = (studentTotals[studentId].monthly_salary[monthKey] || 0) + (p.salary || 0);
      studentTotals[studentId].monthly_exam[monthKey] = (studentTotals[studentId].monthly_exam[monthKey] || 0) + (p.exam_fee || 0);
      studentTotals[studentId].miscellaneous += p.miscellaneous || 0;
      // studentTotals[studentId].miscellaneous += p.miscellaneous || 0;

      const rowSum = (p.admission_fee || 0) + (p.backdue || 0) + (p.salary || 0) + (p.exam_fee || 0) + (p.miscellaneous || 0);
      studentTotals[studentId].grand_total += rowSum;

      // Update column totals
      columnTotals.admission_fee += p.admission_fee || 0;
      columnTotals.backdue += p.backdue || 0;
      columnTotals[`${monthKey}_salary` as keyof typeof columnTotals] = (columnTotals[`${monthKey}_salary` as keyof typeof columnTotals] || 0) + (p.salary || 0);
      columnTotals[`${monthKey}_exam` as keyof typeof columnTotals] = (columnTotals[`${monthKey}_exam` as keyof typeof columnTotals] || 0) + (p.exam_fee || 0);
      columnTotals.miscellaneous += p.miscellaneous || 0;
      columnTotals.grand_total += rowSum;
    });

    return { studentTotals, columnTotals };
  }, [payments, students]);

  const sortedStudents = useMemo(() => {
    let sortableStudents = [...students];
    if (sortConfig.key) {
      sortableStudents.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Student];
        let bValue: any = b[sortConfig.key as keyof Student];

        if (sortConfig.key === 'total') {
           aValue = totals.studentTotals[a.id]?.grand_total || 0;
           bValue = totals.studentTotals[b.id]?.grand_total || 0;
        } else if (sortConfig.key === 'sl_no') {
           aValue = parseInt(a.sl_no) || 0;
           bValue = parseInt(b.sl_no) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableStudents;
  }, [students, sortConfig, totals]);

  const chunkedStudents = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < sortedStudents.length; i += STUDENTS_PER_CARD) {
      chunks.push(sortedStudents.slice(i, i + STUDENTS_PER_CARD));
    }
    return chunks;
  }, [sortedStudents]);

  const requestSort = (key: 'sl_no' | 'name_bengali' | 'class' | 'section' | 'total') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown size={14} className="opacity-30" />;
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#2271b1]" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white font-sans text-[13px] text-[#1d2327] print:bg-white">
      {/* Top Filters and Print Button */}
      <div className="bg-white p-4 flex flex-wrap items-end gap-4 border-b border-[#ccc] print:hidden shadow-sm">
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500">শ্রেণী (Class)</label>
          <select
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
            className="wp-input text-sm py-1"
          >
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500">শাখা (Section)</label>
          <select
            value={filters.section}
            onChange={(e) => setFilters({...filters, section: e.target.value})}
            className="wp-input text-sm py-1"
          >
            <option value="">সব শাখা (All)</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500">সন (Year)</label>
          <input
            type="number"
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="wp-input text-sm py-1 w-24"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-bold text-slate-500">কার্ড মেয়াদ (Card Date)</label>
          <input
            type="date"
            value={filters.cardDate}
            onChange={(e) => setFilters({...filters, cardDate: e.target.value})}
            className="wp-input text-sm py-1 w-36"
          />
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => window.print()}
          className="wp-button text-sm py-1.5 flex items-center gap-2 bg-white text-[#2271b1] border border-[#2271b1] hover:bg-[#f0f6fb]"
        >
          <Printer size={16} />
          প্রিন্ট (Print)
        </button>
      </div>

      {/* Ledger Cards */}
      <div className="p-4 space-y-8 print:p-0 print:space-y-0">
        {chunkedStudents.length === 0 ? (
          <div className="text-center py-20 text-slate-500">কোনো ছাত্র পাওয়া যায়নি।</div>
        ) : (
          chunkedStudents.map((studentChunk, cardIndex) => (
            <div key={cardIndex} className="wp-card rounded-lg overflow-hidden border border-[#ccc] print:border-none print:rounded-none print:shadow-none print:mb-8 page-break-after-always">
              {/* Card Header */}
              <div className="bg-[#1e3a5f] text-white p-4 text-center leading-tight">
                <h1 className="text-xl font-bold">নারিন্দা আইডিয়াল স্কুল</h1>
                <p className="text-sm">শ্রেণী: {filters.class} শাখা: {filters.section}</p>
                <p className="text-xs">সন: {toBengaliNumber(filters.year)} কার্ড মেয়াদ: {toBengaliNumber(new Date(filters.cardDate).toLocaleDateString('bn-BD'))}</p>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#f9f9f9] text-left font-bold text-[#1d2327]">
                      <th className="p-2 border border-[#ccc] w-10 text-center">ক্র</th><th className="p-2 border border-[#ccc] w-24 text-center">রোল</th><th className="p-2 border border-[#ccc] w-48 text-left">ছাত্রের নাম</th><th colSpan={3} className="p-2 border border-[#ccc] text-center">ভর্তি ও বকেয়া</th>{BENGALI_MONTHS_SHORT.map((month, idx) => (
                        SPECIAL_MONTHS.includes(MONTHS[idx]) ? (
                          <th colSpan={2} key={month} className="p-2 border border-[#ccc] text-center">{month}</th>
                        ) : (
                          <th key={month} className="p-2 border border-[#ccc] text-center">{month}</th>
                        )
                      ))}<th className="p-2 border border-[#ccc] w-20 text-center">অন্যান্য</th><th className="p-2 border border-[#ccc] w-24 text-center">মোট আয়</th>
                    </tr>
                    <tr className="bg-[#f9f9f9] text-left font-bold text-[#1d2327]">
                      <th className="p-1 border border-[#ccc]"></th><th className="p-1 border border-[#ccc]"></th><th className="p-1 border border-[#ccc]"></th><th className="p-1 border border-[#ccc] text-center text-xs">ভর্তি</th><th className="p-1 border border-[#ccc] text-center text-xs">জমা</th><th className="p-1 border border-[#ccc] text-center text-xs">বকেয়া</th>{BENGALI_MONTHS_SHORT.map((month, idx) => (
                        SPECIAL_MONTHS.includes(MONTHS[idx]) ? (
                          <React.Fragment key={month}>
                            <th className="p-1 border border-[#ccc] text-center text-xs">বেতন</th>
                            <th className="p-1 border border-[#ccc] text-center text-xs">পরীক্ষা</th>
                          </React.Fragment>
                        ) : (
                          <th key={month} className="p-1 border border-[#ccc] text-center text-xs">বেতন/জমা</th>
                        )
                      ))}<th className="p-1 border border-[#ccc]"></th><th className="p-1 border border-[#ccc]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentChunk.map((student, studentIndex) => {
                      const studentPaymentTotals = totals.studentTotals[student.id];
                      const admissionFee = studentPaymentTotals?.admission_fee || 0;
                      const backdue = studentPaymentTotals?.backdue || 0;
                      const totalPaid = studentPaymentTotals?.grand_total || 0;

                      return (
                        <tr key={student.id} className={clsx(
                          "border-b border-[#eee]",
                          studentIndex % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"
                        )}>
                          <td className="p-2 border border-[#ccc] text-center text-slate-500">{toBengaliNumber(cardIndex * STUDENTS_PER_CARD + studentIndex + 1)}</td>
                          <td className="p-2 border border-[#ccc] text-center text-slate-700">{toBengaliNumber(student.sl_no)}</td>
                          <td className="p-2 border border-[#ccc] text-left font-bold text-slate-800">{student.name_bengali}</td><td
                            className={clsx("p-2 border border-[#ccc] text-center", admissionFee > 0 ? "text-green-600" : "text-slate-400")}
                            onClick={() => handleCellClick(student.id, MONTHS[0], 'admission_fee', admissionFee)}
                          >
                            {editingCell?.studentId === student.id && editingCell?.month === MONTHS[0] && editingCell?.field === 'admission_fee' ? (
                              <input
                                ref={editInputRef}
                                type="number"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(parseFloat(e.target.value) || 0)}
                                onBlur={handleInlineSave}
                                onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                                className="w-full text-center wp-input p-0 border-none focus:ring-0"
                              />
                            ) : (
                              <span className="relative group">
                                {admissionFee > 0 ? toBengaliNumber(admissionFee) : '—'}
                                {showSaveSuccess && editingCell?.studentId === student.id && editingCell?.month === MONTHS[0] && editingCell?.field === 'admission_fee' && (
                                  <CheckCircle2 size={16} className="text-green-500 absolute -right-5 top-0" />
                                )}
                              </span>
                            )}
                          </td><td className="p-2 border border-[#ccc] text-center text-slate-400">—</td><td
                            className={clsx("p-2 border border-[#ccc] text-center", backdue > 0 ? "text-red-600" : "text-slate-400")}
                            onClick={() => handleCellClick(student.id, MONTHS[0], 'backdue', backdue)}
                          >
                            {editingCell?.studentId === student.id && editingCell?.month === MONTHS[0] && editingCell?.field === 'backdue' ? (
                              <input
                                ref={editInputRef}
                                type="number"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(parseFloat(e.target.value) || 0)}
                                onBlur={handleInlineSave}
                                onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                                className="w-full text-center wp-input p-0 border-none focus:ring-0"
                              />
                            ) : (
                              <span className="relative group">
                                {backdue > 0 ? toBengaliNumber(backdue) : '—'}
                                {showSaveSuccess && editingCell?.studentId === student.id && editingCell?.month === MONTHS[0] && editingCell?.field === 'backdue' && (
                                  <CheckCircle2 size={16} className="text-green-500 absolute -right-5 top-0" />
                                )}
                              </span>
                            )}
                          </td>{MONTHS.map((month, idx) => {
                            const monthKey = month.toLowerCase();
                            const salary = studentPaymentTotals?.monthly_salary[monthKey] || 0;
                            const exam = studentPaymentTotals?.monthly_exam[monthKey] || 0;

                            if (SPECIAL_MONTHS.includes(month)) {
                              return (
                                <React.Fragment key={month}>
                                  <td
                                    className={clsx("p-2 border border-[#ccc] text-center", salary > 0 ? "text-green-600" : "text-slate-400")}
                                    onClick={() => handleCellClick(student.id, month, 'salary', salary)}
                                  >
                                    {editingCell?.studentId === student.id && editingCell?.month === month && editingCell?.field === 'salary' ? (
                                      <input
                                        ref={editInputRef}
                                        type="number"
                                        value={inlineEditValue}
                                        onChange={e => setInlineEditValue(parseFloat(e.target.value) || 0)}
                                        onBlur={handleInlineSave}
                                        onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                                        className="w-full text-center wp-input p-0 border-none focus:ring-0"
                                      />
                                    ) : (
                                      <span className="relative group">
                                        {salary > 0 ? toBengaliNumber(salary) : '—'}
                                        {showSaveSuccess && editingCell?.studentId === student.id && editingCell?.month === month && editingCell?.field === 'salary' && (
                                          <CheckCircle2 size={16} className="text-green-500 absolute -right-5 top-0" />
                                        )}
                                      </span>
                                    )}
                                  </td>
                                  <td
                                    className={clsx("p-2 border border-[#ccc] text-center", exam > 0 ? "text-green-600" : "text-slate-400")}
                                    onClick={() => handleCellClick(student.id, month, 'exam_fee', exam)}
                                  >
                                    {editingCell?.studentId === student.id && editingCell?.month === month && editingCell?.field === 'exam_fee' ? (
                                      <input
                                        ref={editInputRef}
                                        type="number"
                                        value={inlineEditValue}
                                        onChange={e => setInlineEditValue(parseFloat(e.target.value) || 0)}
                                        onBlur={handleInlineSave}
                                        onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                                        className="w-full text-center wp-input p-0 border-none focus:ring-0"
                                      />
                                    ) : (
                                      <span className="relative group">
                                        {exam > 0 ? toBengaliNumber(exam) : '—'}
                                        {showSaveSuccess && editingCell?.studentId === student.id && editingCell?.month === month && editingCell?.field === 'exam_fee' && (
                                          <CheckCircle2 size={16} className="text-green-500 absolute -right-5 top-0" />
                                        )}
                                      </span>
                                    )}
                                  </td>
                                </React.Fragment>
                              );
                            } else {
                              return (
                                <td
                                  key={month}
                                  className={clsx("p-2 border border-[#ccc] text-center", salary > 0 ? "text-green-600" : "text-slate-400")}
                                  onClick={() => handleCellClick(student.id, month, 'salary', salary)}
                                >
                                  {editingCell?.studentId === student.id && editingCell?.month === month && editingCell?.field === 'salary' ? (
                                    <input
                                      ref={editInputRef}
                                      type="number"
                                      value={inlineEditValue}
                                      onChange={e => setInlineEditValue(parseFloat(e.target.value) || 0)}
                                      onBlur={handleInlineSave}
                                      onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                                      className="w-full text-center wp-input p-0 border-none focus:ring-0"
                                    />
                                  ) : (
                                    <span className="relative group">
                                      {salary > 0 ? toBengaliNumber(salary) : '—'}
                                      {showSaveSuccess && editingCell?.studentId === student.id && editingCell?.month === month && editingCell?.field === 'salary' && (
                                        <CheckCircle2 size={16} className="text-green-500 absolute -right-5 top-0" />
                                      )}
                                    </span>
                                  )}
                                </td>
                              );
                            }
                          })}<td
                            className={clsx("p-2 border border-[#ccc] text-center", studentPaymentTotals?.miscellaneous > 0 ? "text-green-600" : "text-slate-400")}
                            onClick={() => handleCellClick(student.id, MONTHS[0], 'miscellaneous', studentPaymentTotals?.miscellaneous || 0)}
                          >
                            {editingCell?.studentId === student.id && editingCell?.field === 'miscellaneous' ? (
                              <input
                                ref={editInputRef}
                                type="number"
                                value={inlineEditValue}
                                onChange={e => setInlineEditValue(parseFloat(e.target.value) || 0)}
                                onBlur={handleInlineSave}
                                onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
                                className="w-full text-center wp-input p-0 border-none focus:ring-0"
                              />
                            ) : (
                              <span className="relative group">
                                {studentPaymentTotals?.miscellaneous > 0 ? toBengaliNumber(studentPaymentTotals.miscellaneous) : '—'}
                                {showSaveSuccess && editingCell?.studentId === student.id && editingCell?.field === 'miscellaneous' && (
                                  <CheckCircle2 size={16} className="text-green-500 absolute -right-5 top-0" />
                                )}
                              </span>
                            )}
                          </td><td className="p-2 border border-[#ccc] text-center font-bold text-[#1e3a5f]">{toBengaliNumber(totalPaid)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Card Footer - Grand Total Row */}
                    <tr className="bg-[#1e3a5f] text-white font-bold">
                      <td colSpan={3} className="p-3 border border-white/10 text-right">সর্বমোট (Grand Total)</td><td className="p-3 border border-white/10 text-center">{toBengaliNumber(totals.columnTotals.admission_fee)}</td><td className="p-3 border border-white/10 text-center">—</td><td className="p-3 border border-white/10 text-center">{toBengaliNumber(totals.columnTotals.backdue)}</td>{MONTHS.map((month, idx) => {
                        const monthKey = month.toLowerCase();
                        if (SPECIAL_MONTHS.includes(month)) {
                          return (
                            <React.Fragment key={month}>
                              <td className="p-3 border border-white/10 text-center">{toBengaliNumber(totals.columnTotals[`${monthKey}_salary` as keyof typeof totals.columnTotals])}</td>
                              <td className="p-3 border border-white/10 text-center">{toBengaliNumber(totals.columnTotals[`${monthKey}_exam` as keyof typeof totals.columnTotals])}</td>
                            </React.Fragment>
                          );
                        } else {
                          return (
                            <td key={month} className="p-3 border border-white/10 text-center">{toBengaliNumber(totals.columnTotals[`${monthKey}_salary` as keyof typeof totals.columnTotals])}</td>
                          );
                        }
                      })}<td className="p-3 border border-white/10 text-center">—</td><td className="p-3 border border-white/10 text-center">{toBengaliNumber(totals.columnTotals.grand_total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Student FAB */}
      <button
        onClick={handleAddStudent}
        className="fixed bottom-6 right-6 wp-button rounded-full w-14 h-14 flex items-center justify-center shadow-lg print:hidden"
        title="Add New Student"
      >
        <Plus size={24} />
      </button>
    </div>
  );
}
