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
  ChevronLeft,
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
    { id: 'admission', label: 'Admission', icon: UserPlus },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'ledger', label: 'Ledger', icon: CreditCard },
    { id: 'results', label: 'Results', icon: GraduationCap },
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
    <div className="min-h-screen bg-[#f8f9fa] flex font-sans text-[#1a1a1a]">
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-white border-r border-slate-200 transition-all duration-300 flex flex-col print:hidden sticky top-0 h-screen",
          isSidebarOpen ? "w-64" : "w-16"
        )}
      >
        <div className={cn("h-16 flex items-center mb-4", isSidebarOpen ? "px-4 justify-between" : "justify-center")}>
          {isSidebarOpen ? (
            <>
              <div className="flex items-center">
                <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
                  <GraduationCap size={18} strokeWidth={2.5} />
                </div>
                <div className="ml-3 overflow-hidden whitespace-nowrap">
                  <h1 className="font-semibold text-sm tracking-tight">Narinda Ideal</h1>
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Management</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0 hover:bg-slate-800 transition-colors"
            >
              <Menu size={18} />
            </button>
          )}
        </div>

        <nav className="flex-1 px-2 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id as View)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all group relative",
                currentView === item.id 
                  ? "bg-slate-100 text-slate-900 font-semibold" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon 
                size={18} 
                strokeWidth={currentView === item.id ? 2.5 : 2} 
                className="shrink-0" 
              />
              {isSidebarOpen && <span>{item.label}</span>}
              {!isSidebarOpen && currentView === item.id && (
                <div className="absolute left-0 w-1 h-6 bg-slate-900 rounded-r-full" />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10 print:hidden">
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-widest">
            {editingStudent && currentView === 'admission' 
              ? 'Edit Student' 
              : navItems.find(i => i.id === currentView)?.label}
          </h2>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900">Admin</span>
              <span className="text-[10px] text-slate-400">Super User</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <Users size={14} />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-8 print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView + (editingStudent?.id || '')}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
