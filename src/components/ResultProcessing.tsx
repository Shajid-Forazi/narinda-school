import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { Student, ResultCard, CLASSES } from '../types';
import { SUBJECTS, EXAM_NAMES } from '../constants';
import { Search, Save, Printer, Loader2, ChevronRight, FileText, X } from 'lucide-react';
import { toBengaliNumber, calculateGrade } from '../utils';
import ResultCardPrint from './ResultCardPrint';

// UI Components
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/src/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
import { Badge } from "@/src/components/ui/badge";

import { toast } from "sonner";

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

    if (error) toast.error('Error saving marks');
    else {
      toast.success('Marks saved successfully!');
      fetchMarks(selectedStudent.id); // Refresh all marks
    }
    setSaving(false);
  };

  if (showPrint && selectedStudent) {
    return (
      <div className="bg-white min-h-screen">
        <div className="p-4 border-b flex justify-between items-center print:hidden">
          <Button variant="ghost" onClick={() => setShowPrint(false)}>
            ← Back to Editor
          </Button>
          <Button onClick={() => window.print()} className="flex items-center gap-2">
            <Printer className="h-4 w-4" /> Print Result Card
          </Button>
        </div>
        <ResultCardPrint student={selectedStudent} allMarks={allMarks} examType={examType} session={session} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Select Student
          </CardTitle>
          <CardDescription>Search for a student to enter or view marks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by Name or Roll..." 
              onChange={(e) => fetchStudents(e.target.value)}
              className="pl-10"
            />
          </div>

          {students.length > 0 && !selectedStudent && (
            <div className="border rounded-md divide-y overflow-hidden">
              {students.map(s => (
                <button 
                  key={s.id}
                  onClick={() => setSelectedStudent(s)}
                  className="w-full p-3 text-left hover:bg-muted/50 flex items-center justify-between group transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{s.name_bengali}</span>
                    <span className="text-[10px] text-muted-foreground uppercase">Class {s.class} | SL.NO {toBengaliNumber(s.sl_no)}</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          )}

          {selectedStudent && (
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
                  {toBengaliNumber(selectedStudent.sl_no)}
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-base text-primary">{selectedStudent.name_bengali}</span>
                  <span className="text-xs text-muted-foreground">Class {selectedStudent.class} | {selectedStudent.session} Session</span>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)} className="text-primary hover:text-primary hover:bg-primary/10">
                <X className="h-4 w-4 mr-1" /> Change
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-muted/30 border-b py-4 flex flex-row items-center justify-between space-y-0">
            <div className="flex gap-4">
              <Select value={examType} onValueChange={setExamType}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="Exam Type" />
                </SelectTrigger>
                <SelectContent>
                  {EXAM_NAMES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={session} onValueChange={setSession}>
                <SelectTrigger className="w-[100px] h-9">
                  <SelectValue placeholder="Session" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPrint(true)}>
                <FileText className="h-4 w-4 mr-2" /> Preview
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Marks
              </Button>
            </div>
          </CardHeader>

          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Subject</TableHead>
                <TableHead className="text-center">Tutorial</TableHead>
                <TableHead className="text-center">Sub/Obj</TableHead>
                <TableHead className="text-center bg-muted/80">Total</TableHead>
                <TableHead className="text-center">Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {marks.map((mark, idx) => (
                <TableRow key={mark.subject} className="hover:bg-muted/30">
                  <TableCell className="py-3">
                    <div className="flex flex-col">
                      <span className="font-bold text-sm">{mark.subject}</span>
                      <span className="text-[10px] text-muted-foreground">Max: {SUBJECTS.find(s => s.name === mark.subject)?.total}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Input 
                      type="number" 
                      value={mark.tutorial_marks}
                      onChange={(e) => handleMarkChange(idx, 'tutorial_marks', e.target.value)}
                      className="w-16 mx-auto h-8 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2 justify-center">
                      <Input 
                        type="number" 
                        placeholder="Sub"
                        value={mark.sub_marks}
                        onChange={(e) => handleMarkChange(idx, 'sub_marks', e.target.value)}
                        className="w-16 h-8 text-center text-xs"
                      />
                      <Input 
                        type="number" 
                        placeholder="Obj"
                        value={mark.obj_marks}
                        onChange={(e) => handleMarkChange(idx, 'obj_marks', e.target.value)}
                        className="w-16 h-8 text-center text-xs"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-sm bg-muted/30">
                    {toBengaliNumber(mark.total_marks || 0)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className={cn(
                      "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      mark.grade === 'F' 
                        ? "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80" 
                        : "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80"
                    )}>
                      {mark.grade}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {!selectedStudent && (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">Search and select a student to process results.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
