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
    
    const newValue = parseFloat(inlineEditValue) || 0;
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

  const renderCell = (studentId: string, month: string, field: keyof Payment, value: number) => {
    const isEditing = editingCell?.studentId === studentId && editingCell?.month === month && editingCell?.field === field;
    const isSuccess = showSaveSuccess?.studentId === studentId && showSaveSuccess?.month === month && showSaveSuccess?.field === field;

    return (
      <td 
        className={clsx(
          "border border-[#ccc] text-center p-0 h-8 md:h-10 cursor-pointer transition-colors hover:bg-blue-50 relative",
          value > 0 ? "text-green-600 font-medium" : "text-slate-400"
        )}
        onClick={() => handleCellClick(studentId, month, field, value)}
      >
        {isEditing ? (
          <input
            ref={editInputRef}
            type="number"
            value={inlineEditValue}
            onChange={e => setInlineEditValue(e.target.value)}
            onBlur={handleInlineSave}
            onKeyDown={e => { if (e.key === 'Enter') handleInlineSave(); }}
            className="w-full h-full text-center bg-white outline-none border-2 border-blue-500 rounded-sm"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            {value > 0 ? toBengaliNumber(value) : '—'}
            {isSuccess && (
              <CheckCircle2 size={12} className="text-green-500 absolute right-0.5 top-0.5" />
            )}
          </div>
        )}
      </td>
    );
  };

  return (
    <div className="min-h-screen bg-white font-['Noto_Sans_Bengali'] text-[10px] md:text-[13px] text-[#1d2327]">
      {/* Top Filters */}
      <div className="bg-white p-2 md:p-4 flex flex-wrap items-end gap-3 md:gap-6 border-b border-[#ccc] print:hidden shadow-sm sticky top-0 z-10">
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500">শ্রেণী</label>
          <select
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-24 md:w-32"
          >
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500">শাখা</label>
          <select
            value={filters.section}
            onChange={(e) => setFilters({...filters, section: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-20 md:w-32"
          >
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500">সন</label>
          <input
            type="number"
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-20 md:w-24"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-[10px] md:text-xs font-bold text-slate-500">কার্ড মেয়াদ</label>
          <input
            type="date"
            value={filters.cardDate}
            onChange={(e) => setFilters({...filters, cardDate: e.target.value})}
            className="border border-[#ccc] rounded px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm outline-none focus:border-[#1e3a5f] w-28 md:w-36"
          />
        </div>
        <div className="flex-1"></div>
        <button
          onClick={() => window.print()}
          className="bg-[#1e3a5f] text-white px-4 md:px-6 py-1.5 md:py-2 rounded font-bold flex items-center gap-2 hover:bg-[#162a45] transition-colors text-xs md:text-sm"
        >
          <Printer size={16} /> প্রিন্ট
        </button>
      </div>

      {/* Ledger Cards */}
      <div className="p-2 md:p-6 space-y-6 md:space-y-12 print:p-0 print:space-y-0">
        {chunkedStudents.length === 0 ? (
          <div className="text-center py-20 text-slate-400 text-lg">কোনো তথ্য পাওয়া যায়নি।</div>
        ) : (
          chunkedStudents.map((studentChunk, cardIndex) => (
            <div key={cardIndex} className="bg-white border border-[#ccc] shadow-sm print:border-none print:shadow-none page-break-after-always overflow-hidden rounded-lg md:rounded-none">
              {/* Card Header */}
              <div className="bg-[#1e3a5f] text-white p-3 md:p-4 text-center border-b border-[#ccc]">
                <h1 className="text-lg md:text-xl font-bold mb-1">নারিন্দা আইডিয়াল স্কুল</h1>
                <div className="flex flex-wrap justify-center gap-3 md:gap-8 text-[10px] md:text-sm">
                  <span>শ্রেণী: {filters.class}</span>
                  <span>শাখা: {filters.section}</span>
                  <span>সন: {toBengaliNumber(filters.year)}</span>
                  <span>কার্ড মেয়াদ: {toBengaliNumber(new Date(filters.cardDate).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }))}</span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto w-full scrollbar-thin scrollbar-thumb-slate-200">
                <table className="min-w-max w-full border-collapse">
                  <thead>
                    <tr className="bg-[#1e3a5f] text-white text-[9px] md:text-[11px]">
                      <th className="border border-white/20 w-8 py-2 px-1" rowSpan={2}>ক্র</th>
                      <th className="border border-white/20 w-10 md:w-12 py-2 px-1" rowSpan={2}>রোল</th>
                      <th className="border border-white/20 w-32 md:w-40 py-2 px-2" rowSpan={2}>ছাত্রের নাম</th>
                      <th className="border border-white/20 py-1 w-16 md:w-20 px-1" rowSpan={2}>ভর্তি ফি</th>
                      {BENGALI_MONTHS_SHORT.map((month, idx) => {
                        const isSpecial = SPECIAL_MONTHS.includes(MONTHS[idx]);
                        return (
                          <th 
                            key={month} 
                            className="border border-white/20 py-1 px-1" 
                            colSpan={isSpecial ? 3 : 2}
                          >
                            {month}
                          </th>
                        );
                      })}
                      <th className="border border-white/20 w-14 md:w-16 py-2 px-1" rowSpan={2}>অন্যান্য</th>
                      <th className="border border-white/20 w-16 md:w-20 py-2 px-1" rowSpan={2}>মোট আয়</th>
                    </tr>
                    <tr className="bg-[#1e3a5f] text-white text-[8px] md:text-[10px]">
                      {MONTHS.map((m, idx) => (
                        <React.Fragment key={m}>
                          <th className="border border-white/20 py-1 w-12 md:w-14 px-1">বেতন</th>
                          {SPECIAL_MONTHS.includes(m) && <th className="border border-white/20 py-1 w-12 md:w-14 px-1">পরীক্ষা</th>}
                          <th className="border border-white/20 py-1 w-12 md:w-14 px-1">বকেয়া</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {studentChunk.map((student, idx) => {
                      const stTotals = totals.studentTotals[student.id];
                      return (
                        <tr key={student.id} className={idx % 2 === 0 ? "bg-white" : "bg-[#f9f9f9]"}>
                          <td className="border border-[#ccc] text-center py-2 px-1">{toBengaliNumber(idx + 1)}</td>
                          <td className="border border-[#ccc] text-center py-2 px-1">{toBengaliNumber(student.sl_no)}</td>
                          <td className="border border-[#ccc] px-2 py-2 font-bold text-left truncate max-w-[120px] md:max-w-none">{student.name_bengali}</td>
                          
                          {/* Admission Fee */}
                          {renderCell(student.id, MONTHS[0], 'admission_fee', stTotals?.admission_fee || 0)}

                          {/* Months */}
                          {MONTHS.map((m) => (
                            <React.Fragment key={m}>
                              {renderCell(student.id, m, 'salary', stTotals?.monthly_salary[m.toLowerCase()] || 0)}
                              {SPECIAL_MONTHS.includes(m) && renderCell(student.id, m, 'exam_fee', stTotals?.monthly_exam[m.toLowerCase()] || 0)}
                              {renderCell(student.id, m, 'backdue', stTotals?.monthly_backdue[m.toLowerCase()] || 0)}
                            </React.Fragment>
                          ))}

                          {/* Others & Total */}
                          {renderCell(student.id, MONTHS[0], 'miscellaneous', stTotals?.miscellaneous || 0)}
                          <td className="border border-[#ccc] text-center font-bold text-[#1e3a5f] bg-blue-50/30 px-1">
                            {toBengaliNumber(stTotals?.grand_total || 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#1e3a5f] text-white font-bold text-[10px] md:text-[12px]">
                      <td colSpan={3} className="border border-white/20 p-2 text-right">সর্বমোট (Grand Total)</td>
                      <td className="border border-white/20 text-center px-1">{toBengaliNumber(totals.columnTotals.admission_fee)}</td>
                      {MONTHS.map(m => (
                        <React.Fragment key={m}>
                          <td className="border border-white/20 text-center px-1">{toBengaliNumber(totals.columnTotals.months[m.toLowerCase()].salary)}</td>
                          {SPECIAL_MONTHS.includes(m) && (
                            <td className="border border-white/20 text-center px-1">{toBengaliNumber(totals.columnTotals.months[m.toLowerCase()].exam)}</td>
                          )}
                          <td className="border border-white/20 text-center px-1">{toBengaliNumber(totals.columnTotals.months[m.toLowerCase()].backdue)}</td>
                        </React.Fragment>
                      ))}
                      <td className="border border-white/20 text-center px-1">{toBengaliNumber(totals.columnTotals.miscellaneous)}</td>
                      <td className="border border-white/20 text-center bg-[#162a45] px-1">{toBengaliNumber(totals.columnTotals.grand_total)}</td>
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
