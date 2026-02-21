import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, ResultCard, CLASSES } from '../types';
import { SUBJECTS, EXAM_NAMES } from '../constants';
import { Search, Save, Printer, Loader2, ChevronRight, FileText } from 'lucide-react';
import { toBengaliNumber, calculateGrade } from '../utils';
import ResultCardPrint from './ResultCardPrint';

export default function ResultProcessing() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [marks, setMarks] = useState<Partial<ResultCard>[]>([]);
  const [allMarks, setAllMarks] = useState<ResultCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [examType, setExamType] = useState('First Terminal');
  const [session, setSession] = useState('2025');

  const fetchStudents = async (search: string) => {
    if (search.length < 2) return;
    const { data } = await supabase
      .from('students')
      .select('*')
      .or(`name_bengali.ilike.%${search}%,name_english.ilike.%${search}%,sl_no.eq.${search}`)
      .limit(5);
    if (data) setStudents(data);
  };

  const fetchMarks = async (studentId: string) => {
    setLoading(true);
    const { data } = await supabase
      .from('result_cards')
      .select('*')
      .eq('student_id', studentId)
      .eq('session', session);
    
    if (data && data.length > 0) {
      setAllMarks(data);
      // Filter for current exam type for editing
      const currentExamMarks = SUBJECTS.map(s => {
        const existing = data.find(d => d.subject === s.name && d.exam_type === examType);
        return existing || {
          subject: s.name,
          tutorial_marks: 0,
          sub_marks: 0,
          obj_marks: 0,
          total_marks: 0,
          grade: 'F',
          grade_point: 0
        };
      });
      setMarks(currentExamMarks);
    } else {
      setAllMarks([]);
      setMarks(SUBJECTS.map(s => ({
        subject: s.name,
        tutorial_marks: 0,
        sub_marks: 0,
        obj_marks: 0,
        total_marks: 0,
        grade: 'F',
        grade_point: 0
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedStudent) fetchMarks(selectedStudent.id);
  }, [selectedStudent, examType, session]);

  const handleMarkChange = (index: number, field: keyof ResultCard, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newMarks = [...marks];
    const item = { ...newMarks[index], [field]: numValue };
    
    const subjectConfig = SUBJECTS.find(s => s.name === item.subject);
    const maxMarks = subjectConfig?.total || 100;
    
    // Auto calculate total and grade
    const total = (item.tutorial_marks || 0) + (item.sub_marks || 0) + (item.obj_marks || 0);
    const { grade, point } = calculateGrade(total, maxMarks, selectedStudent?.class || 'One');
    
    newMarks[index] = { ...item, total_marks: total, grade, grade_point: point };
    setMarks(newMarks);
  };

  const handleSave = async () => {
    if (!selectedStudent) return;
    setSaving(true);
    const payload = marks.map(m => ({
      ...m,
      student_id: selectedStudent.id,
      session,
      exam_type: examType
    }));

    const { error } = await supabase
      .from('result_cards')
      .upsert(payload, { onConflict: 'student_id,session,exam_type,subject' });

    if (error) alert('Error saving marks');
    else {
      alert('Marks saved successfully!');
      fetchMarks(selectedStudent.id); // Refresh all marks
    }
    setSaving(false);
  };

  if (showPrint && selectedStudent) {
    return (
      <div className="bg-white min-h-screen">
        <div className="p-4 border-b border-[#c3c4c7] flex justify-between items-center print:hidden">
          <button onClick={() => setShowPrint(false)} className="text-[#2271b1] font-medium">← Back to Editor</button>
          <button onClick={() => window.print()} className="wp-button flex items-center gap-2">
            <Printer size={16} /> Print Result Card
          </button>
        </div>
        <ResultCardPrint student={selectedStudent} allMarks={allMarks} examType={examType} session={session} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="wp-card p-6 rounded space-y-4">
        <h3 className="font-bold text-[#1d2327] flex items-center gap-2">
          <Search size={18} className="text-[#2271b1]" />
          Select Student
        </h3>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by Name or Roll..." 
            onChange={(e) => fetchStudents(e.target.value)}
            className="wp-input w-full pl-10"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        </div>

        {students.length > 0 && !selectedStudent && (
          <div className="border border-[#c3c4c7] rounded overflow-hidden divide-y divide-[#c3c4c7]">
            {students.map(s => (
              <button 
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className="w-full p-3 text-left hover:bg-[#f6f7f7] flex items-center justify-between group"
              >
                <div>
                  <p className="font-bold text-sm">{s.name_bengali}</p>
                  <p className="text-[10px] text-slate-500">Class {s.class} | SL.NO {toBengaliNumber(s.sl_no)}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-[#2271b1]" />
              </button>
            ))}
          </div>
        )}

        {selectedStudent && (
          <div className="flex items-center justify-between p-3 bg-[#f0f6fb] rounded border border-[#72aee6]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded border border-[#72aee6] flex items-center justify-center text-[#1e40af] font-bold">
                {toBengaliNumber(selectedStudent.sl_no)}
              </div>
              <div>
                <p className="font-bold text-sm">{selectedStudent.name_bengali}</p>
                <p className="text-[10px] text-slate-500">Class {selectedStudent.class} | {selectedStudent.session} Session</p>
              </div>
            </div>
            <button onClick={() => setSelectedStudent(null)} className="text-[10px] font-bold text-[#1e40af] hover:underline">Change</button>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="wp-card rounded overflow-hidden">
          <div className="p-4 border-b border-[#c3c4c7] flex items-center justify-between bg-[#f6f7f7]">
            <div className="flex gap-4">
              <select 
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="wp-input text-sm py-1"
              >
                {EXAM_NAMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select 
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="wp-input text-sm py-1"
              >
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowPrint(true)}
                className="text-sm font-medium text-[#2271b1] hover:underline px-3"
              >
                Preview
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="wp-button text-sm py-1 flex items-center gap-2"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Save Marks
              </button>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f6f7f7] text-left text-[10px] font-bold text-slate-500 uppercase">
                <th className="p-3 border-b border-[#c3c4c7]">Subject</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center">Tutorial</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center">Sub/Obj</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center bg-[#f0f0f1]">Total</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c3c4c7]">
              {marks.map((mark, idx) => (
                <tr key={mark.subject} className="hover:bg-[#f6f7f7]">
                  <td className="p-3 font-bold text-sm">
                    {mark.subject}
                    <span className="text-[8px] text-slate-400 block">Max: {SUBJECTS.find(s => s.name === mark.subject)?.total}</span>
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" 
                      value={mark.tutorial_marks}
                      onChange={(e) => handleMarkChange(idx, 'tutorial_marks', e.target.value)}
                      className="wp-input w-16 mx-auto block text-center text-sm py-1"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center">
                      <input 
                        type="number" 
                        placeholder="Sub"
                        value={mark.sub_marks}
                        onChange={(e) => handleMarkChange(idx, 'sub_marks', e.target.value)}
                        className="wp-input w-14 text-center text-xs py-1"
                      />
                      <input 
                        type="number" 
                        placeholder="Obj"
                        value={mark.obj_marks}
                        onChange={(e) => handleMarkChange(idx, 'obj_marks', e.target.value)}
                        className="wp-input w-14 text-center text-xs py-1"
                      />
                    </div>
                  </td>
                  <td className="p-3 text-center font-bold text-sm bg-[#f0f0f1]">
                    {toBengaliNumber(mark.total_marks || 0)}
                  </td>
                  <td className="p-3 text-center">
                    <span className={clsx(
                      "font-bold text-sm",
                      mark.grade === 'F' ? "text-red-600" : "text-[#2271b1]"
                    )}>
                      {mark.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!selectedStudent && (
        <div className="py-20 text-center wp-card rounded border-dashed">
          <FileText size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-500">Search and select a student to process results.</p>
        </div>
      )}
    </div>
  );
}
