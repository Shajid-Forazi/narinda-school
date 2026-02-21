/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, 
  CreditCard, 
  GraduationCap, 
  UserPlus,
  Menu,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Student } from './types';

// Components
import AdmissionForm from './components/AdmissionForm';
import StudentList from './components/StudentList';
import Ledger from './components/Ledger';
import ResultProcessing from './components/ResultProcessing';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type View = 'admission' | 'students' | 'ledger' | 'results';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('admission');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const navItems = [
    { id: 'admission', label: '📝 Admission Form', icon: UserPlus },
    { id: 'students', label: '👨‍🎓 Students', icon: Users },
    { id: 'ledger', label: '📒 Ledger Book', icon: CreditCard },
    { id: 'results', label: '📋 Result Card', icon: GraduationCap },
  ];

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setCurrentView('admission');
  };

  const handleNavClick = (view: View) => {
    if (view === 'admission') {
      setEditingStudent(null);
    }
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case 'admission':
        return (
          <AdmissionForm 
            onComplete={() => {
              setEditingStudent(null);
              setCurrentView('students');
            }} 
            studentToEdit={editingStudent}
          />
        );
      case 'students':
        return <StudentList onEdit={handleEditStudent} />;
      case 'ledger':
        return <Ledger />;
      case 'results':
        return <ResultProcessing />;
      default:
        return <AdmissionForm onComplete={() => setCurrentView('students')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f1] flex font-sans text-[#1d2327]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#1d2327] transition-all duration-300 flex flex-col print:hidden sticky top-0 h-screen",
          isSidebarOpen ? "w-64" : "w-12"
        )}
      >
        <div className="p-4 flex items-center gap-3 border-b border-[#2c3338]">
          <div className="w-8 h-8 bg-[#1e40af] rounded flex items-center justify-center text-white shrink-0">
            <GraduationCap size={20} />
          </div>
          {isSidebarOpen && (
            <div className="overflow-hidden whitespace-nowrap">
              <h1 className="font-bold text-sm text-white leading-tight">Narinda Ideal</h1>
              <p className="text-[10px] text-slate-400">School & College</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2 text-sm transition-all group",
                currentView === item.id 
                  ? "bg-[#1e40af] text-white font-medium border-r-4 border-white/20" 
                  : "text-[#c3c4c7] hover:bg-[#2c3338] hover:text-[#72aee6]"
              )}
            >
              <item.icon size={18} className="shrink-0" />
              {isSidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-3 text-[#c3c4c7] hover:text-white flex justify-center border-t border-[#2c3338]"
        >
          {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-12 bg-white border-b border-[#c3c4c7] flex items-center justify-between px-6 print:hidden">
          <h2 className="text-lg font-medium text-[#1d2327]">
            {editingStudent && currentView === 'admission' 
              ? 'শিক্ষার্থীর তথ্য পরিবর্তন (Edit Student)' 
              : navItems.find(i => i.id === currentView)?.label.split(' ').slice(1).join(' ')}
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500">Admin Panel</span>
            <div className="w-6 h-6 rounded-full bg-slate-200" />
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6 print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (editingStudent?.id || '')}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
