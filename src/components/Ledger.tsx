import React, { useEffect, useState, useMemo, useRef } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, Payment, CLASSES, MONTHS, SECTIONS } from '../types';
import { Printer, Loader2, CheckCircle2, Plus } from 'lucide-react';
import { toBengaliNumber } from '../utils';

const BENGALI_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const SPECIAL_MONTHS = ['April', 'August', 'December'];
const STUDENTS_PER_CARD = 10;

const sumNumbers = (val: string): number => {
  if (!val) return 0;
  const numbers = val.match(/[-+]?\d*\.?\d+/g);
  if (!numbers) return 0;
  return numbers.reduce((acc, n) => acc + (parseFloat(n) || 0), 0);
};

export default function Ledger() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    class: 'One',
    section: 'A',
    year: new Date().getFullYear().toString(),
    cardDate: new Date().toISOString().split('T')[0],
  });

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{studentId: string, month: string, field: keyof Payment} | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const [showSaveSuccess, setShowSaveSuccess] = useState<{studentId: string, month: string, field: string} | null>(null);
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
    if (stdError) console.error("Error fetching students:", stdError);
    
    const { data: payData, error: payError } = await supabase
      .from('payments')
      .select('*')
      .eq('year', filters.year);

    if (payError) console.error("Error fetching payments:", payError);

    if (stdData) setStudents(stdData);
    if (payData) setPayments(payData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters.class, filters.section, filters.year]);

  const handleCellClick = (studentId: string, month: string, field: keyof Payment, currentValue: number) => {
    setEditingCell({ studentId, month, field });
    setInlineEditValue(currentValue === 0 ? '' : currentValue.toString());
  };

  const handleInlineSave = async () => {
    if (!editingCell) return;
    
    const newValue = sumNumbers(inlineEditValue);
    const { studentId, month, field } = editingCell;
    
    // Find existing payment for this student/month/year
    const existingPayment = payments.find(p => p.student_id === studentId && p.month === month && p.year === filters.year);
    
    // Only save if value changed
    const oldValue = existingPayment ? (existingPayment[field] as number) : 0;
    if (newValue === oldValue && existingPayment) {
      setEditingCell(null);
      return;
    }

    setSaving(true);
    const payload = {
      student_id: studentId,
      year: filters.year,
      month: month,
      ...(existingPayment || {}),
      [field]: newValue
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
      setShowSaveSuccess({ studentId, month, field });
      setTimeout(() => setShowSaveSuccess(null), 1000);
    } else {
      console.error("Error saving payment:", error);
    }
    setSaving(false);
    setEditingCell(null);
  };

  const handleAddStudent = async () => {
    const studentName = prompt("ছাত্রের নাম (Bengali):");
    if (!studentName) return;

    const studentRoll = prompt("রোল নম্বর:");
    if (!studentRoll) return;

    setSaving(true);
    try {
      const newStudent: Omit<Student, 'id' | 'created_at'> = {
        sl_no: studentRoll,
        name_bengali: studentName,
        name_english: '',
        father_name: '',
        father_occupation: '',
        mother_name: '',
        mother_occupation: '',
        present_address: '',
        present_phone: '',
        permanent_address: '',
        permanent_phone: '',
        date_of_birth: '2000-01-01',
        class: filters.class,
        section: filters.section,
        shift: 'Day',
        previous_institute: '',
        previous_address: '',
        previous_class: '',
        session: filters.year,
        photo_url: null,
      };

      const { data, error } = await supabase
        .from('students')
        .insert([newStudent])
        .select();

      if (!error && data) {
        setStudents(prev => [...prev, data[0]]);
      }
    } catch (error) {
      console.error("Error adding student:", error);
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
      monthly_backdue: Record<string, number>;
      miscellaneous: number;
      grand_total: number;
    }> = {};
    
    const columnTotals = {
      admission_fee: 0,
      backdue: 0,
      miscellaneous: 0,
      grand_total: 0,
      months: MONTHS.reduce((acc, m) => {
        acc[m.toLowerCase()] = { salary: 0, exam: 0, backdue: 0 };
        return acc;
      }, {} as Record<string, {salary: number, exam: number, backdue: number}>)
    };

    students.forEach(student => {
      studentTotals[student.id] = {
        admission_fee: 0,
        backdue: 0,
        monthly_salary: {},
        monthly_exam: {},
        monthly_backdue: {},
        miscellaneous: 0,
        grand_total: 0,
      };
    });

    payments.forEach(p => {
      const studentId = p.student_id;
      if (!studentTotals[studentId]) return;

      const monthKey = p.month.toLowerCase();

      studentTotals[studentId].admission_fee += p.admission_fee || 0;
      studentTotals[studentId].backdue += p.backdue || 0;
      studentTotals[studentId].monthly_salary[monthKey] = (studentTotals[studentId].monthly_salary[monthKey] || 0) + (p.salary || 0);
      studentTotals[studentId].monthly_exam[monthKey] = (studentTotals[studentId].monthly_exam[monthKey] || 0) + (p.exam_fee || 0);
      studentTotals[studentId].monthly_backdue[monthKey] = (studentTotals[studentId].monthly_backdue[monthKey] || 0) + (p.backdue || 0);
      studentTotals[studentId].miscellaneous += p.miscellaneous || 0;

      const rowSum = (p.admission_fee || 0) + (p.backdue || 0) + (p.salary || 0) + (p.exam_fee || 0) + (p.miscellaneous || 0);
      studentTotals[studentId].grand_total += rowSum;

      // Update column totals
      columnTotals.admission_fee += p.admission_fee || 0;
      columnTotals.backdue += p.backdue || 0;
      columnTotals.miscellaneous += p.miscellaneous || 0;
      columnTotals.grand_total += rowSum;
      
      if (columnTotals.months[monthKey]) {
        columnTotals.months[monthKey].salary += p.salary || 0;
        columnTotals.months[monthKey].exam += p.exam_fee || 0;
        columnTotals.months[monthKey].backdue += p.backdue || 0;
      }
    });

    return { studentTotals, columnTotals };
  }, [payments, students]);

  const chunkedStudents = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < students.length; i += STUDENTS_PER_CARD) {
      chunks.push(students.slice(i, i + STUDENTS_PER_CARD));
    }
    return chunks;
  }, [students]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#1e3a5f]" size={32} /></div>;

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm("আপনি কি এই ছাত্রের তথ্য মুছে ফেলতে চান?")) return;
    
    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId);

    if (!error) {
      setStudents(prev => prev.filter(s => s.id !== studentId));
    } else {
      console.error("Error removing student:", error);
    }
  };

  const renderCell = (studentId: string, month: string, field: keyof Payment, value: number, label?: string, colorClass: string = "text-blue-900") => {
    const isEditing = editingCell?.studentId === studentId && editingCell?.month === month && editingCell?.field === field;
    const isSuccess = showSaveSuccess?.studentId === studentId && showSaveSuccess?.month === month && showSaveSuccess?.field === field;

    return (
      <div 
        className={clsx(
          "flex-1 flex flex-col relative cursor-pointer hover:bg-blue-50 transition-colors min-h-[40px]",
          isEditing ? "bg-white" : ""
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleCellClick(studentId, month, field, value);
        }}
      >
        {label && <span className="text-[8px] px-1 font-black bg-gray-100/50 text-gray-500 uppercase">{label}</span>}
        <div className="flex-1 flex items-center justify-center relative p-1">
          {isEditing ? (
            <textarea
              ref={editInputRef as any}
              value={inlineEditValue}
              onChange={e => setInlineEditValue(e.target.value)}
              onBlur={handleInlineSave}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleInlineSave(); } }}
              className="w-full min-h-[30px] text-center bg-white outline-none border-2 border-blue-500 rounded-sm text-[10px] md:text-[12px] font-black resize-none overflow-hidden"
              rows={1}
            />
          ) : (
            <span className={clsx("text-[10px] md:text-[12px] font-black break-all text-center", value > 0 ? colorClass : "text-slate-300")}>
              {value > 0 ? toBengaliNumber(value) : '০'}
            </span>
          )}
          {isSuccess && (
            <CheckCircle2 size={10} className="text-green-500 absolute right-0.5 top-0.5" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-['Noto_Sans_Bengali'] text-[11px] text-[#1d2327]">
      {/* Top Filters */}
      <div className="bg-white p-2 md:p-4 flex flex-wrap items-end gap-3 md:gap-6 border-b border-[#ccc] print:hidden shadow-sm sticky top-0 z-20">
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">শ্রেণী</label>
          <select
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-24 md:w-32 font-bold"
          >
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">শাখা</label>
          <select
            value={filters.section}
            onChange={(e) => setFilters({...filters, section: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-20 md:w-32 font-bold"
          >
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">সন</label>
          <input
            type="number"
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-20 md:w-24 font-bold"
          />
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white px-4 md:px-6 py-1.5 md:py-2 rounded font-black flex items-center gap-2 hover:bg-blue-600 transition-all text-xs md:text-sm uppercase tracking-tighter"
        >
          <Printer size={16} /> প্রিন্ট লেজার
        </button>
      </div>

      {/* Ledger Cards */}
      <div className="p-2 md:p-6 space-y-6 md:space-y-12 print:p-0 print:space-y-0">
        {chunkedStudents.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-lg font-bold">কোনো তথ্য পাওয়া যায়নি।</div>
        ) : (
          chunkedStudents.map((studentChunk, cardIndex) => (
            <div key={cardIndex} className="bg-white border border-gray-400 shadow-sm print:border-none print:shadow-none page-break-after-always overflow-hidden">
              {/* Card Header */}
              <div className="bg-gray-100 p-3 md:p-4 text-center border-b border-gray-400 print:bg-white">
                <h1 className="text-lg md:text-2xl font-black mb-1 text-slate-900">নারিন্দা আইডিয়াল স্কুল - লেজার শিট</h1>
                <div className="flex flex-wrap justify-center gap-3 md:gap-8 text-[10px] md:text-sm font-black text-slate-600">
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-300">শ্রেণী: {filters.class}</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-300">শাখা: {filters.section}</span>
                  <span className="bg-white px-2 py-0.5 rounded border border-gray-300">সন: {toBengaliNumber(filters.year)}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-300">
                <table className="min-w-max w-full border-collapse border border-gray-400">
                  <thead>
                    <tr className="bg-gray-100 h-12 text-[11px]">
                      <th className="border border-gray-400 min-w-[50px] md:min-w-[70px] text-center font-black px-1" rowSpan={2}>রোল</th>
                      <th className="border border-gray-400 min-w-[150px] md:min-w-[200px] text-center font-black px-2" rowSpan={2}>ছাত্র/ছাত্রীর নাম</th>
                      <th className="border border-gray-400 min-w-[130px] md:min-w-[150px] text-center font-black px-1" rowSpan={2}>ভর্তি ও বকেয়া</th>
                      <th className="border border-gray-400 text-center font-black px-1" colSpan={12}>মাসের আদায়</th>
                      <th className="border border-gray-400 min-w-[60px] md:min-w-[80px] text-center font-black px-1" rowSpan={2}>অন্যান্য</th>
                      <th className="border border-gray-400 min-w-[80px] md:min-w-[100px] text-center font-black px-1" rowSpan={2}>মোট আয়</th>
                      <th className="border border-gray-400 w-[40px] no-print" rowSpan={2}></th>
                    </tr>
                    <tr className="bg-gray-50 h-8 text-[10px]">
                      {MONTHS.map(month => (
                        <th key={month} className={clsx(
                          "border border-gray-400 text-center font-black px-2 min-w-[60px] md:min-w-[80px]",
                          (month === 'November' || month === 'December') ? "border-r-[3px] border-black" : ""
                        )}>
                          {BENGALI_MONTHS_SHORT[MONTHS.indexOf(month)]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentChunk.map((student, idx) => {
                      const stTotals = totals.studentTotals[student.id];
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                          {/* Roll */}
                          <td className="border border-gray-400 p-2 align-middle text-center font-black text-[16px]">
                            {toBengaliNumber(student.sl_no)}
                          </td>

                          {/* Name */}
                          <td className="border border-gray-400 p-3 align-top">
                            <div className="font-black text-[14px] leading-tight">
                              {student.name_bengali}
                            </div>
                            {student.present_phone && (
                              <div className="text-[10px] text-slate-500 font-bold mt-1 whitespace-nowrap">
                                📞 {toBengaliNumber(student.present_phone)}
                              </div>
                            )}
                          </td>

                          {/* Admission & Arrears */}
                          <td className="border border-gray-400 p-0 align-top">
                            <div className="flex flex-col h-full divide-y divide-gray-400 min-h-[100px] md:min-h-[120px]">
                              <div className="flex-[1.5] flex flex-col">
                                {renderCell(student.id, MONTHS[0], 'admission_fee', stTotals?.admission_fee || 0, "ভর্তি")}
                              </div>
                              <div className="flex-[2] flex h-full divide-x divide-gray-400">
                                <div className="flex-1 flex flex-col bg-red-50/30">
                                  {renderCell(student.id, MONTHS[0], 'backdue', stTotals?.backdue || 0, "বকেয়া", "text-red-600")}
                                </div>
                                <div className="flex-1 flex flex-col bg-green-50/30">
                                  <div className="flex-1 flex flex-col">
                                    <span className="text-[8px] px-1 font-black bg-gray-100/50 text-gray-500 uppercase">জমা</span>
                                    <div className="flex-1 flex items-center justify-center text-[11px] md:text-[12px] font-black text-green-700 p-1">
                                      {toBengaliNumber(stTotals?.grand_total || 0)}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Months */}
                          {MONTHS.map((m) => {
                            const isSpecial = SPECIAL_MONTHS.includes(m);
                            const isLastTwo = m === 'November' || m === 'December';
                            return (
                              <td key={m} className={clsx(
                                "border border-gray-400 p-0 align-top h-full",
                                isLastTwo ? "border-r-[3px] border-black" : ""
                              )}>
                                <div className="flex flex-col h-full divide-y divide-gray-300 min-h-[100px] md:min-h-[120px]">
                                  {renderCell(student.id, m, 'salary', stTotals?.monthly_salary[m.toLowerCase()] || 0, "বেতন", "text-blue-900")}
                                  {isSpecial && renderCell(student.id, m, 'exam_fee', stTotals?.monthly_exam[m.toLowerCase()] || 0, "পরীক্ষা", "text-red-800")}
                                  {renderCell(student.id, m, 'backdue', stTotals?.monthly_backdue[m.toLowerCase()] || 0, "বকেয়া", "text-orange-700")}
                                </div>
                              </td>
                            );
                          })}

                          {/* Others */}
                          <td className="border border-gray-400 p-0 align-top">
                            <div className="flex flex-col h-full min-h-[100px] md:min-h-[120px]">
                              {renderCell(student.id, MONTHS[0], 'miscellaneous', stTotals?.miscellaneous || 0, "অন্যান্য", "text-gray-800")}
                            </div>
                          </td>

                          {/* Total */}
                          <td className="border border-gray-400 p-2 text-center font-black text-blue-900 bg-blue-50/50 align-middle">
                            <div className="flex flex-col items-center justify-center h-full">
                              <span className="text-[9px] text-blue-500 uppercase tracking-tighter font-black">মোট আয়</span>
                              <div className="text-[18px] font-black">
                                {toBengaliNumber(stTotals?.grand_total || 0)}
                              </div>
                            </div>
                          </td>

                          {/* Remove Button */}
                          <td className="border border-gray-400 text-center no-print p-0.5 align-middle">
                            <button 
                              onClick={() => handleRemoveStudent(student.id)} 
                              className="w-full h-full text-red-300 hover:text-red-600 font-bold transition-all text-xl active:scale-125"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-black text-[10px] md:text-[12px]">
                      <td colSpan={3} className="border border-gray-600 p-3 text-right uppercase tracking-wider">সর্বমোট (Grand Total)</td>
                      {MONTHS.map(m => (
                        <td key={m} className={clsx(
                          "border border-gray-600 text-center p-1",
                          (m === 'November' || m === 'December') ? "border-r-[3px] border-black" : ""
                        )}>
                          <div className="flex flex-col text-[9px]">
                            <span title="বেতন">{toBengaliNumber(totals.columnTotals.months[m.toLowerCase()].salary)}</span>
                            {SPECIAL_MONTHS.includes(m) && <span className="text-red-300" title="পরীক্ষা">{toBengaliNumber(totals.columnTotals.months[m.toLowerCase()].exam)}</span>}
                            <span className="text-orange-300" title="বকেয়া">{toBengaliNumber(totals.columnTotals.months[m.toLowerCase()].backdue)}</span>
                          </div>
                        </td>
                      ))}
                      <td className="border border-gray-600 text-center">{toBengaliNumber(totals.columnTotals.miscellaneous)}</td>
                      <td className="border border-gray-600 text-center bg-blue-900">{toBengaliNumber(totals.columnTotals.grand_total)}</td>
                      <td className="border border-gray-600 no-print"></td>
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
        className="fixed bottom-8 right-8 bg-[#1e3a5f] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform print:hidden z-20"
        title="নতুন ছাত্র যোগ করুন"
      >
        <Plus size={28} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm;
          }
          body {
            background: white;
            padding: 0;
            margin: 0;
          }
          .print\\:hidden {
            display: none !important;
          }
          .page-break-after-always {
            page-break-after: always;
            margin: 0;
            border: none;
            box-shadow: none;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #000 !important;
            font-size: 9px;
            padding: 2px !important;
          }
          .bg-[#1e3a5f] {
            background-color: #1e3a5f !important;
            color: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .text-white {
            color: white !important;
          }
        }
      `}} />
    </div>
  );
}
