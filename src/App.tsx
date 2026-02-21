/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CreditCard, 
  GraduationCap, 
  UserPlus,
  Menu,
  X,
  ChevronLeft,
  LogOut,
  Lock,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Student } from './types';
import { supabase } from './lib/supabase';

// Components
import AdmissionForm from './components/AdmissionForm';
import StudentList from './components/StudentList';
import Ledger from './components/Ledger';
import ResultProcessing from './components/ResultProcessing';
import Login from './components/Login';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function SetNewPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      setMessage("Password set successfully! Redirecting...");
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Failed to set password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-blue-600/20">
            <Lock size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Set New Password</h1>
          <p className="text-slate-500 mt-2">Please enter your new password below</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 text-red-600 text-sm">
            <span>{error}</span>
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-xl flex items-start gap-3 text-green-600 text-sm">
            <span>{message}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">New Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                placeholder="••••••••"
              />
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Confirm Password</label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-sm"
                placeholder="••••••••"
              />
              <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Set Password'}
          </button>
        </form>
      </div>
    </div>
  );
}

type View = 'admission' | 'students' | 'ledger' | 'results';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<View>('admission');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' && window.location.hash.includes('type=invite')) {
        setIsPasswordRecovery(true);
      }
      if (event === 'USER_UPDATED') {
        setIsPasswordRecovery(false);
      }
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isPasswordRecovery || (session && window.location.hash.includes('type=recovery'))) {
    return <SetNewPassword onComplete={() => setIsPasswordRecovery(false)} />;
  }

  if (!session) {
    return <Login />;
  }

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

        <div className="p-2 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-all text-slate-500 hover:bg-red-50 hover:text-red-600",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
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
