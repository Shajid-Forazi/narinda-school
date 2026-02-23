import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Student, ResultCard, CLASSES, Subject } from '../types';
import { SUBJECTS, EXAM_NAMES } from '../constants';
import { Search, Save, Printer, Loader2, ChevronRight, FileText, Plus, Trash2, Edit2, X, Check, Ban } from 'lucide-react';
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

  // Subject Management State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectForm, setSubjectForm] = useState<Partial<Subject>>({
    name: '',
    total_marks: 100,
    has_tutorial: true,
    has_mcq: false,
    has_cq: true,
    order_index: 0
  });

  const fetchStudents = async (search: string) => {
    if (search.length < 2) return;
    const { data } = await supabase
      .from('students')
      .select('*')
      .or(`name_bengali.ilike.%${search}%,name_english.ilike.%${search}%,sl_no.eq.${search}`)
      .limit(5);
    if (data) setStudents(data);
  };

  const fetchSubjects = async () => {
    const { data, error } = await supabase.from('subjects').select('*').order('order_index', { ascending: true });
    
    if (!error && data && data.length > 0) {
      setSubjects(data);
    } else {
      // Seed default subjects if none exist
      const defaultSubjects = SUBJECTS.map((s, i) => ({
        name: s.name,
        total_marks: s.total,
        has_tutorial: true,
        has_mcq: false,
        has_cq: true,
        order_index: i
      }));
      
      const { data: seeded, error: seedError } = await supabase.from('subjects').insert(defaultSubjects).select();
      if (seeded) setSubjects(seeded);
      else if (seedError) {
        console.error("Error seeding subjects:", seedError);
      }
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSaveSubject = async () => {
    if (!subjectForm.name || !subjectForm.total_marks) return;
    
    const payload = {
      name: subjectForm.name,
      total_marks: subjectForm.total_marks,
      has_tutorial: subjectForm.has_tutorial,
      has_mcq: subjectForm.has_mcq,
      has_cq: subjectForm.has_cq,
      order_index: editingSubject ? editingSubject.order_index : subjects.length
    };

    let error;
    if (editingSubject) {
      const { error: updateError } = await supabase
        .from('subjects')
        .update(payload)
        .eq('id', editingSubject.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('subjects')
        .insert([payload]);
      error = insertError;
    }

    if (!error) {
      fetchSubjects();
      // Don't close modal, just reset form if adding, or switch back to add mode if editing
      if (editingSubject) {
          setEditingSubject(null);
      }
      setSubjectForm({
        name: '',
        total_marks: 100,
        has_tutorial: true,
        has_mcq: false,
        has_cq: true,
        order_index: 0
      });
    } else {
      console.error("Error saving subject:", error);
      alert("Failed to save subject. Please make sure the 'subjects' table exists in Supabase. Error: " + error.message);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (!error) fetchSubjects();
    else {
      console.error("Error deleting subject:", error);
      alert("Failed to delete subject: " + error.message);
    }
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
      const currentExamMarks = subjects.map(s => {
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
      setMarks(subjects.map(s => ({
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
    if (selectedStudent && subjects.length > 0) fetchMarks(selectedStudent.id);
  }, [selectedStudent, examType, session, subjects]);

  const handleMarkChange = (index: number, field: keyof ResultCard, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newMarks = [...marks];
    const item = { ...newMarks[index], [field]: numValue };
    
    const subjectConfig = subjects.find(s => s.name === item.subject);
    const maxMarks = subjectConfig?.total_marks || 100;
    
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
        <ResultCardPrint student={selectedStudent} allMarks={allMarks} examType={examType} session={session} subjects={subjects} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-6">
      {/* Top Header with Subject Manager Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#1d2327]">Result Processing</h2>
        <button 
            onClick={() => setShowSubjectModal(true)}
            className="wp-button text-sm py-1.5 flex items-center gap-2 bg-white text-[#2271b1] border border-[#2271b1] hover:bg-[#f0f6fb]"
        >
            <FileText size={16} /> Manage Subjects
        </button>
      </div>

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
              <input
                list="result-sessions"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                className="w-[100px] h-9 border border-input rounded-md px-3 text-sm bg-background"
                placeholder="Session"
              />
              <datalist id="result-sessions">
                {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1, new Date().getFullYear() + 2].map(y => (
                  <option key={y} value={y.toString()} />
                ))}
              </datalist>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowSubjectModal(true)}
                className="text-sm font-medium text-[#2271b1] hover:underline px-3 flex items-center gap-1"
              >
                <Edit2 size={14} /> Subjects
              </button>
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
                <th className="p-3 border-b border-[#c3c4c7] text-center">CQ</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center">MCQ</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center bg-[#f0f0f1]">Total</th>
                <th className="p-3 border-b border-[#c3c4c7] text-center">Grade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c3c4c7]">
              {marks.map((mark, idx) => {
                const subject = subjects.find(s => s.name === mark.subject);
                if (!subject) return null;

                return (
                  <tr key={mark.subject} className="hover:bg-[#f6f7f7]">
                    <td className="p-3 font-bold text-sm">
                      {mark.subject}
                      <span className="text-[8px] text-slate-400 block">Max: {subject.total_marks}</span>
                    </td>
                    <td className="p-3">
                      {subject.has_tutorial ? (
                        <input 
                          type="number" 
                          value={mark.tutorial_marks}
                          onChange={(e) => handleMarkChange(idx, 'tutorial_marks', e.target.value)}
                          className="wp-input w-16 mx-auto block text-center text-sm py-1"
                        />
                      ) : (
                        <div className="text-center text-slate-300">-</div>
                      )}
                    </td>
                    <td className="p-3">
                      {subject.has_cq ? (
                        <input 
                          type="number" 
                          placeholder="CQ"
                          value={mark.sub_marks}
                          onChange={(e) => handleMarkChange(idx, 'sub_marks', e.target.value)}
                          className="wp-input w-16 mx-auto block text-center text-sm py-1"
                        />
                      ) : (
                        <div className="text-center text-slate-300">-</div>
                      )}
                    </td>
                    <td className="p-3">
                      {subject.has_mcq ? (
                        <input 
                          type="number" 
                          placeholder="MCQ"
                          value={mark.obj_marks}
                          onChange={(e) => handleMarkChange(idx, 'obj_marks', e.target.value)}
                          className="wp-input w-16 mx-auto block text-center text-sm py-1"
                        />
                      ) : (
                        <div className="text-center text-slate-300">-</div>
                      )}
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
                );
              })}
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

      {/* Subject Management Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4">
                    <h3 className="font-bold text-xl text-[#1d2327]">Subject Management</h3>
                    <button onClick={() => setShowSubjectModal(false)} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Add/Edit Form */}
                <div className="bg-[#f0f6fb] p-4 rounded border border-[#72aee6] space-y-3">
                    <h4 className="font-bold text-sm text-[#2271b1]">{editingSubject ? 'Edit Subject' : 'Add New Subject'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Subject Name</label>
                            <input 
                                type="text" 
                                value={subjectForm.name}
                                onChange={e => setSubjectForm({...subjectForm, name: e.target.value})}
                                className="wp-input w-full"
                                placeholder="e.g. Bangla 1st Paper"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Total Marks</label>
                            <input 
                                type="number" 
                                value={subjectForm.total_marks}
                                onChange={e => setSubjectForm({...subjectForm, total_marks: parseInt(e.target.value) || 0})}
                                className="wp-input w-full"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-4 pt-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={subjectForm.has_tutorial}
                                onChange={e => setSubjectForm({...subjectForm, has_tutorial: e.target.checked})}
                                className="rounded border-slate-300 text-[#2271b1] focus:ring-[#2271b1]"
                            />
                            Has Tutorial
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={subjectForm.has_mcq}
                                onChange={e => setSubjectForm({...subjectForm, has_mcq: e.target.checked})}
                                className="rounded border-slate-300 text-[#2271b1] focus:ring-[#2271b1]"
                            />
                            Has MCQ
                        </label>
                        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={subjectForm.has_cq}
                                onChange={e => setSubjectForm({...subjectForm, has_cq: e.target.checked})}
                                className="rounded border-slate-300 text-[#2271b1] focus:ring-[#2271b1]"
                            />
                            Has CQ
                        </label>
                    </div>
                    <div className="flex justify-end gap-2">
                        {editingSubject && (
                            <button 
                                onClick={() => {
                                    setEditingSubject(null);
                                    setSubjectForm({
                                        name: '',
                                        total_marks: 100,
                                        has_tutorial: true,
                                        has_mcq: false,
                                        has_cq: true,
                                        order_index: subjects.length
                                    });
                                }}
                                className="px-3 py-1 text-slate-500 hover:text-slate-700 text-sm"
                            >
                                Cancel Edit
                            </button>
                        )}
                        <button 
                            onClick={handleSaveSubject}
                            className="wp-button px-4 py-1.5 text-sm font-medium flex items-center gap-2"
                        >
                            {editingSubject ? <Save size={14} /> : <Plus size={14} />}
                            {editingSubject ? 'Update Subject' : 'Add Subject'}
                        </button>
                    </div>
                </div>
                
                {/* Subject List Table */}
                <div className="border border-[#c3c4c7] rounded overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7] text-xs font-bold text-slate-500 uppercase">
                                <th className="p-2 w-12 text-center">SL</th>
                                <th className="p-2">Subject Name</th>
                                <th className="p-2 w-20 text-center">Total</th>
                                <th className="p-2 w-20 text-center">Tutorial</th>
                                <th className="p-2 w-20 text-center">MCQ</th>
                                <th className="p-2 w-20 text-center">CQ</th>
                                <th className="p-2 w-20 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c3c4c7]">
                            {subjects.map((s, i) => (
                                <tr key={s.id} className={clsx("hover:bg-[#f6f7f7]", editingSubject?.id === s.id && "bg-blue-50")}>
                                    <td className="p-2 text-center text-sm">{toBengaliNumber(i + 1)}</td>
                                    <td className="p-2 text-sm font-bold">{s.name}</td>
                                    <td className="p-2 text-center text-sm">{s.total_marks}</td>
                                    <td className="p-2 text-center">
                                        {s.has_tutorial ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />}
                                    </td>
                                    <td className="p-2 text-center">
                                        {s.has_mcq ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />}
                                    </td>
                                    <td className="p-2 text-center">
                                        {s.has_cq ? <Check size={16} className="text-green-600 mx-auto" /> : <X size={16} className="text-slate-300 mx-auto" />}
                                    </td>
                                    <td className="p-2 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setEditingSubject(s);
                                                    setSubjectForm(s);
                                                }}
                                                className="text-slate-400 hover:text-[#2271b1]"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteSubject(s.id)}
                                                className="text-slate-400 hover:text-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
