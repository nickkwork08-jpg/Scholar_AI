import React, { useState } from 'react';
import { LayoutDashboard, BookOpen, Layers, CheckSquare, GraduationCap, X, LogOut, MessageCircle, Moon, Sun, AlertTriangle, Sparkles, FileText } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  isOpen?: boolean;
  onClose?: () => void;
  onLogout: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isOpen = false, onClose, onLogout, isDarkMode, toggleTheme }) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'studylab', label: 'Study Lab', icon: BookOpen },
    { id: 'flashcards', label: 'Flashcards', icon: Layers },
    { id: 'quiz', label: 'Quiz Arena', icon: CheckSquare },
    { id: 'chat', label: 'AI Assistant', icon: MessageCircle },
  ];

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Logout Confirmation Modal Overlay */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={cancelLogout}
            />
            
            {/* Modal Card */}
            <div className="relative bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-2xl p-6 md:p-8 max-w-sm w-full border border-white/20 dark:border-white/10 animate-slide-up">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-4 mx-auto shadow-inner">
                    <AlertTriangle size={24} />
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center mb-2">Sign Out?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-center text-sm mb-6">
                    Are you sure you want to sign out? Your session data might be cleared.
                </p>
                
                <div className="flex gap-3">
                    <button 
                        onClick={cancelLogout}
                        className="flex-1 py-2.5 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 border border-white/20 hover:bg-white dark:hover:bg-slate-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmLogout}
                        className="flex-1 py-2.5 rounded-xl font-medium text-white bg-red-50/90 hover:bg-red-600 shadow-lg shadow-red-500/20 transition-all hover:-translate-y-0.5 backdrop-blur-sm"
                    >
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed left-0 top-0 h-full w-72 md:w-64 flex flex-col z-50
        bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl border-r border-white/20 dark:border-white/5
        transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1) will-change-transform
        ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
        md:translate-x-0 shadow-2xl md:shadow-none
      `}>
        <div className="p-6 flex items-center justify-between border-b border-white/10 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary-500 to-primary-700 p-2 rounded-xl text-white shadow-lg shadow-primary-500/30">
                <GraduationCap size={24} />
            </div>
            <h1 className="font-bold text-xl text-slate-800 dark:text-slate-100 tracking-tight">ScholarAI</h1>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                  <button
                      key={item.id}
                      onClick={() => setView(item.id as ViewState)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-medium text-sm group relative overflow-hidden ${
                          isActive 
                          ? 'bg-primary-500/10 dark:bg-primary-400/10 text-primary-700 dark:text-primary-300 border border-primary-500/20 dark:border-primary-400/20 backdrop-blur-md shadow-[0_0_20px_rgba(139,92,246,0.1)] translate-x-1' 
                          : 'text-slate-500 dark:text-slate-400 hover:bg-white/30 dark:hover:bg-white/5 hover:backdrop-blur-sm hover:text-slate-900 dark:hover:text-slate-100 hover:border hover:border-white/20 dark:hover:border-white/5 hover:translate-x-1 hover:shadow-sm'
                      }`}
                  >
                      <item.icon size={20} className={`transition-colors duration-200 relative z-10 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                      <span className="relative z-10">{item.label}</span>
                      {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full" />}
                  </button>
              );
          })}
        </nav>

        <div className="p-4 space-y-4">
           {/* Theme Toggle */}
           <button 
              onClick={toggleTheme}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium text-sm bg-white/20 dark:bg-slate-800/40 border border-white/30 dark:border-white/5 hover:bg-white/40 dark:hover:bg-slate-700/40 transition-all text-slate-600 dark:text-slate-300 backdrop-blur-sm"
           >
              <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon size={18} className="text-primary-400" /> : <Sun size={18} className="text-amber-500" />}
                  <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
           </button>

          <button 
            onClick={handleLogoutClick}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm text-slate-500 dark:text-slate-400 hover:bg-red-500/10 dark:hover:bg-red-500/10 hover:border hover:border-red-500/20 hover:backdrop-blur-sm hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 group"
          >
             <LogOut size={20} className="group-hover:translate-x-[-2px] transition-transform" />
             Sign Out
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;