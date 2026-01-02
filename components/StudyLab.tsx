import React, { useState, useRef } from 'react';
import { StudyContextType, FileData } from '../types';
import { Upload, X, FileText, Sparkles, Loader2, Image as ImageIcon, AlertCircle, Download, Plus, Copy, Check, Terminal, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { generateStudyNotes, generateFlashcards } from '../services/geminiService.ts';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

// Ensure html2canvas is available globally for jsPDF's html method if needed
(window as any).html2canvas = html2canvas;

interface StudyLabProps {
  context: StudyContextType;
}

const StudyLab: React.FC<StudyLabProps> = ({ context }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Fix: Add missing const declaration for fileInputRef
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { documents, addDocument, removeDocument, notes, setNotes, flashcards, setFlashcards } = context;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const MAX_FILES = 5;

  const processFile = (file: File) => {
    if (documents.length >= MAX_FILES) {
      setError(`Max ${MAX_FILES} files allowed. Remove a file before adding another.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        const base64 = e.target?.result as string;
        addDocument({
            name: file.name,
            type: file.type || 'application/octet-stream',
            data: base64
        });
        setError(null);
    };
    reader.onerror = (err) => {
        console.error('File read error', err);
        setError('Failed to read file. Try again.');
    };
    // For binary files (docx, pptx) read as DataURL too
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (documents.length + files.length > MAX_FILES) {
        setError(`Adding these files would exceed the max of ${MAX_FILES}. Remove some files first.`);
        return;
    }
    Array.from(files).slice(0, MAX_FILES - documents.length).forEach(f => processFile(f));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (documents.length + files.length > MAX_FILES) {
         setError(`Adding these files would exceed the max of ${MAX_FILES}. Remove some files first.`);
         return;
    }
    Array.from(files).slice(0, MAX_FILES - documents.length).forEach(f => processFile(f));
    // Clear the input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerateNotes = async () => {
    if (documents.length === 0) return;
    setIsGenerating(true);
    setError(null);
    try {
        const generatedNotes = await generateStudyNotes(documents);
        setNotes(generatedNotes);
        const newCards = await generateFlashcards(documents, generatedNotes, 0);
        setFlashcards(newCards);
    } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to generate study materials. Please check your connection and try again.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadNotesPDF = async () => {
      if (!notes) return;
      const element = document.getElementById('notes-content');
      if (!element) return;

      setIsDownloading(true);

      try {
          const doc = new jsPDF({
              orientation: 'portrait',
              unit: 'pt',
              format: 'a4'
          });

          const pdfContainer = document.createElement('div');
          pdfContainer.id = 'temp-pdf-container';
          
          Object.assign(pdfContainer.style, {
              position: 'absolute',
              top: '-10000px',
              left: '0',
              width: '800px',
              backgroundColor: '#ffffff',
              padding: '40px',
              visibility: 'visible',
              color: '#1a1a1a',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '14px',
              lineHeight: '1.6',
              letterSpacing: 'normal'
          });

          const headerHTML = `
            <div style="margin-bottom: 40px; border-bottom: 2px solid #6366f1; padding-bottom: 20px;">
               <div style="color: #6366f1; font-size: 14px; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 1px;">ScholarAI Study Guide</div>
               <h1 style="color: #1a1a1a; font-size: 32px; font-weight: 800; margin: 0; line-height: 1.2;">Study Notes</h1>
               <div style="color: #666666; font-size: 12px; margin-top: 8px;">Generated on ${new Date().toLocaleDateString()}</div>
            </div>
          `;
          
          const contentClone = element.cloneNode(true) as HTMLElement;
          
          const applyPrintStyles = (el: HTMLElement) => {
              const tag = el.tagName.toLowerCase();
              el.style.backgroundColor = 'transparent';
              el.style.boxShadow = 'none';
              el.style.maxWidth = 'none';
              el.style.width = 'auto';
              el.style.color = '#1a1a1a';
              el.style.height = 'auto';
              
              if (['h1', 'h2', 'h3', 'h4'].includes(tag)) {
                  el.style.pageBreakAfter = 'avoid';
                  el.style.pageBreakInside = 'avoid';
                  el.style.fontWeight = '700';
                  el.style.lineHeight = '1.3';
              }
              
              if (tag === 'h1') {
                  el.style.fontSize = '26px';
                  el.style.marginTop = '24px';
                  el.style.marginBottom = '16px';
              } else if (tag === 'h2') {
                  el.style.fontSize = '22px';
                  el.style.marginTop = '28px';
                  el.style.marginBottom = '14px';
                  el.style.borderBottom = '1px solid #e2e8f0';
              } else if (tag === 'p') {
                  el.style.fontSize = '12px';
                  el.style.lineHeight = '1.8';
                  el.style.marginBottom = '12px';
              } else if (tag === 'table') {
                  el.style.width = '100%';
                  el.style.borderCollapse = 'collapse';
              }

              Array.from(el.children).forEach(child => applyPrintStyles(child as HTMLElement));
          };

          applyPrintStyles(contentClone);

          pdfContainer.innerHTML = headerHTML;
          pdfContainer.appendChild(contentClone);
          document.body.appendChild(pdfContainer);

          const containerHeight = pdfContainer.scrollHeight;

          await doc.html(pdfContainer, {
              callback: function(pdf) {
                  pdf.save('ScholarAI_Study_Notes.pdf');
                  document.body.removeChild(pdfContainer);
                  setIsDownloading(false);
              },
              x: 0,
              y: 0,
              width: 595.28,
              windowWidth: 800,
              margin: [30, 30, 30, 30],
              autoPaging: 'text',
              html2canvas: {
                  scale: 0.74,
                  useCORS: true,
                  letterRendering: true,
                  scrollY: 0,
                  windowHeight: containerHeight + 100
              }
          });

      } catch (err) {
          console.error("PDF generation failed:", err);
          setError("Failed to generate PDF. Please try again.");
          setIsDownloading(false);
          const temp = document.getElementById('temp-pdf-container');
          if (temp) document.body.removeChild(temp);
      }
  };

  // Consistent Markdown components for code and terminal styling
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
          {/* Code content - updated text-white */}
          <pre className="!m-0 bg-[#0d1117] p-5 overflow-x-auto text-sm leading-relaxed custom-scrollbar">
            <code className={`${className} font-mono block text-white antialiased`} {...props}>
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
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2 animate-slide-up">
        <div>
            <h2 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Study Lab</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1 md:mt-2 text-sm md:text-base">Upload your materials and let AI organize your learning.</p>
        </div>
      </div>

      {error && (
        <div className="glass-panel bg-red-50/80 dark:bg-red-900/30 border-red-100 dark:border-red-900/50 rounded-xl p-4 flex items-start gap-3 animate-fade-in text-red-700 dark:text-red-300">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="flex-1">
                <p className="font-semibold text-sm">Action Failed</p>
                <p className="text-xs mt-1 opacity-90">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700 dark:hover:text-red-200 transition-colors">
                <X size={18} />
            </button>
        </div>
      )}

      {documents.length === 0 ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            // Fix: Use fileInputRef.current correctly
            onClick={() => fileInputRef.current?.click()}
            className={`
                border-3 border-dashed rounded-3xl p-8 md:p-16 text-center cursor-pointer transition-all duration-300
                glass-card animate-pop-in
                ${isDragging 
                    ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-900/20 scale-[0.99] shadow-inner' 
                    : 'border-slate-300/60 dark:border-slate-700/60 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-white/40 dark:hover:bg-slate-800/40 hover:-translate-y-1'
                }
            `}
          >
            <input 
                type="file" 
                // Attach the ref to the input element
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/epub+zip"
                multiple
                onChange={handleFileSelect}
            />
            <div className={`
                w-16 h-16 md:w-20 md:h-20 bg-primary-50/80 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm transition-transform duration-300
                ${isDragging ? 'scale-110' : ''}
            `}>
                <Upload size={32} className={isDragging ? 'animate-bounce' : ''} />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Drop your file here or click to upload</h3>
            <p className="text-sm md:text-base text-slate-500 dark:text-slate-400">Supports images, PDF, DOC/DOCX, PPT/PPTX, TXT, EPUB (up to 5 files)</p>
          </div>
      ) : (
        <div className="glass-card rounded-2xl p-6 animate-slide-up">
             <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Attached Documents</h3>
                 <span className="text-xs text-slate-400 dark:text-slate-500">{documents.length}/{MAX_FILES} files</span>
             </div>
             
             <div className="flex flex-col gap-4">
                {documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-white/50 dark:bg-slate-800/50 border border-white/50 dark:border-white/5 p-4 rounded-xl relative group hover:border-primary-200 dark:hover:border-primary-800 transition-colors shadow-sm">
                      <div className="p-3 bg-white/80 dark:bg-slate-700/80 rounded-lg shadow-sm text-red-500 border border-white/50 dark:border-white/5">
                              {doc.type.includes('image') ? <ImageIcon size={24} /> : <FileText size={24} />}
                      </div>
                      <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-700 dark:text-slate-200 truncate text-sm">{doc.name}</p>
                          <p className="text-xs text-slate-400">{doc.type || 'file'}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <a href={doc.data} download={doc.name} className="text-slate-400 hover:text-primary-600 text-xs">Download</a>
                        <button 
                            onClick={() => removeDocument(idx)}
                            className="w-8 h-8 rounded-full bg-slate-200/50 dark:bg-slate-700/50 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 dark:hover:text-red-400 flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove document"
                        >
                            <X size={16} />
                        </button>
                      </div>
                  </div>
                ))}

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/40 dark:border-white/10 pt-4 mt-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400 italic hidden sm:block">
                        {notes ? "Materials ready. Click update to regenerate everything." : "Generate study guide and flashcards in one click"}
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm text-slate-500 hover:text-primary-600 px-3 py-2 rounded-lg border border-white/20">Upload more</button>
                        <button 
                            onClick={handleGenerateNotes}
                            disabled={isGenerating}
                            className="w-full sm:w-auto bg-primary-600/90 hover:bg-primary-700/90 backdrop-blur-sm text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-70 hover:-translate-y-0.5 border border-white/20 active:scale-95"
                        >
                            {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {isGenerating ? "Generating Notes & Flashcards..." : (notes ? "Update Materials" : "Generate All Study Materials")}
                        </button>
                    </div>
                </div>
             </div>
        </div>
      )}

      {notes && (
          <div className="glass-card rounded-3xl overflow-hidden animate-slide-up stagger-2">
              <div className="border-b border-white/40 dark:border-white/10 bg-white/30 dark:bg-slate-800/50 backdrop-blur-md p-4 md:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Sparkles size={18} className="text-primary-600 dark:text-primary-400" />
                        AI Generated Study Guide
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Comprehensive analysis of your materials</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
                       <button
                        onClick={handleCopy}
                        className="flex items-center gap-2 bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-600/80 text-slate-700 dark:text-slate-200 text-xs md:text-sm font-medium px-3 py-2 rounded-lg transition-colors border border-white/50 dark:border-white/10 shadow-sm active:scale-95 flex-1 md:flex-none justify-center"
                        title="Copy raw markdown"
                      >
                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                        {copied ? 'Copied' : 'Copy'}
                      </button>

                      <button 
                        onClick={downloadNotesPDF}
                        disabled={isDownloading}
                        className="flex items-center gap-2 bg-white/50 dark:bg-slate-700/50 hover:bg-white/80 dark:hover:bg-slate-600/80 text-slate-700 dark:text-slate-200 text-xs md:text-sm font-medium px-3 py-2 rounded-lg transition-colors border border-white/50 dark:border-white/10 shadow-sm disabled:opacity-50 active:scale-95 flex-1 md:flex-none justify-center"
                      >
                          {isDownloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                          {isDownloading ? 'Saving...' : 'PDF'}
                      </button>
                      
                      <button 
                        onClick={() => { setNotes(''); setFlashcards([]); }} 
                        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 text-xs md:text-sm font-medium transition-colors px-2"
                      >
                        Clear All
                      </button>
                  </div>
              </div>
              <div className="p-6 md:p-10 bg-white/40 dark:bg-slate-900/40">
                  <div 
                    id="notes-content" 
                    className="markdown-content max-w-none prose prose-slate dark:prose-invert prose-headings:font-bold prose-headings:text-slate-800 dark:prose-headings:text-slate-100 prose-p:text-slate-600 dark:prose-p:text-slate-300 bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-white/50 dark:border-white/5"
                  >
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={MarkdownComponents}
                      >
                        {notes}
                      </ReactMarkdown>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudyLab;
