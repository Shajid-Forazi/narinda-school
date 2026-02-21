import React, { useEffect, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, Payment, CLASSES, MONTHS } from '../types';
import { Printer, Loader2 } from 'lucide-react';
import { toBengaliNumber, formatCurrency } from '../utils';

const BENGALI_MONTHS = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

export default function Ledger() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    class: 'One',
    year: new Date().getFullYear().toString(),
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: stdData } = await supabase
      .from('students')
      .select('*')
      .eq('class', filters.class)
      .order('sl_no', { ascending: true });
    
    const { data: payData } = await supabase
      .from('payments')
      .select('*')
      .eq('year', filters.year);

    if (stdData) setStudents(stdData);
    if (payData) setPayments(payData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const handleUpsert = async (studentId: string, month: string, field: keyof Payment, value: string) => {
    const numValue = parseFloat(value) || 0;
    const existing = payments.find(p => p.student_id === studentId && p.month === month && p.year === filters.year);
    
    const key = `${studentId}-${month}`;
    setSaving(key);

    const payload = {
      student_id: studentId,
      year: filters.year,
      month,
      admission_fee: existing?.admission_fee || 0,
      backdue: existing?.backdue || 0,
      salary: existing?.salary || 0,
      exam_fee: existing?.exam_fee || 0,
      [field]: numValue,
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
    }
    setSaving(null);
  };

  const totals = useMemo(() => {
    const studentTotals: Record<string, number> = {};
    const monthTotals: Record<string, number> = {};
    let grandTotal = 0;

    payments.forEach(p => {
      const rowSum = (p.admission_fee || 0) + (p.backdue || 0) + (p.salary || 0) + (p.exam_fee || 0);
      studentTotals[p.student_id] = (studentTotals[p.student_id] || 0) + rowSum;
      monthTotals[p.month] = (monthTotals[p.month] || 0) + rowSum;
      grandTotal += rowSum;
    });

    return { studentTotals, monthTotals, grandTotal };
  }, [payments]);

  const studentChunks = useMemo(() => {
    const chunks = [];
    for (let i = 0; i < students.length; i += 10) {
      chunks.push(students.slice(i, i + 10));
    }
    return chunks;
  }, [students]);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-[#2271b1]" size={32} /></div>;

  return (
    <div className="space-y-6">
      <div className="wp-card p-4 rounded flex items-end gap-4 print:hidden">
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">শ্রেণী (Class)</label>
          <select 
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
            className="wp-input text-sm py-1"
          >
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">বছর (Year)</label>
          <input 
            type="text" 
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="wp-input text-sm py-1 w-24"
          />
        </div>
        <button 
          onClick={() => window.print()}
          className="wp-button py-1 text-sm flex items-center gap-2"
        >
          <Printer size={16} />
          লেজার প্রিন্ট করুন (Print Ledger)
        </button>
      </div>

      <div className="print:w-full">
        {studentChunks.length === 0 ? (
          <div className="text-center p-8 text-slate-500">No students found for this class.</div>
        ) : (
          studentChunks.map((chunk, cardIndex) => (
            <div 
              key={cardIndex} 
              className="bg-white p-4 mb-8 print:mb-0 print:p-0 print:w-full print:h-screen print:break-after-page shadow-sm border border-slate-200 print:shadow-none print:border-none"
            >
              {/* Card Header */}
              <div className="mb-4 relative border-b-2 border-black pb-2">
                <h1 className="text-xl font-bold text-center">নরিন্দা আইডিয়াল স্কুল এন্ড কলেজ</h1>
                <div className="text-center text-xs font-bold mt-1 flex justify-center gap-4">
                  <span>শ্রেণী: {filters.class}</span>
                  <span>|</span>
                  <span>সাল: {toBengaliNumber(filters.year)}</span>
                </div>
                <div className="absolute right-0 top-0 border border-black px-2 py-0.5 text-[10px] font-bold">
                  কার্ড নং: {toBengaliNumber(cardIndex + 1)}
                </div>
              </div>

              {/* Table */}
              <table className="w-full border-collapse border border-black text-[9px]">
                <thead>
                  <tr className="bg-slate-50 print:bg-white text-center">
                    <th rowSpan={2} className="border border-black w-8 p-1">ক্রমিক নং</th>
                    <th rowSpan={2} className="border border-black w-32 p-1">ছাত্রের নাম ও পিতার নাম</th>
                    <th rowSpan={2} className="border border-black w-16 p-1">শ্রেণী ও শাখা</th>
                    <th rowSpan={2} className="border border-black w-24 p-1">গ্রাম/এলাকা + ডাকঘর + থানা</th>
                    {BENGALI_MONTHS.map((m, i) => (
                      <th key={i} className="border border-black min-w-[50px] p-0.5">{m}</th>
                    ))}
                    <th rowSpan={2} className="border border-black w-12 p-1">মোট</th>
                    <th rowSpan={2} className="border border-black w-10 p-1">ID</th>
                    <th rowSpan={2} className="border border-black w-12 p-1">স্বাক্ষর</th>
                  </tr>
                  <tr className="bg-slate-50 print:bg-white h-0">
                    {/* Empty row to satisfy rowSpan structure if needed, but headers are already set */}
                  </tr>
                </thead>
                <tbody>
                  {chunk.map((student, idx) => (
                    <tr key={student.id} className="print:break-inside-avoid">
                      <td className="border border-black text-center font-bold align-middle">
                        {toBengaliNumber((cardIndex * 10) + idx + 1)}
                      </td>
                      <td className="border border-black p-1 align-middle">
                        <div className="font-bold text-[10px]">{student.name_bengali}</div>
                        <div className="text-[8px] mt-0.5">{student.father_name}</div>
                      </td>
                      <td className="border border-black text-center align-middle">
                        <div>{student.class}</div>
                        <div>{student.section}</div>
                      </td>
                      <td className="border border-black p-1 align-middle text-[8px] leading-tight">
                        {student.present_address}
                      </td>
                      {MONTHS.map(month => {
                        const payment = payments.find(p => p.student_id === student.id && p.month === month && p.year === filters.year);
                        const isSaving = saving === `${student.id}-${month}`;
                        
                        return (
                          <td key={month} className="border border-black p-0 align-top">
                            <div className="flex flex-col divide-y divide-black/30">
                              <LedgerInput 
                                label="ভর্তি" 
                                value={payment?.admission_fee} 
                                onBlur={(val) => handleUpsert(student.id, month, 'admission_fee', val)}
                                isSaving={isSaving}
                              />
                              <LedgerInput 
                                label="বকেয়া" 
                                value={payment?.backdue} 
                                onBlur={(val) => handleUpsert(student.id, month, 'backdue', val)}
                                isSaving={isSaving}
                              />
                              <LedgerInput 
                                label="বেতন" 
                                value={payment?.salary} 
                                onBlur={(val) => handleUpsert(student.id, month, 'salary', val)}
                                isSaving={isSaving}
                              />
                              <LedgerInput 
                                label="পরীক্ষা" 
                                value={payment?.exam_fee} 
                                onBlur={(val) => handleUpsert(student.id, month, 'exam_fee', val)}
                                isSaving={isSaving}
                              />
                            </div>
                          </td>
                        );
                      })}
                      <td className="border border-black text-center font-bold align-middle">
                        {toBengaliNumber(totals.studentTotals[student.id] || 0)}
                      </td>
                      <td className="border border-black text-center align-middle text-[8px]">
                        {student.sl_no}
                      </td>
                      <td className="border border-black"></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="flex justify-between mt-8 px-8 print:mt-12">
                <div className="text-center">
                  <div className="border-t border-black pt-1 w-32 font-bold text-[10px]">হিসাবরক্ষক</div>
                </div>
                <div className="text-center">
                  <div className="border-t border-black pt-1 w-32 font-bold text-[10px]">প্রধান শিক্ষক</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function LedgerInput({ label, value, onBlur, isSaving }: { label: string, value?: number, onBlur: (val: string) => void, isSaving: boolean }) {
  const [localValue, setLocalValue] = useState(value?.toString() || '');

  useEffect(() => {
    setLocalValue(value?.toString() || '');
  }, [value]);

  return (
    <div className="flex items-center px-0.5 h-[14px]">
      <span className="text-[6px] font-bold w-6 shrink-0 leading-none">{label}</span>
      <input 
        type="number"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={() => onBlur(localValue)}
        className={clsx(
          "w-full bg-transparent border-none p-0 text-[8px] text-right outline-none focus:ring-0 leading-none h-full",
          isSaving && "opacity-50"
        )}
      />
    </div>
  );
}
