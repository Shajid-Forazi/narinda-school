import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CLASSES, SECTIONS, SESSIONS, Student } from '../types';
import { Upload, Save, Loader2, RotateCcw, Printer } from 'lucide-react';

interface Props {
  onComplete: () => void;
  studentToEdit?: Student | null;
}

const INITIAL_STATE = {
  sl_no: '',
  name_bengali: '',
  name_english: '',
  father_name: '',
  father_occupation: '',
  mother_name: '',
  mother_occupation: '',
  present_address: '',
  present_phone: '',
  permanent_address: '',
  permanent_phone: '',
  dob_day: '',
  dob_month: '',
  dob_year: '',
  class: 'Play Group',
  section: 'A',
  shift: 'Day',
  previous_institute: '',
  previous_address: '',
  previous_class: '',
  session: '2025',
};

export default function AdmissionForm({ onComplete, studentToEdit }: Props) {
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [formData, setFormData] = useState(INITIAL_STATE);
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>('');
  const formRef = useRef<HTMLDivElement>(null);
  const currentYear = new Date().getFullYear();
  const sessionOptions = [
    (currentYear - 1).toString(),
    currentYear.toString(),
    (currentYear + 1).toString()
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (studentToEdit) {
      const [year, month, day] = (studentToEdit.date_of_birth || '--').split('-');
      setFormData({
        sl_no: studentToEdit.sl_no || '',
        name_bengali: studentToEdit.name_bengali || '',
        name_english: studentToEdit.name_english || '',
        father_name: studentToEdit.father_name || '',
        father_occupation: studentToEdit.father_occupation || '',
        mother_name: studentToEdit.mother_name || '',
        mother_occupation: studentToEdit.mother_occupation || '',
        present_address: studentToEdit.present_address || '',
        present_phone: studentToEdit.present_phone || '',
        permanent_address: studentToEdit.permanent_address || '',
        permanent_phone: studentToEdit.permanent_phone || '',
        dob_day: day || '',
        dob_month: month || '',
        dob_year: year || '',
        class: studentToEdit.class || 'Play Group',
        section: studentToEdit.section || 'A',
        shift: studentToEdit.shift || 'Day',
        previous_institute: studentToEdit.previous_institute || '',
        previous_address: studentToEdit.previous_address || '',
        previous_class: studentToEdit.previous_class || '',
        session: studentToEdit.session || '2025',
      });
    }
  }, [studentToEdit]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('settings')
      .select('school_logo_url')
      .eq('id', 'school_settings')
      .single();
    if (data) setSchoolLogoUrl(data.school_logo_url);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `school-logo-${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('settings')
        .upsert({ id: 'school_settings', school_logo_url: publicUrl, updated_at: new Date().toISOString() });

      if (updateError) throw updateError;

      setSchoolLogoUrl(publicUrl);
    } catch (error: any) {
      console.error('Logo upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(INITIAL_STATE);
    setPhoto(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let photo_url = studentToEdit?.photo_url || '';
      
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('student-photos')
          .upload(fileName, photo);

        if (uploadError) {
          if (uploadError.message.includes('Bucket not found')) {
            throw new Error('Storage bucket "student-photos" not found. Please create it in Supabase dashboard.');
          }
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('student-photos')
          .getPublicUrl(fileName);
        photo_url = publicUrl;
      }

      const day = parseInt(formData.dob_day);
      const month = parseInt(formData.dob_month);
      const year = parseInt(formData.dob_year);

      if (isNaN(day) || isNaN(month) || isNaN(year) || 
          day < 1 || day > 31 || 
          month < 1 || month > 12 || 
          year < 1900 || year > new Date().getFullYear()) {
        throw new Error('দয়া করে সঠিক জন্ম তারিখ লিখুন (Day: 1-31, Month: 1-12, Year: 1900-Current)');
      }

      const date_of_birth = `${year}-${formData.dob_month.padStart(2, '0')}-${formData.dob_day.padStart(2, '0')}`;
      
      const { dob_day, dob_month, dob_year, ...rest } = formData;
      const submissionData = {
        ...rest,
        date_of_birth,
        photo_url,
      };

      if (studentToEdit) {
        const { error } = await supabase
          .from('students')
          .update(submissionData)
          .eq('id', studentToEdit.id);
        if (error) throw error;
        alert('শিক্ষার্থীর তথ্য সফলভাবে আপডেট করা হয়েছে!');
      } else {
        const { error } = await supabase
          .from('students')
          .insert([submissionData]);
        if (error) throw error;
        alert('শিক্ষার্থী সফলভাবে ভর্তি করা হয়েছে!');
      }
      
      onComplete();
      if (!studentToEdit) handleReset();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'তথ্য সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Form Container */}
      <div 
        ref={formRef}
        className="w-[210mm] min-h-[297mm] print:w-full print:min-h-0 bg-[#fffdf0] p-[10mm] border border-black shadow-lg print:shadow-none print:m-0 print:border-none"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6 border-b-2 border-red-600 pb-4">
          <div className="w-20 h-20 bg-slate-100 border border-slate-300 flex items-center justify-center relative overflow-hidden group cursor-pointer">
            {schoolLogoUrl ? (
              <img src={schoolLogoUrl} alt="School Logo" className="w-full h-full object-contain" />
            ) : (
              <span className="text-[10px] text-slate-400">LOGO</span>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden">
              <Upload size={16} className="text-white" />
            </div>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload}
              className="absolute inset-0 opacity-0 cursor-pointer print:hidden"
            />
          </div>
          <div className="flex-1 text-center px-4">
            <h1 className="text-3xl font-black text-red-600 mb-2 leading-none">NARINDA IDEAL SCHOOL & COLLEGE</h1>
            <div className="grid grid-cols-3 gap-2 text-[8px] leading-tight text-slate-700">
              <div className="text-left border-r border-slate-300 pr-2">
                <p className="font-bold">Narinda Branch</p>
                <p>75/2, Sharat Gupta Road</p>
                <p>Narinda, Dhaka-1100</p>
                <p>Phone: 02 223359219</p>
              </div>
              <div className="text-center border-r border-slate-300 px-2">
                <p className="font-bold">Agamasi Lane Branch</p>
                <p>74/1, Agamasi Lane</p>
                <p>Bongshal, Dhaka</p>
                <p>Phone: 02 223359219</p>
                <p>Mob: 01980-800691</p>
              </div>
              <div className="text-right pl-2">
                <p className="font-bold">Tikatuli Branch</p>
                <p>13-A/2-Ka/1 K.M. Das Lane</p>
                <p>Tikatuli, Dhaka-1203</p>
                <p>Phone: 01727-409782</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sub Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">SL.NO</span>
            <input 
              type="text" 
              value={formData.sl_no}
              onChange={(e) => setFormData({...formData, sl_no: e.target.value})}
              className="w-20 border border-black bg-transparent px-2 py-1 text-sm outline-none"
            />
          </div>
          <div className="border-2 border-green-600 rounded-full px-8 py-1">
            <h2 className="text-xl font-black text-green-600">ADMISSION FORM</h2>
          </div>
          <div className="w-24 h-28 border border-black flex flex-col items-center justify-center relative overflow-hidden bg-white">
            {photo ? (
              <img src={URL.createObjectURL(photo)} alt="Preview" className="w-full h-full object-cover" />
            ) : studentToEdit?.photo_url ? (
              <img src={studentToEdit.photo_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-2">
                <p className="text-[10px] font-bold">PHOTO</p>
                <p className="text-[8px]">PP Size</p>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => setPhoto(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer print:hidden"
            />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4 text-sm">
          {/* 1. Name */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">1. Name of the student:</span>
            </div>
            <div className="pl-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-24">a) In Bengali:</span>
                <input 
                  type="text" 
                  value={formData.name_bengali}
                  onChange={(e) => setFormData({...formData, name_bengali: e.target.value})}
                  className="flex-1 border-b border-black bg-transparent outline-none px-2"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="w-24">b) In English:</span>
                <input 
                  type="text" 
                  value={formData.name_english}
                  onChange={(e) => setFormData({...formData, name_english: e.target.value})}
                  className="flex-1 border-b border-black bg-transparent outline-none px-2 uppercase"
                />
              </div>
            </div>
          </div>

          {/* 2. Father's Name */}
          <div className="flex items-center gap-2">
            <span className="font-bold">2. Father's Name:</span>
            <input 
              type="text" 
              value={formData.father_name}
              onChange={(e) => setFormData({...formData, father_name: e.target.value})}
              className="flex-1 border-b border-black bg-transparent outline-none px-2"
            />
            <span className="font-bold ml-4">Occupation:</span>
            <input 
              type="text" 
              value={formData.father_occupation}
              onChange={(e) => setFormData({...formData, father_occupation: e.target.value})}
              className="w-40 border-b border-black bg-transparent outline-none px-2"
            />
          </div>

          {/* 3. Mother's Name */}
          <div className="flex items-center gap-2">
            <span className="font-bold">3. Mother's Name:</span>
            <input 
              type="text" 
              value={formData.mother_name}
              onChange={(e) => setFormData({...formData, mother_name: e.target.value})}
              className="flex-1 border-b border-black bg-transparent outline-none px-2"
            />
            <span className="font-bold ml-4">Occupation:</span>
            <input 
              type="text" 
              value={formData.mother_occupation}
              onChange={(e) => setFormData({...formData, mother_occupation: e.target.value})}
              className="w-40 border-b border-black bg-transparent outline-none px-2"
            />
          </div>

          {/* 4. Address */}
          <div className="space-y-2">
            <span className="font-bold">4. Address:</span>
            <div className="pl-4 space-y-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-24">a) Present:</span>
                  <input 
                    type="text" 
                    value={formData.present_address}
                    onChange={(e) => setFormData({...formData, present_address: e.target.value})}
                    className="flex-1 border-b border-black bg-transparent outline-none px-2"
                  />
                </div>
                <div className="flex items-center gap-2 pl-24">
                  <span className="font-bold ml-auto">Phone:</span>
                  <input 
                    type="text" 
                    value={formData.present_phone}
                    onChange={(e) => setFormData({...formData, present_phone: e.target.value})}
                    className="w-48 border-b border-black bg-transparent outline-none px-2"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-24">b) Permanent:</span>
                  <input 
                    type="text" 
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({...formData, permanent_address: e.target.value})}
                    className="flex-1 border-b border-black bg-transparent outline-none px-2"
                  />
                </div>
                <div className="flex items-center gap-2 pl-24">
                  <span className="font-bold ml-auto">Phone:</span>
                  <input 
                    type="text" 
                    value={formData.permanent_phone}
                    onChange={(e) => setFormData({...formData, permanent_phone: e.target.value})}
                    className="w-48 border-b border-black bg-transparent outline-none px-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 5. Date of Birth */}
          <div className="flex items-center gap-2">
            <span className="font-bold">5. Date of Birth:</span>
            <div className="flex items-center gap-1">
              <input 
                type="number" 
                min="1"
                max="31"
                placeholder="DD"
                value={formData.dob_day}
                onChange={(e) => setFormData({...formData, dob_day: e.target.value.slice(0, 2)})}
                className="w-12 border border-black bg-transparent text-center outline-none"
              />
              <span>/</span>
              <input 
                type="number" 
                min="1"
                max="12"
                placeholder="MM"
                value={formData.dob_month}
                onChange={(e) => setFormData({...formData, dob_month: e.target.value.slice(0, 2)})}
                className="w-12 border border-black bg-transparent text-center outline-none"
              />
              <span>/</span>
              <input 
                type="number" 
                min="1900"
                max={new Date().getFullYear()}
                placeholder="YYYY"
                value={formData.dob_year}
                onChange={(e) => setFormData({...formData, dob_year: e.target.value.slice(0, 4)})}
                className="w-20 border border-black bg-transparent text-center outline-none"
              />
            </div>
          </div>

          {/* 6. Class, Section, Shift */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">6. The class which you intend to admit:</span>
              <select 
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: e.target.value})}
                className="border-b border-black bg-transparent outline-none px-2"
              >
                {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Section:</span>
              <input 
                list="sections"
                value={formData.section}
                onChange={(e) => setFormData({...formData, section: e.target.value})}
                className="border-b border-black bg-transparent outline-none px-2 w-24"
              />
              <datalist id="sections">
                {SECTIONS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold">Session:</span>
              <input 
                list="sessions"
                value={formData.session}
                onChange={(e) => setFormData({...formData, session: e.target.value})}
                className="border-b border-black bg-transparent outline-none px-2 w-24"
              />
              <datalist id="sessions">
                {sessionOptions.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          {/* 7. Previous Institute */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-bold">7. The name of the Institute where you have studied before:</span>
              <input 
                type="text" 
                value={formData.previous_institute}
                onChange={(e) => setFormData({...formData, previous_institute: e.target.value})}
                className="flex-1 border-b border-black bg-transparent outline-none px-2"
              />
            </div>
            <div className="flex items-center gap-2 pl-4">
              <span className="font-bold">Address:</span>
              <input 
                type="text" 
                value={formData.previous_address}
                onChange={(e) => setFormData({...formData, previous_address: e.target.value})}
                className="flex-1 border-b border-black bg-transparent outline-none px-2"
              />
              <span className="font-bold ml-4">Class:</span>
              <input 
                type="text" 
                value={formData.previous_class}
                onChange={(e) => setFormData({...formData, previous_class: e.target.value})}
                className="w-32 border-b border-black bg-transparent outline-none px-2"
              />
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 space-y-8">
          <div className="bg-[#fff9c4] p-4 border border-black italic text-xs leading-relaxed">
            "This is to certify and declare that the above information is completely true. 
            If it gets a claim to admit in to this school, I will be very obedient and 
            strictly abide by the rules and regulation of the school."
          </div>

          <div className="grid grid-cols-3 gap-8 pt-12">
            <div className="text-center">
              <div className="border-t border-black pt-1 font-bold text-[10px]">Principal's signature</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1 font-bold text-[10px]">Guardian's signature</div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1 font-bold text-[10px]">Student's signature</div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap justify-center gap-4 print:hidden mb-20 mt-4 p-6 bg-white rounded-xl border border-slate-200 shadow-sm w-full max-w-[210mm]">
        <button 
          disabled={loading}
          onClick={handleSubmit}
          className="wp-button flex items-center gap-2 px-8"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          {loading ? 'Saving...' : studentToEdit ? 'Update Student' : 'Save Student'}
        </button>
        <button 
          onClick={handlePrint}
          className="wp-button bg-green-600 hover:bg-green-700 flex items-center gap-2 px-6"
        >
          <Printer size={18} /> Print Form
        </button>
        <button 
          onClick={handleReset}
          className="wp-button bg-white text-slate-700 border border-[#c3c4c7] hover:bg-slate-50 flex items-center gap-2 px-6"
        >
          <RotateCcw size={18} /> Reset
        </button>
      </div>
    </div>
  );
}
