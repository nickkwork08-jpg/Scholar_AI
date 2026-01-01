import React, { useState, useRef, useEffect } from 'react';
import { StudyContextType, ChatMessage, FileData } from '../types';
import { getChatResponse } from '../services/geminiService';
import { Send, Bot, User as UserIcon, Loader2, MessageCircle, Paperclip, X, Sparkles, Copy, Check, Terminal, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';

interface ChatBotProps {
  context: StudyContextType;
}

const ChatBot: React.FC<ChatBotProps> = ({ context }) => {
  const { chatHistory, addChatMessage, notes, flashcards, quizResults } = context;
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachment, setAttachment] = useState<FileData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isLoading]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        setAttachment({
          name: file.name,
          type: file.type,
          data: base64
        });
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = () => {
    setAttachment(null);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !attachment) return;

    const currentAttachment = attachment;
    const currentInput = input;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: currentInput,
      timestamp: Date.now(),
      attachment: currentAttachment || undefined
    };

    addChatMessage(userMessage);
    setInput('');
    setAttachment(null);
    setIsLoading(true);

    try {
      const apiHistory = chatHistory.filter(m => m.role === 'user' || m.role === 'model');
      
      const responseText = await getChatResponse(
        currentInput || (currentAttachment ? "Analyze this image" : ""),
        apiHistory,
        { notes, flashcards, quizResults },
        currentAttachment || undefined
      );

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now(),
      };

      addChatMessage(botMessage);
    } catch (error) {
      console.error(error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I'm having trouble connecting right now. Please check your internet connection and try again.",
        timestamp: Date.now(),
      };
      addChatMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (text: string) => {
      setInput(text);
  };

  // Custom component for rendering code blocks with terminal look
  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const [copied, setCopied] = useState(false);
      const isTerminal = match && ['bash', 'sh', 'shell', 'zsh', 'cmd', 'powershell'].includes(match[1]);

      const handleCopy = () => {
        navigator.clipboard.writeText(String(children));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      };

      return !inline ? (
        <div className="relative group my-6 rounded-xl overflow-hidden border border-white/10 shadow-2xl animate-fade-in ring-1 ring-white/5">
          {/* Header bar - clean, no dots */}
          <div className="bg-[#1e293b] px-4 py-2.5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              {isTerminal ? <Terminal size={14} className="text-primary-400" /> : <Code size={14} className="text-slate-400" />}
              <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
                {match ? match[1] : 'text'}
              </span>
            </div>
            <button 
              onClick={handleCopy}
              className="px-2 py-1 hover:bg-white/10 rounded-lg transition-all text-slate-400 hover:text-white flex items-center gap-2 active:scale-95"
              title="Copy code"
            >
              <span className="text-[10px] font-bold uppercase tracking-tight">{copied ? 'Copied!' : 'Copy'}</span>
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            </button>
          </div>
          {/* Code content */}
          <pre className="!m-0 bg-[#0d1117] p-5 overflow-x-auto text-sm leading-relaxed custom-scrollbar">
            <code className={`${className} font-mono block text-slate-300 antialiased`} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code className="bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded-md text-[0.9em] font-mono font-semibold" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full glass-card rounded-none overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 animate-pop-in border border-white/40 dark:border-white/10 relative">
      
      {/* Header */}
      <div className="shrink-0 p-4 md:p-5 border-b border-white/40 dark:border-white/10 bg-white/40 dark:bg-slate-800/60 backdrop-blur-md flex items-center gap-3 z-10">
        <div className="bg-primary-100/80 dark:bg-primary-900/30 p-2 rounded-xl text-primary-600 dark:text-primary-400 backdrop-blur-sm shadow-sm ring-1 ring-white/20">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="font-bold text-base md:text-lg text-slate-800 dark:text-slate-100 leading-tight">AI Study Assistant</h2>
          <div className="flex items-center gap-1.5">
             <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
             <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-medium">Online & Ready to Help</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-6 md:space-y-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/30 scroll-smooth">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 dark:text-slate-500 space-y-6 opacity-90 animate-fade-in">
            <div className="w-24 h-24 bg-white/50 dark:bg-slate-800/50 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20">
                 <MessageCircle size={48} className="text-primary-400" />
            </div>
            <div className="space-y-2">
                <p className="text-xl md:text-2xl font-extrabold text-slate-700 dark:text-slate-200">Start a conversation!</p>
                <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto">I can help summarize notes, create quizzes, or answer questions.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full px-8">
               <button onClick={() => handleSuggestion("Summarize my notes for me")} className="text-xs md:text-sm bg-white/70 dark:bg-slate-800/70 border border-white/50 dark:border-white/10 px-4 py-3 rounded-xl hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all shadow-sm backdrop-blur-sm flex items-center gap-2 group text-left">
                   <Sparkles size={14} className="text-amber-500 group-hover:scale-110 transition-transform" />
                   Summarize my notes
               </button>
               <button onClick={() => handleSuggestion("Give me a study plan based on my quiz scores")} className="text-xs md:text-sm bg-white/70 dark:bg-slate-800/70 border border-white/50 dark:border-white/10 px-4 py-3 rounded-xl hover:border-primary-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white/90 dark:hover:bg-slate-700/90 transition-all shadow-sm backdrop-blur-sm flex items-center gap-2 group text-left">
                   <Sparkles size={14} className="text-purple-500 group-hover:scale-110 transition-transform" />
                   Improve quiz score
               </button>
            </div>
          </div>
        ) : (
          chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`
                w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center flex-shrink-0 backdrop-blur-sm shadow-sm border border-white/10
                ${msg.role === 'user' ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900' : 'bg-primary-100/80 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'}
              `}>
                {msg.role === 'user' ? <UserIcon size={16} /> : <Bot size={16} />}
              </div>
              
              <div className={`flex flex-col gap-2 max-w-[92%] md:max-w-[85%]`}>
                 {msg.attachment && (
                    <div className={`
                        p-2 rounded-2xl border border-white/50 dark:border-white/10 bg-white/60 dark:bg-slate-800/60 shadow-sm overflow-hidden backdrop-blur-sm
                        ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}
                    `}>
                        <img 
                            src={msg.attachment.data} 
                            alt="Attachment" 
                            className="max-h-60 rounded-lg object-contain bg-black/5" 
                        />
                    </div>
                 )}
                 {msg.text && (
                    <div className={`
                        px-5 py-4 md:p-6 rounded-2xl text-base md:text-lg leading-7 shadow-sm backdrop-blur-sm break-words
                        ${msg.role === 'user' 
                        ? 'bg-slate-800/90 dark:bg-white/90 text-white dark:text-slate-900 rounded-tr-none shadow-md' 
                        : 'bg-white/80 dark:bg-slate-800/80 border border-white/50 dark:border-white/10 text-slate-700 dark:text-slate-200 rounded-tl-none prose text-base md:text-lg dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100 max-w-full'
                        }
                        ${msg.attachment && msg.role === 'user' ? 'rounded-tr-2xl' : ''}
                    `}>
                        {msg.role === 'user' ? (
                        msg.text
                        ) : (
                        <ReactMarkdown
                            remarkPlugins={[remarkMath, remarkGfm]}
                            rehypePlugins={[rehypeKatex]}
                            components={MarkdownComponents}
                        >
                            {msg.text}
                        </ReactMarkdown>
                        )}
                    </div>
                 )}
                 <span className={`text-[10px] text-slate-400 px-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
              </div>
            </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex gap-3 animate-slide-up">
            <div className="w-8 h-8 rounded-full bg-primary-100/80 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
              <Bot size={16} />
            </div>
            <div className="bg-white/60 dark:bg-slate-800/60 border border-white/50 dark:border-white/10 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 backdrop-blur-sm">
              <Loader2 size={16} className="animate-spin text-primary-500" />
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachment && (
          <div className="absolute bottom-[80px] left-4 right-4 z-20 animate-slide-up">
             <div className="bg-white/90 dark:bg-slate-800/90 border border-white/20 dark:border-white/10 p-3 rounded-xl shadow-lg backdrop-blur-md flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 shrink-0 border border-slate-200 dark:border-slate-600">
                      <img src={attachment.data} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{attachment.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Image attached</p>
                  </div>
                  <button 
                    onClick={removeAttachment}
                    className="p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                      <X size={14} />
                  </button>
             </div>
          </div>
      )}

      {/* Input Area */}
      <div className="sticky bottom-0 left-0 right-0 shrink-0 p-3 md:p-4 bg-white/80 dark:bg-slate-800/80 border-t border-white/40 dark:border-white/10 backdrop-blur-lg z-40">
        <form onSubmit={handleSend} className="relative flex items-center gap-2 max-w-4xl mx-auto">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileSelect}
          />
          <button
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="shrink-0 w-10 h-10 md:w-11 md:h-11 flex items-center justify-center text-slate-500 hover:text-primary-600 hover:bg-white/80 dark:hover:bg-slate-700/80 rounded-xl transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-600 active:scale-95"
             title="Upload image"
          >
              <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={attachment ? "Ask about this image..." : "Type your question here..."}
                className="w-full pl-4 pr-12 py-4 md:py-4 rounded-xl bg-white dark:bg-slate-900/90 border border-white/60 dark:border-white/20 focus:outline-none focus:ring-2 focus:ring-primary-500/25 focus:border-primary-500 transition-all text-base md:text-lg font-semibold text-slate-800 dark:text-slate-200 placeholder:text-slate-400 shadow-inner"
                disabled={isLoading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {isLoading ? (
                    <div className="p-1.5">
                        <Loader2 size={18} className="animate-spin text-primary-500" />
                    </div>
                ) : (
                    <button
                        type="submit"
                        disabled={!input.trim() && !attachment}
                        className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition-all disabled:opacity-30 disabled:hover:bg-primary-600 shadow-lg active:scale-95"
                    >
                        <Send size={16} />
                    </button>
                )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;