import React, { useState } from 'react';
import { StudyContextType, QuizDifficulty, QuizQuestion } from '../types';
import { generateQuiz, getMotivationalMessage } from '@/services/geminiService.ts';
import { Play, Loader2, CheckCircle, XCircle, RefreshCcw, Award, ArrowRight, Home, BarChart3, AlertCircle, X } from 'lucide-react';

interface QuizArenaProps {
  context: StudyContextType;
}

const QuizArena: React.FC<QuizArenaProps> = ({ context }) => {
  const { documents, notes, quizQuestions, setQuizQuestions, addQuizResult } = context;
  
  const [loading, setLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(QuizDifficulty.MEDIUM);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [error, setError] = useState<string | null>(null);

  const startQuiz = async () => {
     if (documents.length === 0 && !notes) {
        setError("Please upload study material in Study Lab first!");
        return;
     }

     setLoading(true);
     setError(null);
     try {
         const questions = await generateQuiz(documents, notes, difficulty);
         setQuizQuestions(questions);
         setQuizStarted(true);
         setCurrentQuestionIndex(0);
         setScore(0);
         setQuizCompleted(false);
         setMotivation('');
     } catch (e: any) {
         console.error(e);
         setError(e.message || "Failed to generate quiz. Please try again.");
     } finally {
         setLoading(false);
     }
  };

  const handleOptionSelect = (index: number) => {
      if (isAnswered) return;
      setSelectedOption(index);
  };

  const submitAnswer = () => {
      if (selectedOption === null) return;
      
      const currentQ = quizQuestions[currentQuestionIndex];
      const correct = selectedOption === currentQ.correctAnswerIndex;
      
      if (correct) setScore(s => s + 1);
      setIsAnswered(true);
  };
  
  const handleNext = async () => {
      if (currentQuestionIndex === quizQuestions.length - 1) {
          // Finish quiz
          const finalScore = score; // Current score is up to date because submitAnswer ran before
          setQuizCompleted(true);
          setLoading(true);
          const msg = await getMotivationalMessage(finalScore, quizQuestions.length);
          setMotivation(msg);
          addQuizResult({ score: finalScore, total: quizQuestions.length, feedback: msg });
          setLoading(false);
      } else {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedOption(null);
          setIsAnswered(false);
      }
  }

  // Reset quiz state to go back to difficulty selection
  const resetQuiz = () => {
      setQuizStarted(false);
      setQuizCompleted(false);
      setScore(0);
      setCurrentQuestionIndex(0);
      setMotivation('');
      setError(null);
  };

  if (!quizStarted) {
      return (
          <div className="max-w-3xl mx-auto text-center space-y-8 py-8 md:py-16 animate-fade-in px-4">
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto text-primary-600 dark:text-primary-400 mb-6 shadow-sm transform rotate-3 border border-white/50 dark:border-white/10">
                  <Play size={32} className="md:w-10 md:h-10" fill="currentColor" />
              </div>
              
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">Ready to Test Your Knowledge?</h2>
                <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
                    Take an AI-generated multiple choice test based on your notes. Choose your difficulty level to begin.
                </p>
              </div>

              {error && (
                <div className="w-full max-w-md mx-auto bg-red-50/80 dark:bg-red-900/30 border border-red-100 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3 text-red-700 dark:text-red-300 text-left glass-panel">
                    <AlertCircle className="shrink-0 mt-0.5" size={20} />
                    <div className="flex-1">
                        <p className="font-semibold text-sm">Error</p>
                        <p className="text-xs mt-1 opacity-90">{error}</p>
                    </div>
                    <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 dark:hover:text-red-200 transition-colors">
                        <X size={18} />
                    </button>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-center gap-4 w-full max-w-md mx-auto">
                  {[QuizDifficulty.EASY, QuizDifficulty.MEDIUM, QuizDifficulty.HARD].map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`
                            flex-1 px-6 py-4 rounded-xl font-bold border-2 transition-all duration-200 backdrop-blur-sm
                            ${difficulty === level 
                                ? 'border-primary-600/50 dark:border-primary-400/50 bg-primary-600/90 dark:bg-primary-600/80 text-white shadow-xl shadow-primary-500/20 scale-105' 
                                : 'border-white/50 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 hover:border-primary-300 hover:bg-white/80 dark:hover:bg-slate-800/80'
                            }
                        `}
                      >
                          {level}
                      </button>
                  ))}
              </div>

              <button 
                onClick={startQuiz}
                disabled={loading}
                className="w-full sm:w-auto mt-8 bg-slate-900/90 dark:bg-white/90 backdrop-blur-sm text-white dark:text-slate-900 px-10 py-4 rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center justify-center gap-3 mx-auto disabled:opacity-70 shadow-lg shadow-slate-900/20 dark:shadow-white/10"
              >
                  {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                  Start Quiz
              </button>
          </div>
      );
  }

  if (quizCompleted) {
      const percentage = Math.round((score / quizQuestions.length) * 100);
      return (
          <div className="max-w-xl mx-auto py-8 animate-fade-in px-4">
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="bg-white/30 dark:bg-slate-800/50 backdrop-blur-md p-8 text-center border-b border-white/50 dark:border-white/10">
                  <div className="inline-flex p-4 rounded-full bg-yellow-100/80 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-6 ring-4 ring-yellow-50/50 dark:ring-yellow-900/20">
                      <Award size={48} />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Quiz Completed!</h2>
                  <p className="text-slate-500 dark:text-slate-400">Here is your result</p>
              </div>

              <div className="p-8 space-y-8 bg-white/40 dark:bg-slate-900/40">
                <div className="text-center">
                    <div className="text-5xl md:text-7xl font-black text-primary-600 dark:text-primary-400 mb-2 tracking-tight">
                        {percentage}%
                    </div>
                    <div className="inline-block px-4 py-1.5 rounded-full bg-slate-100/80 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 font-medium text-sm">
                        You scored {score} out of {quizQuestions.length}
                    </div>
                </div>

                <div className="bg-indigo-50/60 dark:bg-indigo-900/20 p-6 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30 relative backdrop-blur-sm">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 p-1.5 rounded-full">
                        <BarChart3 size={16} />
                    </div>
                    <p className="text-center font-medium text-indigo-900 dark:text-indigo-200 italic leading-relaxed">
                        "{motivation}"
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <button 
                        onClick={resetQuiz} 
                        className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl border border-slate-300/60 dark:border-slate-600/60 bg-white/50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 font-bold transition-colors"
                    >
                        <Home size={18} />
                        Back to Menu
                    </button>
                    <button 
                        onClick={startQuiz} 
                        className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-primary-600/90 hover:bg-primary-700/90 text-white font-bold shadow-lg shadow-primary-500/20 transition-all hover:-translate-y-0.5 backdrop-blur-sm"
                    >
                        <RefreshCcw size={18} />
                        Try Again
                    </button>
                </div>
              </div>
            </div>
          </div>
      );
  }

  const currentQ = quizQuestions[currentQuestionIndex];

  return (
      <div className="max-w-3xl mx-auto px-2">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] md:text-xs font-bold text-primary-600 dark:text-primary-400 tracking-wider uppercase bg-primary-50/80 dark:bg-primary-900/30 px-2.5 py-1 rounded-full border border-primary-100/50 dark:border-primary-800/30 backdrop-blur-sm">
                        {difficulty} Mode
                    </span>
                    <span className="text-xs text-slate-400 font-medium">Question {currentQuestionIndex + 1}/{quizQuestions.length}</span>
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-100">Quiz In Progress</h2>
              </div>
              <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/60 px-4 py-2 rounded-xl border border-white/50 dark:border-white/10 shadow-sm self-start sm:self-auto backdrop-blur-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score</span>
                  <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{score}</span>
              </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-3 bg-slate-200/50 dark:bg-slate-700/50 rounded-full mb-8 overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full bg-primary-600 dark:bg-primary-500 transition-all duration-500 ease-out rounded-full"
                style={{ width: `${((currentQuestionIndex + 1) / quizQuestions.length) * 100}%` }}
              />
          </div>

          {/* Question Card */}
          <div className="glass-card p-6 md:p-8 rounded-3xl mb-8 bg-white/70 dark:bg-slate-800/70">
              <h3 className="text-lg md:text-xl font-medium text-slate-800 dark:text-slate-100 leading-relaxed mb-8">
                  {currentQ.question}
              </h3>

              <div className="space-y-3">
                  {currentQ.options.map((option, idx) => {
                      let btnClass = "w-full text-left p-4 md:p-5 rounded-xl border-2 transition-all flex justify-between items-center group relative overflow-hidden backdrop-blur-sm ";
                      
                      if (isAnswered) {
                          if (idx === currentQ.correctAnswerIndex) {
                              btnClass += "border-green-500 bg-green-50/80 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium shadow-sm";
                          } else if (idx === selectedOption) {
                              btnClass += "border-red-500 bg-red-50/80 dark:bg-red-900/30 text-red-700 dark:text-red-300 opacity-60";
                          } else {
                              btnClass += "border-transparent bg-white/30 dark:bg-slate-700/30 text-slate-400 opacity-40";
                          }
                      } else {
                          if (selectedOption === idx) {
                              btnClass += "border-primary-600 bg-primary-50/80 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-md ring-1 ring-primary-200 dark:ring-primary-800";
                          } else {
                              btnClass += "border-white/50 dark:border-white/5 bg-white/40 dark:bg-slate-700/40 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-white/60 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200";
                          }
                      }

                      return (
                          <button
                            key={idx}
                            onClick={() => handleOptionSelect(idx)}
                            disabled={isAnswered}
                            className={btnClass}
                          >
                              <div className="flex items-start gap-3 w-full">
                                  <span className={`
                                    flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border
                                    ${isAnswered && idx === currentQ.correctAnswerIndex ? 'bg-green-200 dark:bg-green-800 border-green-300 dark:border-green-700 text-green-700 dark:text-green-200' : ''}
                                    ${!isAnswered && selectedOption === idx ? 'bg-primary-200 dark:bg-primary-800 border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-200' : 'bg-slate-100/50 dark:bg-slate-600/50 border-slate-200/50 dark:border-slate-600/50 text-slate-400'}
                                  `}>
                                      {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span className="text-sm md:text-base leading-snug">{option}</span>
                              </div>
                              {isAnswered && idx === currentQ.correctAnswerIndex && <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />}
                              {isAnswered && idx === selectedOption && idx !== currentQ.correctAnswerIndex && <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />}
                          </button>
                      );
                  })}
              </div>
          </div>

          {/* Footer Action */}
          <div className="flex justify-end pb-8">
              {!isAnswered ? (
                  <button
                    onClick={submitAnswer}
                    disabled={selectedOption === null}
                    className="w-full sm:w-auto bg-primary-600/90 hover:bg-primary-700/90 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold shadow-lg shadow-primary-500/20 hover:bg-primary-700/90 disabled:opacity-50 disabled:shadow-none transition-all hover:-translate-y-0.5"
                  >
                      Check Answer
                  </button>
              ) : (
                  <button
                    onClick={handleNext}
                    className="w-full sm:w-auto bg-slate-900/90 dark:bg-white/90 backdrop-blur-sm text-white dark:text-slate-900 px-8 py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 dark:hover:bg-white transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                      {currentQuestionIndex === quizQuestions.length - 1 ? 'See Results' : 'Next Question'}
                      <ArrowRight size={18} />
                  </button>
              )}
          </div>
      </div>
  );
};

export default QuizArena;
