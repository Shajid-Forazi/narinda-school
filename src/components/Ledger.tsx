import React, { useEffect, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, Payment, CLASSES, MONTHS } from '../types';
import { Printer, Loader2 } from 'lucide-react';
import { toBengaliNumber, formatCurrency } from '../utils';

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

      <div className="wp-card rounded overflow-x-auto print:overflow-visible print:border-none print:shadow-none">
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-red-600">নরিন্দা আইডিয়াল স্কুল এন্ড কলেজ</h1>
          <p className="text-sm font-bold mt-1">শ্রেণী: {filters.class}, বছর: {toBengaliNumber(filters.year)}</p>
        </div>

        <table className="w-full border-collapse text-[10px] print:text-[8px] border border-black">
          <thead>
            <tr className="bg-[#f6f7f7] print:bg-white text-center">
              <th rowSpan={2} className="p-1 border border-black w-8">ক্রমিক নং</th>
              <th rowSpan={2} className="p-1 border border-black w-48">ছাত্রের নাম + পিতার নাম</th>
              <th rowSpan={2} className="p-1 border border-black w-20">শ্রেণী ও শাখা</th>
              <th rowSpan={2} className="p-1 border border-black w-32">গ্রামের নাম + ডাকঘর + থানা</th>
              <th colSpan={12} className="p-1 border border-black font-bold text-lg">বার্ষিক {toBengaliNumber(filters.year)} সালের</th>
              <th rowSpan={2} className="p-1 border border-black w-16">মোট</th>
              <th rowSpan={2} className="p-1 border border-black w-12">ID</th>
              <th rowSpan={2} className="p-1 border border-black w-20">স্বাক্ষর</th>
            </tr>
            <tr className="bg-[#f6f7f7] print:bg-white text-center">
              {MONTHS.map(m => (
                <th key={m} className="p-1 border border-black min-w-[60px]">
                  {m.slice(0, 3)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {students.map((student, idx) => (
              <tr key={student.id} className="hover:bg-[#f6f7f7] print:hover:bg-transparent">
                <td className="p-1 text-center border border-black align-middle font-bold">{toBengaliNumber(idx + 1)}</td>
                <td className="p-1 border border-black align-middle">
                  <div className="font-bold text-sm">{student.name_bengali}</div>
                  <div className="text-[9px] mt-1">{student.father_name}</div>
                </td>
                <td className="p-1 text-center border border-black align-middle">
                  <div className="font-bold">{student.class}</div>
                  <div className="text-[9px]">Sec: {student.section}</div>
                </td>
                <td className="p-1 border border-black align-middle text-[9px]">
                  {student.present_address}
                </td>
                {MONTHS.map(month => {
                  const payment = payments.find(p => p.student_id === student.id && p.month === month && p.year === filters.year);
                  const isSaving = saving === `${student.id}-${month}`;
                  
                  return (
                    <td key={month} className="p-0 border border-black align-top">
                      <div className="flex flex-col h-full divide-y divide-black/20">
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
                <td className="p-1 text-center font-bold border border-black align-middle">
                  {toBengaliNumber(totals.studentTotals[student.id] || 0)}
                </td>
                <td className="p-1 text-center border border-black align-middle text-[9px]">
                  {toBengaliNumber(student.sl_no)}
                </td>
                <td className="p-1 border border-black"></td>
              </tr>
            ))}
            <tr className="bg-[#f0f0f1] font-bold print:bg-white">
              <td colSpan={4} className="p-2 text-right border border-black">সর্বমোট (Grand Total)</td>
              {MONTHS.map(m => (
                <td key={m} className="p-1 text-center border border-black text-[9px]">
                  {toBengaliNumber(totals.monthTotals[m] || 0)}
                </td>
              ))}
              <td className="p-1 text-center border border-black">
                {toBengaliNumber(totals.grandTotal)}
              </td>
              <td colSpan={2} className="border border-black"></td>
            </tr>
          </tbody>
        </table>

        <div className="hidden print:flex justify-between mt-16 px-12">
          <div className="text-center">
            <div className="border-t border-black pt-1 w-40 font-bold">হিসাবরক্ষক</div>
          </div>
          <div className="text-center">
            <div className="border-t border-black pt-1 w-40 font-bold">প্রধান শিক্ষক</div>
          </div>
        </div>
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
    <div className="flex items-center justify-between px-1 py-0.5 h-6 hover:bg-slate-50">
      <span className="text-[7px] font-bold text-slate-500 w-8 shrink-0 print:text-black">{label}</span>
      <div className="flex-1 text-right">
        <input 
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => onBlur(localValue)}
          className={clsx(
            "w-full text-right bg-transparent border-none p-0 text-[9px] outline-none focus:ring-0 print:hidden",
            isSaving && "opacity-50"
          )}
        />
        <span className="hidden print:block text-[9px] font-medium">
          {value ? toBengaliNumber(value) : ''}
        </span>
      </div>
    </div>
  );
}
