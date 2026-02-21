import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Student, CLASSES, SECTIONS, SESSIONS } from '../types';
import { Search, Edit2, Trash2, User, Eye, ChevronLeft, ChevronRight, FilterX, X } from 'lucide-react';
import { toBengaliNumber } from '../utils';
import { cn } from '../lib/utils';

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/src/components/ui/table";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { Separator } from "@/src/components/ui/separator";
import { Badge } from "@/src/components/ui/badge";

interface Props {
  onEdit: (student: Student) => void;
}

export default function StudentList({ onEdit }: Props) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    class: 'all',
    section: 'all',
    session: 'all',
  });
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const pageSize = 20;

  const fetchStudents = async () => {
    setLoading(true);
    let query = supabase
      .from('students')
      .select('*', { count: 'exact' });
    
    if (searchTerm) {
      query = query.or(`name_bengali.ilike.%${searchTerm}%,name_english.ilike.%${searchTerm}%,sl_no.eq.${searchTerm}`);
    }
    if (filters.class !== 'all') query = query.eq('class', filters.class);
    if (filters.section !== 'all') query = query.eq('section', filters.section);
    if (filters.session !== 'all') query = query.eq('session', filters.session);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('sl_no', { ascending: true })
      .range(from, to);

    if (!error && data) {
      setStudents(data);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, [filters, page, searchTerm]);

  const handleDelete = async (id: string) => {
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই শিক্ষার্থীর তথ্য মুছে ফেলতে চান?')) return;
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (!error) fetchStudents();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  const resetFilters = () => {
    setFilters({ class: 'all', section: 'all', session: 'all' });
    setSearchTerm('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Filter students by name, class, section, or session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[240px] space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Search Student</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or SL.NO..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Class</label>
              <Select value={filters.class} onValueChange={(v) => { setFilters({...filters, class: v}); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {CLASSES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Section</label>
              <Select value={filters.section} onValueChange={(v) => { setFilters({...filters, section: v}); setPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session</label>
              <Select value={filters.session} onValueChange={(v) => { setFilters({...filters, session: v}); setPage(1); }}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sessions</SelectItem>
                  {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filters">
              <FilterX className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[80px]">SL.NO</TableHead>
                <TableHead className="w-[80px]">Photo</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    No students found.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => (
                  <TableRow key={student.id} className="group">
                    <TableCell className="font-medium text-muted-foreground">
                      {toBengaliNumber(student.sl_no)}
                    </TableCell>
                    <TableCell>
                      <div className="h-10 w-10 rounded-full border bg-muted overflow-hidden">
                        {student.photo_url ? (
                          <img src={student.photo_url} alt={student.name_bengali} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <User className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-primary">{student.name_bengali}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{student.name_english}</span>
                      </div>
                    </TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>{student.section}</TableCell>
                    <TableCell>{student.shift}</TableCell>
                    <TableCell className="font-mono text-xs">{toBengaliNumber(student.present_phone)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setSelectedStudent(student)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(student)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-xs text-muted-foreground">
              Showing {toBengaliNumber((page - 1) * pageSize + 1)} to {toBengaliNumber(Math.min(page * pageSize, totalCount))} of {toBengaliNumber(totalCount)} students
            </p>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Previous
              </Button>
              <div className="text-sm font-medium">
                Page {toBengaliNumber(page)} of {toBengaliNumber(totalPages)}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          {selectedStudent && (
            <>
              <DialogHeader className="p-6 bg-muted/30">
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-xl border bg-background overflow-hidden shadow-sm">
                    {selectedStudent.photo_url ? (
                      <img src={selectedStudent.photo_url} alt={selectedStudent.name_bengali} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <User className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold">{selectedStudent.name_bengali}</DialogTitle>
                    <DialogDescription className="uppercase tracking-wider font-medium text-xs mt-1">
                      {selectedStudent.name_english}
                    </DialogDescription>
                    <div className="flex gap-2 mt-4">
                      <div className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold">Class: {selectedStudent.class}</div>
                      <div className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold">Section: {selectedStudent.section}</div>
                      <div className="bg-primary/10 text-primary px-2 py-1 rounded text-[10px] font-bold">SL.NO: {toBengaliNumber(selectedStudent.sl_no)}</div>
                    </div>
                  </div>
                </div>
              </DialogHeader>
              <div className="p-6 grid grid-cols-2 gap-6 max-h-[60vh] overflow-auto">
                <ProfileItem label="Father's Name" value={selectedStudent.father_name} />
                <ProfileItem label="Father's Occupation" value={selectedStudent.father_occupation} />
                <ProfileItem label="Mother's Name" value={selectedStudent.mother_name} />
                <ProfileItem label="Mother's Occupation" value={selectedStudent.mother_occupation} />
                <ProfileItem label="Date of Birth" value={selectedStudent.date_of_birth} />
                <ProfileItem label="Shift" value={selectedStudent.shift} />
                <ProfileItem label="Present Phone" value={toBengaliNumber(selectedStudent.present_phone)} />
                <ProfileItem label="Permanent Phone" value={toBengaliNumber(selectedStudent.permanent_phone)} />
                <div className="col-span-2">
                  <ProfileItem label="Present Address" value={selectedStudent.present_address} />
                </div>
                <div className="col-span-2">
                  <ProfileItem label="Permanent Address" value={selectedStudent.permanent_address} />
                </div>
                <div className="col-span-2">
                  <Separator className="my-2" />
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Previous Institute Info</h4>
                  <div className="grid grid-cols-2 gap-6">
                    <ProfileItem label="Institute Name" value={selectedStudent.previous_institute} />
                    <ProfileItem label="Class" value={selectedStudent.previous_class} />
                    <div className="col-span-2">
                      <ProfileItem label="Address" value={selectedStudent.previous_address} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold">{value || 'N/A'}</p>
    </div>
  );
}
