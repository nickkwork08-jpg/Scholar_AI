export type ViewState = 'dashboard' | 'studylab' | 'flashcards' | 'quiz' | 'chat';

export interface User {
  name: string;
  email: string;
}

export interface FileData {
  name: string;
  type: string;
  data: string; // Base64 string
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  isLearned: boolean;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswerIndex: number; // 0-3
}

export interface QuizResult {
  score: number;
  total: number;
  feedback: string;
}

export enum QuizDifficulty {
  EASY = 'Easy',
  MEDIUM = 'Medium',
  HARD = 'Hard'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: FileData;
}

export interface StudyContextType {
  documents: FileData[];
  addDocument: (doc: FileData) => void;
  removeDocument: (index: number) => void;
  notes: string;
  setNotes: (notes: string) => void;
  flashcards: Flashcard[];
  setFlashcards: (cards: Flashcard[]) => void;
  quizQuestions: QuizQuestion[];
  setQuizQuestions: (questions: QuizQuestion[]) => void;
  quizResults: QuizResult[];
  addQuizResult: (result: QuizResult) => void;
  chatHistory: ChatMessage[];
  addChatMessage: (message: ChatMessage) => void;
} 