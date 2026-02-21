import React, { useState, useEffect } from 'react';
import { Student, ResultCard } from '../types';
import { toBengaliNumber } from '../utils';
import { SUBJECTS } from '../constants';
import { supabase } from '../lib/supabase';
import { Upload } from 'lucide-react';

interface Props {
  student: Student;
  allMarks: ResultCard[];
  examType: string;
  session: string;
}

export default function ResultCardPrint({ student, allMarks, examType, session }: Props) {
  const [schoolLogoUrl, setSchoolLogoUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

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

  // Helper to get marks for a specific exam type and subject
  const getMark = (exam: string, subject: string) => {
    return allMarks.find(m => m.exam_type === exam && m.subject === subject);
  };

  const getExamTotalGP = (exam: string) => {
    const examMarks = allMarks.filter(m => m.exam_type === exam);
    return examMarks.reduce((acc, m) => acc + (m.grade_point || 0), 0).toFixed(2);
  };

  const getExamGPA = (exam: string) => {
    const examMarks = allMarks.filter(m => m.exam_type === exam);
    if (examMarks.length === 0) return '0.00';
    const totalGP = examMarks.reduce((acc, m) => acc + (m.grade_point || 0), 0);
    return (totalGP / SUBJECTS.length).toFixed(2);
  };

  const getExamTotal = (exam: string) => {
    const examMarks = allMarks.filter(m => m.exam_type === exam);
    return examMarks.reduce((acc, m) => acc + (m.total_marks || 0), 0);
  };
  return (
    <div className="bg-white p-0 font-serif text-[#1d2327]">
      {/* FRONT COVER */}
      <div className="min-h-[1123px] w-[794px] mx-auto border-[12px] border-double border-blue-900 p-8 flex flex-col items-center relative page-break-after-always">
        <div className="italic text-sm mb-4">Bismillahir Rahmanir Rahim</div>
        
        <div className="w-24 h-24 mb-4 border border-slate-200 flex items-center justify-center relative overflow-hidden group cursor-pointer">
          {schoolLogoUrl ? (
            <img src={schoolLogoUrl} alt="Logo" className="w-20 h-20 object-contain" />
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

        <h1 className="text-5xl font-bold text-blue-900 mb-2 tracking-tight uppercase">NARINDA IDEAL SCHOOL</h1>
        
        <div className="text-center space-y-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold border-b-2 border-blue-900 inline-block px-4 mb-1">Narinda Branch</h2>
            <p className="text-sm font-bold">75/2, Sharat Gupta Road</p>
            <p className="text-sm font-bold">Narinda, Dhaka-1100</p>
            <p className="text-sm font-bold">Phone: 02-223359219, 01980-800691</p>
          </div>

          <div className="flex justify-center gap-12">
            <div className="text-center border-r-2 border-blue-900 pr-12">
              <h3 className="text-lg font-bold border-b border-blue-900 inline-block px-2 mb-1">Agamasi Lane Branch</h3>
              <p className="text-xs font-bold">74/1, Agamasi Lane,</p>
              <p className="text-xs font-bold">Kotoali, Dhaka</p>
              <p className="text-xs font-bold">Phone: 02-223359219</p>
              <p className="text-xs font-bold">01727409782</p>
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold border-b border-blue-900 inline-block px-2 mb-1">Tikatuli Branch</h3>
              <p className="text-xs font-bold">13-A/2-Ka/1 K.M. Das Lane</p>
              <p className="text-xs font-bold">Tikatuli, Dhaka-1203</p>
              <p className="text-xs font-bold">Phone: 01727-409782</p>
              <p className="text-xs font-bold">01836-446222</p>
            </div>
          </div>
        </div>

        <h2 className="text-4xl font-bold mb-4">Progress Report</h2>
        
        <div className="border-2 border-blue-900 rounded-full px-12 py-2 text-2xl font-bold mb-12">
          Session-{session}
        </div>

        <div className="w-full max-w-md space-y-6 text-left border-2 border-blue-900 p-10 relative">
          {/* Decorative corners */}
          <div className="absolute -top-2 -left-2 w-8 h-8 border-t-4 border-l-4 border-blue-900"></div>
          <div className="absolute -top-2 -right-2 w-8 h-8 border-t-4 border-r-4 border-blue-900"></div>
          <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-4 border-l-4 border-blue-900"></div>
          <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-4 border-r-4 border-blue-900"></div>

          <div className="flex items-end gap-2">
            <span className="font-bold text-xl shrink-0">NAME:</span>
            <span className="flex-1 border-b border-dotted border-black text-2xl italic font-serif px-2">{student.name_bengali}</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-bold text-xl shrink-0">CLASS:</span>
            <span className="flex-1 border-b border-dotted border-black text-2xl italic font-serif px-2">{student.class}</span>
            <span className="font-bold text-xl shrink-0 ml-4">SECTION:</span>
            <span className="flex-1 border-b border-dotted border-black text-2xl italic font-serif px-2">{student.section}</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="font-bold text-xl shrink-0">Shift:</span>
            <span className="flex-1 border-b border-dotted border-black text-2xl italic font-serif px-2">{student.shift}</span>
            <span className="font-bold text-xl shrink-0 ml-4">ROLL:</span>
            <span className="flex-1 border-b border-dotted border-black text-2xl italic font-serif px-2">{toBengaliNumber(student.sl_no)}</span>
          </div>
        </div>
      </div>

      {/* BACK COVER */}
      <div className="min-h-[1123px] w-[794px] mx-auto border-[12px] border-double border-blue-900 p-12 flex flex-col page-break-after-always">
        <div className="flex-1">
          <div className="flex justify-center mb-12">
            <div className="border-2 border-blue-900 rounded-full px-8 py-2 text-xl font-bold">
              Important Information
            </div>
          </div>
          
          <ul className="space-y-6 text-lg italic">
            <li className="flex gap-4">
              <span className="text-xl">★</span>
              <span>This Progress Report shall be signed by the guardians and returned to the Class Teacher within five days of receiving it.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-xl">★</span>
              <span>A fine of Tk. 100/- (One Hundred Taka) must be paid by the students who lose their Progress Reports or do not return them on time.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-xl">★</span>
              <span>Students have to pass in all subjects as well as in average for promotion. No request for promotion will be entertained after the publication of the results.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-xl">★</span>
              <span>Guardians must see to their children's performance from the beginning of the year.</span>
            </li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-20">
          <div className="border-t-2 border-blue-900 pt-2 text-center font-bold">Class Teacher's Comments</div>
          <div className="border-t-2 border-blue-900 pt-2 text-center font-bold">Guardian's Remarks</div>
        </div>
      </div>

      {/* INNER MARK SHEET */}
      <div className="min-h-[1123px] w-[794px] mx-auto p-4 flex flex-col page-break-before">
        <div className="flex justify-between items-center mb-2 px-4">
          <div className="flex items-center gap-2">
            {schoolLogoUrl && <img src={schoolLogoUrl} alt="Logo" className="w-8 h-8" />}
            <h2 className="text-xl font-bold text-blue-900 uppercase">Narinda Ideal School</h2>
          </div>
          <div className="flex items-center gap-2">
            {schoolLogoUrl && <img src={schoolLogoUrl} alt="Logo" className="w-8 h-8" />}
            <h2 className="text-xl font-bold text-blue-900 uppercase">Narinda Ideal School</h2>
          </div>
        </div>

        <div className="flex gap-2 flex-1">
          {/* Main Table Section */}
          <div className="flex-[3] flex flex-col">
            <table className="w-full border-collapse border border-black text-[8px]">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-black p-0.5 w-16">Subject</th>
                  <th rowSpan={2} className="border border-black p-0.5 w-8">Total</th>
                  <th colSpan={5} className="border border-black p-0.5">First terminal examination-{session}</th>
                  <th colSpan={5} className="border border-black p-0.5">Second terminal examination</th>
                  <th colSpan={5} className="border border-black p-0.5">Annual examination</th>
                </tr>
                <tr>
                  {/* Exam 1 */}
                  <th className="border border-black p-0.5 w-6">Tut.</th>
                  <th className="border border-black p-0.5 w-6">Sub/Obj</th>
                  <th className="border border-black p-0.5 w-8">Total</th>
                  <th className="border border-black p-0.5 w-6">G</th>
                  <th className="border border-black p-0.5 w-6">GP</th>
                  {/* Exam 2 */}
                  <th className="border border-black p-0.5 w-6">Tut.</th>
                  <th className="border border-black p-0.5 w-6">Sub/Obj</th>
                  <th className="border border-black p-0.5 w-8">Total</th>
                  <th className="border border-black p-0.5 w-6">G</th>
                  <th className="border border-black p-0.5 w-6">GP</th>
                  {/* Exam 3 */}
                  <th className="border border-black p-0.5 w-6">Tut.</th>
                  <th className="border border-black p-0.5 w-6">Sub/Obj</th>
                  <th className="border border-black p-0.5 w-8">Total</th>
                  <th className="border border-black p-0.5 w-6">G</th>
                  <th className="border border-black p-0.5 w-6">GP</th>
                </tr>
              </thead>
              <tbody>
                {SUBJECTS.map((s) => {
                  const m1 = getMark('First Terminal', s.name);
                  const m2 = getMark('Second Terminal', s.name);
                  const m3 = getMark('Annual', s.name);
                  
                  return (
                    <tr key={s.name}>
                      <td className="border border-black p-0.5 font-bold truncate max-w-[80px]">{s.name}</td>
                      <td className="border border-black p-0.5 text-center">{s.total}</td>
                      {/* Exam 1 Data */}
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber(m1?.tutorial_marks || '')}</td>
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber((m1?.sub_marks || 0) + (m1?.obj_marks || 0) || '')}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{toBengaliNumber(m1?.total_marks || '')}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{m1?.grade || ''}</td>
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber(m1?.grade_point?.toFixed(2) || '')}</td>
                      {/* Exam 2 Data */}
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber(m2?.tutorial_marks || '')}</td>
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber((m2?.sub_marks || 0) + (m2?.obj_marks || 0) || '')}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{toBengaliNumber(m2?.total_marks || '')}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{m2?.grade || ''}</td>
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber(m2?.grade_point?.toFixed(2) || '')}</td>
                      {/* Exam 3 Data */}
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber(m3?.tutorial_marks || '')}</td>
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber((m3?.sub_marks || 0) + (m3?.obj_marks || 0) || '')}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{toBengaliNumber(m3?.total_marks || '')}</td>
                      <td className="border border-black p-0.5 text-center font-bold">{m3?.grade || ''}</td>
                      <td className="border border-black p-0.5 text-center">{toBengaliNumber(m3?.grade_point?.toFixed(2) || '')}</td>
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="border border-black p-1">Total Marks</td>
                  <td className="border border-black p-1"></td>
                  {/* Exam 1 Totals */}
                  <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-center">{toBengaliNumber(getExamTotal('First Terminal') || '')}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-center">{toBengaliNumber(getExamTotalGP('First Terminal') || '')}</td>
                  {/* Exam 2 Totals */}
                  <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-center">{toBengaliNumber(getExamTotal('Second Terminal') || '')}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-center">{toBengaliNumber(getExamTotalGP('Second Terminal') || '')}</td>
                  {/* Exam 3 Totals */}
                  <td className="border border-black p-1"></td><td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-center">{toBengaliNumber(getExamTotal('Annual') || '')}</td>
                  <td className="border border-black p-1"></td>
                  <td className="border border-black p-1 text-center">{toBengaliNumber(getExamTotalGP('Annual') || '')}</td>
                </tr>
              </tbody>
            </table>

            {/* Bottom Info Section */}
            <div className="grid grid-cols-3 border-x-2 border-b-2 border-black text-[10px]">
              <div className="border-r border-black p-2 space-y-1">
                <div className="flex justify-between"><span>Total Students Number:</span><span className="border-b border-black w-12"></span></div>
                <div className="flex justify-between"><span>Total Class:</span><span className="border-b border-black w-12"></span></div>
                <div className="flex justify-between"><span>Attendants:</span><span className="border-b border-black w-12"></span></div>
                <div className="flex justify-between font-bold"><span>Grade Point Average (GPA)</span><span className="border-b border-black w-12 text-center">{toBengaliNumber(getExamGPA(examType) || '')}</span></div>
              </div>
              <div className="border-r border-black p-2"></div>
              <div className="p-2"></div>
            </div>

            {/* Signatures Section */}
            <div className="grid grid-cols-3 border-x-2 border-b-2 border-black h-24">
              <div className="border-r border-black relative flex flex-col justify-end p-2">
                <div className="text-center border-t border-black text-[10px]">Principal</div>
                <div className="absolute top-2 left-2 text-[8px] font-bold">First terminal examination</div>
              </div>
              <div className="border-r border-black relative flex flex-col justify-end p-2">
                <div className="text-center border-t border-black text-[10px]">Guardian</div>
                <div className="absolute top-2 left-2 text-[8px] font-bold">Second terminal examination</div>
              </div>
              <div className="relative flex flex-col justify-end p-2">
                <div className="text-center border-t border-black text-[10px]">Principal's Signature</div>
                <div className="absolute top-2 left-2 text-[8px] font-bold">Annual examination</div>
                <div className="absolute bottom-10 right-4 text-xl font-bold italic">Place : <span className="border-b border-black px-4"></span></div>
              </div>
            </div>
          </div>

          {/* Right Panel Section */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Excellent Stamps */}
            <div className="border-2 border-black p-2 flex flex-col items-center justify-center relative min-h-[100px]">
              <div className="absolute top-1 left-1 text-[8px] font-bold">First terminal examination</div>
              <div className="text-4xl font-black text-blue-900/20 rotate-[-15deg] border-4 border-blue-900/20 px-4 py-1 rounded-xl"></div>
              <div className="mt-auto w-full border-t border-black text-[8px] text-center pt-1">Class Teacher's Signature & Comments</div>
            </div>
            <div className="border-2 border-black p-2 flex flex-col items-center justify-center relative min-h-[100px]">
              <div className="absolute top-1 left-1 text-[8px] font-bold">Second terminal examination</div>
              <div className="text-4xl font-black text-blue-900/20 rotate-[-15deg] border-4 border-blue-900/20 px-4 py-1 rounded-xl"></div>
              <div className="mt-auto w-full border-t border-black text-[8px] text-center pt-1">Class Teacher's Signature & Comments</div>
            </div>
            <div className="border-2 border-black p-2 flex flex-col items-center justify-center relative min-h-[100px]">
              <div className="absolute top-1 left-1 text-[8px] font-bold">Annual examination</div>
              <div className="text-4xl font-black text-blue-900/20 rotate-[-15deg] border-4 border-blue-900/20 px-4 py-1 rounded-xl"></div>
              <div className="mt-auto w-full border-t border-black text-[8px] text-center pt-1">Class Teacher's Signature & Comments</div>
            </div>

            {/* Grading Index */}
            <div className="border-2 border-black p-2">
              <h4 className="text-center font-bold text-xs mb-1">Letter Grading Index</h4>
              <div className="bg-blue-900 text-white text-center text-[10px] font-bold py-0.5 mb-1">Play Group- Class Four</div>
              <table className="w-full border-collapse border border-black text-[8px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black">Marks</th>
                    <th className="border border-black">Grade</th>
                    <th className="border border-black">Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-black text-center">95% - 100%</td><td className="border border-black text-center font-bold">A++</td><td className="border border-black text-center">5.00</td></tr>
                  <tr><td className="border border-black text-center">80%-94%</td><td className="border border-black text-center font-bold">A+</td><td className="border border-black text-center">4.50</td></tr>
                  <tr><td className="border border-black text-center">70%-79%</td><td className="border border-black text-center font-bold">A</td><td className="border border-black text-center">4.00</td></tr>
                  <tr><td className="border border-black text-center">60%-69%</td><td className="border border-black text-center font-bold">B+</td><td className="border border-black text-center">3.50</td></tr>
                  <tr><td className="border border-black text-center">50%-59%</td><td className="border border-black text-center font-bold">B</td><td className="border border-black text-center">3.00</td></tr>
                  <tr><td className="border border-black text-center">40%-49%</td><td className="border border-black text-center font-bold">C</td><td className="border border-black text-center">2.00</td></tr>
                  <tr><td className="border border-black text-center">33-39%</td><td className="border border-black text-center font-bold">D</td><td className="border border-black text-center">1.00</td></tr>
                  <tr><td className="border border-black text-center">00 - 32%</td><td className="border border-black text-center font-bold">F</td><td className="border border-black text-center">0.00</td></tr>
                </tbody>
              </table>

              <div className="bg-blue-900 text-white text-center text-[10px] font-bold py-0.5 my-1">Class Five -Ten</div>
              <table className="w-full border-collapse border border-black text-[8px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-black">Marks</th>
                    <th className="border border-black">Grade</th>
                    <th className="border border-black">Grade Point</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td className="border border-black text-center">80% - 100%</td><td className="border border-black text-center font-bold">A+</td><td className="border border-black text-center">5.00</td></tr>
                  <tr><td className="border border-black text-center">70% - 79%</td><td className="border border-black text-center font-bold">A</td><td className="border border-black text-center">4.00</td></tr>
                  <tr><td className="border border-black text-center">60% - 69%</td><td className="border border-black text-center font-bold">A-</td><td className="border border-black text-center">3.50</td></tr>
                  <tr><td className="border border-black text-center">50% - 59%</td><td className="border border-black text-center font-bold">B</td><td className="border border-black text-center">3.00</td></tr>
                  <tr><td className="border border-black text-center">40% - 49%</td><td className="border border-black text-center font-bold">C</td><td className="border border-black text-center">2.00</td></tr>
                  <tr><td className="border border-black text-center">33% - 39%</td><td className="border border-black text-center font-bold">D</td><td className="border border-black text-center">1.00</td></tr>
                  <tr><td className="border border-black text-center">00 - 32%</td><td className="border border-black text-center font-bold">F</td><td className="border border-black text-center">0.00</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
