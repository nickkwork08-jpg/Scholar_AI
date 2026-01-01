import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, FileData, Flashcard, QuizQuestion, QuizResult, StudyContextType, User, ChatMessage } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudyLab from './components/StudyLab';
import Flashcards from './components/Flashcards';
import QuizArena from './components/QuizArena';
import ChatBot from './components/ChatBot';
import Auth from './components/Auth';
import { Menu } from 'lucide-react';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
             (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  
  const [documents, setDocuments] = useState<FileData[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  useEffect(() => {
      const storedSession = localStorage.getItem('scholar_session');
      if (storedSession) {
          try {
              setUser(JSON.parse(storedSession));
          } catch (e) {
              console.error("Failed to parse session", e);
              localStorage.removeItem('scholar_session');
          }
      }
      setIsLoadingAuth(false);
  }, []);

  const handleLogin = (loggedInUser: User, isNew: boolean = false) => {
      setUser(loggedInUser);
      setIsNewUser(isNew);
      localStorage.setItem('scholar_session', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
      setUser(null);
      localStorage.removeItem('scholar_session');
      setDocuments([]);
      setNotes('');
      setFlashcards([]);
      setQuizQuestions([]);
      setQuizResults([]);
      setChatHistory([]);
      setCurrentView('dashboard');
  };

  const context = useMemo<StudyContextType>(() => ({
    documents,
    addDocument: (doc) => setDocuments(prev => [...prev, doc]),
    removeDocument: (index) => setDocuments(prev => prev.filter((_, i) => i !== index)),
    notes,
    setNotes,
    flashcards,
    setFlashcards,
    quizQuestions,
    setQuizQuestions,
    quizResults,
    addQuizResult: (res) => setQuizResults(prev => [...prev, res]),
    chatHistory,
    addChatMessage: (msg) => setChatHistory(prev => [...prev, msg]),
  }), [documents, notes, flashcards, quizQuestions, quizResults, chatHistory]);

  const handleViewChange = (view: ViewState) => {
    setCurrentView(view);
    setIsSidebarOpen(false);
  };

  const renderView = () => {
    switch(currentView) {
      case 'dashboard':
        return <Dashboard context={context} onChangeView={handleViewChange} userName={user?.name || 'Scholar'} isNewUser={isNewUser} />;
      case 'studylab':
        return <StudyLab context={context} />;

      case 'flashcards':
        return <Flashcards context={context} />;
      case 'quiz':
        return <QuizArena context={context} />;
      case 'chat':
        return <ChatBot context={context} />;
      default:
        return <Dashboard context={context} onChangeView={handleViewChange} userName={user?.name || 'Scholar'} isNewUser={isNewUser} />;
    }
  };

  if (isLoadingAuth) {
      return (
          <div className="min-h-screen flex items-center justify-center dark:bg-slate-900">
              <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full"></div>
          </div>
      );
  }

  if (!user) {
      return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex font-sans relative bg-slate-50/20 dark:bg-slate-900/50 transition-colors duration-300">
      <button 
        onClick={() => setIsSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-2.5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
      >
        <Menu size={24} />
      </button>

      <Sidebar 
        currentView={currentView} 
        setView={handleViewChange} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onLogout={handleLogout}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
      />
      
      <main className={`flex-1 md:ml-64 w-full h-screen ${currentView === 'chat' ? 'overflow-hidden' : 'overflow-y-auto overflow-x-hidden'} relative`}>
        <div className={currentView === 'chat' ? 'w-full h-full p-0 m-0 mt-0' : 'max-w-7xl mx-auto p-4 md:p-8 mt-12 md:mt-0 min-h-full'}>
            <div key={currentView} className="animate-fade-in h-full">
                {renderView()}
            </div>
        </div>
      </main>
    </div>
  );
}

export default App;