import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, CLASSES, SECTIONS, SESSIONS } from '../types';
import { Search, Edit2, Trash2, User, Eye, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { toBengaliNumber } from '../utils';

interface Props {
  onEdit: (student: Student) => void;
}

export default function StudentList({ onEdit }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    class: '',
    section: '',
    session: '',
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const pageSize = 20;

  const fetchStudents = async (term: string = searchTerm) => {
    setLoading(true);
    let query = supabase
      .from('students')
      .select('id, name_bengali, name_english, class, section, sl_no, shift, present_phone, photo_url', { count: 'exact' });
    
    if (term) {
      query = query.or(`name_bengali.ilike.%${term}%,name_english.ilike.%${term}%,sl_no.eq.${term}`);
    }
    if (filters.class) query = query.eq('class', filters.class);
    if (filters.section) query = query.eq('section', filters.section);
    if (filters.session) query = query.eq('session', filters.session);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('sl_no', { ascending: true })
      .range(from, to);

    if (!error && data) {
      // Cast data to Student[] as we know it contains the necessary fields for the list
      setStudents(data as unknown as Student[]);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents(searchTerm);
  }, [filters, page, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই শিক্ষার্থীর তথ্য মুছে ফেলতে চান?')) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) fetchStudents(searchTerm);
  };

  const handleViewProfile = async (id: string) => {
    const { data } = await supabase.from('students').select('*').eq('id', id).single();
    if (data) setSelectedStudent(data);
  };

  const handleEditClick = async (id: string) => {
    const { data } = await supabase.from('students').select('*').eq('id', id).single();
    if (data) onEdit(data);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-6">
      {/* Filters & Search */}
      <div className="wp-card p-4 rounded flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px] space-y-1">
          <label className="text-xs font-bold text-slate-500">নাম দিয়ে খুঁজুন (Search Name)</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="নাম লিখুন..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="wp-input text-sm py-1 pl-8 w-full"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">শ্রেণী (Class)</label>
          <select 
            value={filters.class}
            onChange={(e) => { setFilters({...filters, class: e.target.value}); setPage(1); }}
            className="wp-input text-sm py-1"
          >
            <option value="">সব শ্রেণী</option>
            {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">শাখা (Section)</label>
          <select 
            value={filters.section}
            onChange={(e) => { setFilters({...filters, section: e.target.value}); setPage(1); }}
            className="wp-input text-sm py-1"
          >
            <option value="">সব শাখা</option>
            {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500">সেশন (Session)</label>
          <select 
            value={filters.session}
            onChange={(e) => { setFilters({...filters, session: e.target.value}); setPage(1); }}
            className="wp-input text-sm py-1"
          >
            <option value="">সব সেশন</option>
            {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Student Table */}
      <div className="wp-card rounded overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f6f7f7] border-b border-[#c3c4c7]">
              <th className="p-3 text-sm font-bold w-12">SL.NO</th>
              <th className="p-3 text-sm font-bold w-16">Photo</th>
              <th className="p-3 text-sm font-bold">Student Name</th>
              <th className="p-3 text-sm font-bold">Class</th>
              <th className="p-3 text-sm font-bold">Section</th>
              <th className="p-3 text-sm font-bold">Shift</th>
              <th className="p-3 text-sm font-bold">Phone</th>
              <th className="p-3 text-sm font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#c3c4c7]">
            {loading ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">লোড হচ্ছে...</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">কোনো শিক্ষার্থী পাওয়া যায়নি।</td>
              </tr>
            ) : (
              students.map((student, index) => (
                <tr key={student.id} className="hover:bg-[#f6f7f7]">
                  <td className="p-3 text-sm text-slate-500">
                    {toBengaliNumber(student.sl_no)}
                  </td>
                  <td className="p-3">
                    <div className="w-10 h-10 bg-slate-100 rounded border border-[#c3c4c7] overflow-hidden">
                      {student.photo_url ? (
                        <img src={student.photo_url} alt={student.name_bengali} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <User size={20} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-sm text-[#1e40af]">{student.name_bengali}</div>
                    <div className="text-[10px] text-slate-400 uppercase">{student.name_english}</div>
                  </td>
                  <td className="p-3 text-sm">{student.class}</td>
                  <td className="p-3 text-sm">{student.section}</td>
                  <td className="p-3 text-sm">{student.shift}</td>
                  <td className="p-3 text-sm">{toBengaliNumber(student.present_phone)}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleViewProfile(student.id)}
                        className="text-slate-400 hover:text-[#2271b1] p-1"
                        title="View Profile"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleEditClick(student.id)}
                        className="text-slate-400 hover:text-[#2271b1] p-1"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(student.id)}
                        className="text-slate-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 bg-[#f6f7f7] border-t border-[#c3c4c7] flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {toBengaliNumber(totalCount)} জন শিক্ষার্থীর মধ্যে {toBengaliNumber((page - 1) * pageSize + 1)} থেকে {toBengaliNumber(Math.min(page * pageSize, totalCount))} দেখাচ্ছে
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="wp-button py-1 px-2 disabled:opacity-50"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-bold">
                পৃষ্ঠা {toBengaliNumber(page)} (মোট {toBengaliNumber(totalPages)})
              </span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
                className="wp-button py-1 px-2 disabled:opacity-50"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto relative">
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={24} />
            </button>
            
            <div className="p-8">
              <div className="flex gap-8 mb-8 pb-8 border-b border-slate-100">
                <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden shrink-0">
                  {selectedStudent.photo_url ? (
                    <img src={selectedStudent.photo_url} alt={selectedStudent.name_bengali} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                      <User size={48} />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#1d2327] mb-1">{selectedStudent.name_bengali}</h2>
                  <p className="text-sm text-slate-500 uppercase font-medium">{selectedStudent.name_english}</p>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <span className="px-2 py-1 bg-[#f0f6fb] text-[#1e40af] text-xs font-bold rounded">Class: {selectedStudent.class}</span>
                    <span className="px-2 py-1 bg-[#f0f6fb] text-[#1e40af] text-xs font-bold rounded">Section: {selectedStudent.section}</span>
                    <span className="px-2 py-1 bg-[#f0f6fb] text-[#1e40af] text-xs font-bold rounded">SL.NO: {toBengaliNumber(selectedStudent.sl_no)}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <ProfileItem label="পিতার নাম (Father's Name)" value={selectedStudent.father_name} />
                <ProfileItem label="পিতার পেশা (Occupation)" value={selectedStudent.father_occupation} />
                <ProfileItem label="মাতার নাম (Mother's Name)" value={selectedStudent.mother_name} />
                <ProfileItem label="মাতার পেশা (Occupation)" value={selectedStudent.mother_occupation} />
                <ProfileItem label="জন্ম তারিখ (Date of Birth)" value={selectedStudent.date_of_birth} />
                <ProfileItem label="বর্তমান ফোন (Present Phone)" value={toBengaliNumber(selectedStudent.present_phone)} />
                <ProfileItem label="স্থায়ী ফোন (Permanent Phone)" value={toBengaliNumber(selectedStudent.permanent_phone)} />
                <ProfileItem label="শিফট (Shift)" value={selectedStudent.shift} />
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">সেশন (Session)</p>
                  <p className="text-sm font-medium text-[#1d2327]">{toBengaliNumber(selectedStudent.session)}</p>
                </div>
                <div className="md:col-span-2">
                  <ProfileItem label="বর্তমান ঠিকানা (Present Address)" value={selectedStudent.present_address} />
                </div>
                <div className="md:col-span-2">
                  <ProfileItem label="স্থায়ী ঠিকানা (Permanent Address)" value={selectedStudent.permanent_address} />
                </div>
                <div className="md:col-span-2 border-t pt-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Previous Institute Info</h4>
                  <ProfileItem label="Institute Name" value={selectedStudent.previous_institute} />
                  <ProfileItem label="Address" value={selectedStudent.previous_address} />
                  <ProfileItem label="Class" value={selectedStudent.previous_class} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-[#1d2327]">{value || 'N/A'}</p>
    </div>
  );
}
