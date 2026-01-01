import React from 'react';
import { StudyContextType } from '../types';
import { Brain, FileText, Zap, Trophy, CheckSquare, Sparkles, ArrowRight, Plus } from 'lucide-react';

interface DashboardProps {
    context: StudyContextType;
    onChangeView: (view: any) => void;
    userName: string;
    isNewUser?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ context, onChangeView, userName, isNewUser = false }) => {
    const { flashcards, quizResults, documents } = context;

    // Flashcard Stats
    const cardsMastered = flashcards.filter(f => f.isLearned).length;
    const totalCards = flashcards.length;
    const masteryPercentage = totalCards > 0 ? Math.round((cardsMastered / totalCards) * 100) : 0;
    
    // Quiz Stats
    const totalQuizzes = quizResults.length;
    const avgScorePercentage = totalQuizzes > 0 
        ? Math.round(quizResults.reduce((acc, curr) => acc + (curr.score / curr.total), 0) / totalQuizzes * 100)
        : 0;

    const stats = [
        { label: 'Cards Mastered', value: `${cardsMastered}/${totalCards}`, icon: Brain, color: 'text-purple-600 dark:text-purple-300', bg: 'bg-purple-100/50 dark:bg-purple-500/20' },
        { label: 'Avg. Quiz Score', value: `${avgScorePercentage}%`, icon: Trophy, color: 'text-emerald-600 dark:text-emerald-300', bg: 'bg-emerald-100/50 dark:bg-emerald-500/20' },
        { label: 'Tests Taken', value: totalQuizzes, icon: Zap, color: 'text-amber-600 dark:text-amber-300', bg: 'bg-amber-100/50 dark:bg-amber-500/20' },
        { label: 'Study Documents', value: documents.length, icon: FileText, color: 'text-blue-600 dark:text-blue-300', bg: 'bg-blue-100/50 dark:bg-blue-500/20' },
    ];

    // Reusable Progress Cycle Component (uses explicit color palette to keep Tailwind classes static)
    const colorPalettes: Record<string, any> = {
        purple: {
            glowClass: 'bg-purple-500',
            iconBgClass: 'bg-purple-50 dark:bg-purple-900/20',
            iconColorClass: 'text-purple-600 dark:text-purple-300',
            start: '#c4b5fd',
            end: '#7c3aed'
        },
        emerald: {
            glowClass: 'bg-emerald-500',
            iconBgClass: 'bg-emerald-100/50 dark:bg-emerald-500/20',
            iconColorClass: 'text-emerald-600 dark:text-emerald-300',
            start: '#6ee7b7',
            end: '#059669'
        }
    };

    const ProgressCycle = ({ percentage, color, label, icon: Icon, sublabel }: { percentage: number, color: 'purple' | 'emerald', label: string, icon: any, sublabel: string }) => {
        const pct = Math.max(0, Math.min(100, percentage));
        const palette = colorPalettes[color] || colorPalettes.purple;
        return (
            <div className="relative w-48 h-48 md:w-52 md:h-52 group-hover:scale-105 transition-transform duration-700">
                <div className={`absolute inset-0 blur-3xl rounded-full opacity-20 transition-opacity duration-1000 ${palette.glowClass} group-hover:opacity-40`}></div>
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <defs>
                        <linearGradient id={`${label}-gradient`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={palette.start} />
                            <stop offset="100%" stopColor={palette.end} />
                        </linearGradient>
                        <filter id="glow-effect">
                            <feGaussianBlur stdDeviation="0.8" result="coloredBlur"/>
                            <feMerge>
                                <feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/>
                            </feMerge>
                        </filter>
                    </defs>
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-700/50" strokeWidth="3" />
                    <circle cx="18" cy="18" r="15.9155" fill="none" stroke={`url(#${label}-gradient)`} strokeWidth="3.2" strokeDasharray={`${pct}, 100`} strokeLinecap="round" filter="url(#glow-effect)" className="transition-all duration-1000 ease-out" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <div className={`p-2 rounded-full mb-1 ${palette.iconBgClass} ${palette.iconColorClass}`}>
                        <Icon size={16} />
                    </div>
                    <span className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                        {pct}<span className="text-xl opacity-60">%</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{sublabel}</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 md:space-y-10 pb-12">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 animate-slide-up">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-1 w-12 bg-primary-500 rounded-full"></div>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-400">Student Dashboard</span>
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        {isNewUser ? `Welcome, ${userName}!` : `Welcome back, ${userName}`}
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2 text-base md:text-lg max-w-xl">
                        {isNewUser ? "Let's build your first study set. Ready to transform your notes into mastery?" : "Your academic progress looks promising. Keep up the great work!"}
                    </p>
                </div>
                {documents.length > 0 && (
                     <button 
                        onClick={() => onChangeView('studylab')}
                        className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl font-bold shadow-xl shadow-primary-500/20 transition-all flex items-center gap-3 self-start md:self-auto text-sm md:text-base border border-white/20 active:scale-95 group"
                     >
                        <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                        New Study Session
                     </button>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
                {stats.map((stat, idx) => (
                    <div 
                        key={idx} 
                        className={`group p-6 rounded-[2rem] flex flex-col items-start gap-4 transition-all hover:-translate-y-1.5 duration-500 animate-slide-up bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-white/5 hover:shadow-2xl hover:bg-white/80 dark:hover:bg-slate-800/80 backdrop-blur-xl shadow-sm`}
                        style={{ animationDelay: `${idx * 100}ms` }}
                    >
                        <div className={`p-4 rounded-2xl ${stat.bg} ${stat.color} backdrop-blur-md shadow-inner ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-500`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className="text-2xl md:text-3xl font-black text-slate-800 dark:text-slate-100">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Progress Widgets */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Flashcard Mastery Cycle */}
                <div className="bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-white/5 p-8 md:p-10 rounded-[2.5rem] flex flex-col animate-slide-up stagger-3 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                             <div className="p-3 rounded-2xl bg-purple-100/50 dark:bg-purple-500/20 text-purple-600 dark:text-purple-300 ring-1 ring-white/20">
                                <Brain size={24} />
                             </div>
                             <div>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Mastery Progress</h3>
                                <p className="text-xs text-slate-400 font-medium">Concept retention status</p>
                             </div>
                        </div>
                        <button onClick={() => onChangeView('flashcards')} className="p-2 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all hover:scale-110">
                            <ArrowRight size={20} />
                        </button>
                    </div>
                    
                    {totalCards > 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-4 relative z-10">
                            <ProgressCycle 
                                percentage={masteryPercentage} 
                                color="purple" 
                                label="flashcard" 
                                icon={Brain} 
                                sublabel="Mastered" 
                            />
                            <button 
                                onClick={() => onChangeView('flashcards')} 
                                className="w-full max-w-xs py-4 px-8 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 dark:shadow-white/5 flex items-center justify-center gap-2 group"
                            >
                                Continue Practicing
                                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-10 relative z-10">
                             <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-full mb-4 shadow-lg ring-1 ring-white/20">
                                <Brain size={32} className="text-purple-400/70" />
                             </div>
                             <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-center">No Cards To Study</h4>
                             <p className="text-xs text-slate-400 max-w-[200px] text-center mb-6">Generate materials in the Study Lab to begin.</p>
                             <button onClick={() => onChangeView('studylab')} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-primary-600 dark:text-primary-400 text-sm font-bold shadow-md transition-all border border-white/20">
                                <Plus size={16} /> Get Started
                             </button>
                        </div>
                    )}
                </div>

                {/* Quiz Performance Cycle */}
                <div className="bg-white/40 dark:bg-slate-800/40 border border-white/60 dark:border-white/5 p-8 md:p-10 rounded-[2.5rem] flex flex-col animate-slide-up stagger-4 backdrop-blur-xl shadow-xl hover:shadow-2xl transition-all group overflow-hidden relative">
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-3">
                             <div className="p-3 rounded-2xl bg-emerald-100/50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 ring-1 ring-white/20">
                                <Trophy size={24} />
                             </div>
                             <div>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">Quiz Statistics</h3>
                                <p className="text-xs text-slate-400 font-medium">Average testing performance</p>
                             </div>
                        </div>
                        <button onClick={() => onChangeView('quiz')} className="p-2 rounded-xl bg-slate-100/50 dark:bg-slate-700/50 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all hover:scale-110">
                            <ArrowRight size={20} />
                        </button>
                    </div>

                    {totalQuizzes > 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-4 relative z-10">
                            <ProgressCycle 
                                percentage={avgScorePercentage} 
                                color="emerald" 
                                label="quiz" 
                                icon={Trophy} 
                                sublabel="Avg Score" 
                            />
                            <div className="w-full flex flex-col gap-2">
                                <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Recent History</p>
                                <div className="flex justify-center gap-2">
                                    {quizResults.slice(-5).map((r, i) => (
                                        <div key={i} className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold border ${r.score/r.total > 0.7 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600' : 'bg-amber-500/10 border-amber-500/30 text-amber-600'}`}>
                                            {Math.round(r.score/r.total*100)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 py-10 relative z-10">
                             <div className="bg-white/80 dark:bg-slate-800/80 p-6 rounded-full mb-4 shadow-lg ring-1 ring-white/20">
                                <Trophy size={32} className="text-emerald-400/70" />
                             </div>
                             <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-1 text-center">No Quiz Data</h4>
                             <p className="text-xs text-slate-400 max-w-[200px] text-center mb-6">Take your first test to track your performance.</p>
                             <button onClick={() => onChangeView('quiz')} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-emerald-600 dark:text-emerald-400 text-sm font-bold shadow-md transition-all border border-white/20">
                                <Zap size={16} /> Start a Quiz
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;