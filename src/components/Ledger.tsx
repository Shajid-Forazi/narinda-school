import React, { useEffect, useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, Payment, CLASSES, MONTHS, SECTIONS } from '../types';
import { Printer, Loader2, X, Save, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { toBengaliNumber, formatCurrency } from '../utils';

const BENGALI_MONTHS = [
  'জানু', 'ফেব', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'
];

export default function Ledger() {
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({
    class: 'One',
    section: 'A',
    year: new Date().getFullYear().toString(),
  });
  const [sortConfig, setSortConfig] = useState<{
    key: 'sl_no' | 'name_bengali' | 'class' | 'section' | 'total';
    direction: 'asc' | 'desc';
  }>({ key: 'sl_no', direction: 'asc' });

  // Modal state
  const [selectedCell, setSelectedCell] = useState<{studentId: string, month: string} | null>(null);
  const [editValues, setEditValues] = useState({
    admission_fee: 0,
    backdue: 0,
    salary: 0,
    exam_fee: 0
  });

  const fetchData = async () => {
    setLoading(true);
    let query = supabase
      .from('students')
      .select('*')
      .eq('class', filters.class)
      .order('sl_no', { ascending: true });
      
    if (filters.section) {
      query = query.eq('section', filters.section);
    }

    const { data: stdData } = await query;
    
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

  const handleCellClick = (studentId: string, month: string) => {
    const payment = payments.find(p => p.student_id === studentId && p.month === month && p.year === filters.year);
    setEditValues({
      admission_fee: payment?.admission_fee || 0,
      backdue: payment?.backdue || 0,
      salary: payment?.salary || 0,
      exam_fee: payment?.exam_fee || 0
    });
    setSelectedCell({ studentId, month });
  };

  const handleSaveModal = async () => {
    if (!selectedCell) return;
    setSaving(true);

    const payload = {
      student_id: selectedCell.studentId,
      year: filters.year,
      month: selectedCell.month,
      ...editValues
    };

    const { data, error } = await supabase
      .from('payments')
      .upsert([payload], { onConflict: 'student_id,year,month' })
      .select();

    if (!error && data) {
      setPayments(prev => {
        const other = prev.filter(p => !(p.student_id === selectedCell.studentId && p.month === selectedCell.month && p.year === filters.year));
        return [...other, data[0]];
      });
      setSelectedCell(null);
    }
    setSaving(false);
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

  const sortedStudents = useMemo(() => {
    let sortableStudents = [...students];
    if (sortConfig.key) {
      sortableStudents.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Student];
        let bValue: any = b[sortConfig.key as keyof Student];

        if (sortConfig.key === 'total') {
           aValue = totals.studentTotals[a.id] || 0;
           bValue = totals.studentTotals[b.id] || 0;
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
    <div className="space-y-6">
      {/* Header / Filters */}
      <div className="bg-[#1e3a5f] p-4 rounded-lg flex flex-wrap items-end gap-4 print:hidden text-white shadow-md">
        <div className="space-y-1">
          <label className="text-xs font-bold opacity-80">শ্রেণী (Class)</label>
          <select 
            value={filters.class}
            onChange={(e) => setFilters({...filters, class: e.target.value})}
            className="wp-input text-sm py-1 text-black bg-white/90 border-none"
          >
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold opacity-80">শাখা (Section)</label>
          <select 
            value={filters.section}
            onChange={(e) => setFilters({...filters, section: e.target.value})}
            className="wp-input text-sm py-1 text-black bg-white/90 border-none"
          >
            <option value="">সব শাখা (All)</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold opacity-80">সন (Year)</label>
          <input 
            type="text" 
            value={filters.year}
            onChange={(e) => setFilters({...filters, year: e.target.value})}
            className="wp-input text-sm py-1 w-24 text-black bg-white/90 border-none"
          />
        </div>
        <div className="flex-1"></div>
        <button 
          onClick={() => window.print()}
          className="bg-white/10 hover:bg-white/20 text-white py-1.5 px-4 rounded text-sm flex items-center gap-2 transition-colors border border-white/20"
        >
          <Printer size={16} />
          Print Ledger
        </button>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-lg shadow overflow-hidden print:shadow-none">
        <div className="hidden print:block text-center mb-6">
          <h1 className="text-2xl font-bold text-[#1e3a5f]">নরিন্দা আইডিয়াল স্কুল এন্ড কলেজ</h1>
          <p className="text-sm font-bold mt-1">শ্রেণী: {filters.class} | শাখা: {filters.section} | বছর: {toBengaliNumber(filters.year)}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm print:text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-[#1e3a5f] text-white text-center">
                <th 
                  className="p-3 border border-white/10 w-12 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => requestSort('sl_no')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ক্র <SortIcon columnKey="sl_no" />
                  </div>
                </th>
                <th 
                  className="p-3 border border-white/10 text-left w-64 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => requestSort('name_bengali')}
                >
                  <div className="flex items-center gap-1">
                    ছাত্রের নাম <SortIcon columnKey="name_bengali" />
                  </div>
                </th>
                <th 
                  className="p-3 border border-white/10 w-20 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => requestSort('class')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ক্লাস <SortIcon columnKey="class" />
                  </div>
                </th>
                <th 
                  className="p-3 border border-white/10 w-20 cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => requestSort('section')}
                >
                  <div className="flex items-center justify-center gap-1">
                    শাখা <SortIcon columnKey="section" />
                  </div>
                </th>
                {BENGALI_MONTHS.map((m, i) => (
                  <th key={i} className="p-3 border border-white/10 w-20">{m}</th>
                ))}
                <th 
                  className="p-3 border border-white/10 w-24 bg-[#162c46] cursor-pointer hover:bg-white/10 transition-colors"
                  onClick={() => requestSort('total')}
                >
                  <div className="flex items-center justify-center gap-1">
                    মোট <SortIcon columnKey="total" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedStudents.length === 0 ? (
                <tr><td colSpan={16} className="p-8 text-center text-slate-400">No students found</td></tr>
              ) : (
                sortedStudents.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-blue-50 transition-colors group border-b border-slate-100">
                    <td className="p-2 text-center border-r border-slate-100 font-medium text-slate-500">
                      {toBengaliNumber(student.sl_no)}
                    </td>
                    <td className="p-2 border-r border-slate-100">
                      <div className="font-bold text-slate-800 text-base">{student.name_bengali}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Class: {student.class} | Roll: {toBengaliNumber(student.sl_no)}
                      </div>
                    </td>
                    <td className="p-2 text-center border-r border-slate-100 text-xs text-slate-500">
                      {student.class}
                    </td>
                    <td className="p-2 text-center border-r border-slate-100 text-xs text-slate-500">
                      {student.section}
                    </td>
                    {MONTHS.map((month, mIdx) => {
                      const payment = payments.find(p => p.student_id === student.id && p.month === month && p.year === filters.year);
                      const total = (payment?.admission_fee || 0) + (payment?.backdue || 0) + (payment?.salary || 0) + (payment?.exam_fee || 0);
                      
                      return (
                        <td 
                          key={month} 
                          onClick={() => handleCellClick(student.id, month)}
                          className="p-2 text-center border-r border-slate-100 cursor-pointer hover:bg-blue-100 transition-colors print:cursor-default"
                        >
                          {total > 0 ? (
                            <span className="font-bold text-green-600 text-base">{toBengaliNumber(total)}</span>
                          ) : (
                            <span className="text-slate-300 font-bold">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-bold text-[#1e3a5f] bg-slate-50">
                      {toBengaliNumber(totals.studentTotals[student.id] || 0)}
                    </td>
                  </tr>
                ))
              )}
              
              {/* Grand Total Row */}
              <tr className="bg-[#1e3a5f] text-white font-bold print:bg-[#1e3a5f] print:text-white">
                <td colSpan={4} className="p-3 text-right border-r border-white/10">সর্বমোট (Grand Total)</td>
                {MONTHS.map(m => (
                  <td key={m} className="p-3 text-center border-r border-white/10">
                    {toBengaliNumber(totals.monthTotals[m] || 0)}
                  </td>
                ))}
                <td className="p-3 text-center bg-[#162c46]">
                  {toBengaliNumber(totals.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 print:hidden animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#1e3a5f] p-4 flex justify-between items-center text-white">
              <h3 className="font-bold">Update Payment</h3>
              <button 
                onClick={() => setSelectedCell(null)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-slate-500">Student: <span className="font-bold text-slate-800">{students.find(s => s.id === selectedCell.studentId)?.name_bengali}</span></p>
                <p className="text-sm text-slate-500">Month: <span className="font-bold text-slate-800">{selectedCell.month}</span></p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">ভর্তি ফি (Admission)</label>
                  <input 
                    type="number" 
                    value={editValues.admission_fee}
                    onChange={e => setEditValues({...editValues, admission_fee: parseFloat(e.target.value) || 0})}
                    className="wp-input w-24 text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">বকেয়া (Backdue)</label>
                  <input 
                    type="number" 
                    value={editValues.backdue}
                    onChange={e => setEditValues({...editValues, backdue: parseFloat(e.target.value) || 0})}
                    className="wp-input w-24 text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">বেতন (Salary)</label>
                  <input 
                    type="number" 
                    value={editValues.salary}
                    onChange={e => setEditValues({...editValues, salary: parseFloat(e.target.value) || 0})}
                    className="wp-input w-24 text-right"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-600">পরীক্ষা ফি (Exam)</label>
                  <input 
                    type="number" 
                    value={editValues.exam_fee}
                    onChange={e => setEditValues({...editValues, exam_fee: parseFloat(e.target.value) || 0})}
                    className="wp-input w-24 text-right"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setSelectedCell(null)}
                  className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveModal}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#1e3a5f] text-white rounded-lg hover:bg-[#162c46] font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
