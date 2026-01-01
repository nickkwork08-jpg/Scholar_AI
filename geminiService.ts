import { GoogleGenAI, Type } from "@google/genai";
import { FileData, Flashcard, QuizQuestion, QuizDifficulty, QuizResult, ChatMessage } from "../types";

// ===============================================================
// 🔑 API KEY ROTATION (FRONTEND + Vite)
// ===============================================================

// Support both Vite's `import.meta.env` and Node `process.env`.
const apiKeys = (() => {
  const im = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
  const candidates = [
    im?.VITE_API_KEY_1,
    im?.VITE_API_KEY_2,
    im?.VITE_API_KEY_3,
    im?.VITE_API_KEY_4,
    im?.VITE_API_KEY_5,
    process.env.API_KEY,
    process.env.API_KEY_2,
    process.env.API_KEY_3,
    process.env.API_KEY_4,
    process.env.API_KEY_5
  ];
  
  // Filter out undefined/null and remove duplicates
  const validKeys = candidates.filter((k) => !!k && typeof k === 'string' && k.trim().length > 0) as string[];
  return [...new Set(validKeys)];
})();

if (apiKeys.length === 0) {
  console.error("❌ No Gemini API keys found in environment (.env / .env.local)");
}

let currentIndex = 0;

// Diagnostic helper (exported for tests)
export const _getDiagnosticState = () => ({ apiKeys: [...apiKeys], currentIndex, useServerProxy });

// Helper to get the next AI client in rotation
const useServerProxy = apiKeys.length === 0;

// TEST HELPER: choose key (returns null if using server proxy)
export const _chooseKeyForTest = () => {
  if (useServerProxy) return null;
  const key = apiKeys[currentIndex];
  if (apiKeys.length > 1) currentIndex = (currentIndex + 1) % apiKeys.length;
  return key;
};

// If no client-side keys are available, we'll proxy requests to the server-side endpoint
const getAIClient = () => {
  if (useServerProxy) {
    // Return an adapter with the same subset API used by frontend code
    return {
      models: {
        generateContent: async (opts: any) => {
          const res = await fetch('/api/ai/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(opts)
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Server AI proxy failed');
          }
          const data = await res.json();
          return { text: data.text, raw: data.raw };
        }
      }
    } as any;
  }

  if (apiKeys.length === 0) {
    throw new Error("No Gemini API keys configured. Please set VITE_API_KEY_1..5 in your .env.local or configure a server GEMINI_API_KEY.");
  }

  const key = apiKeys[currentIndex];
  
  if (apiKeys.length > 1) {
    console.log(`[GeminiService] Rotating Key: Using index ${currentIndex} (Total keys: ${apiKeys.length})`);
    // Rotate index for the next call (Round Robin)
    currentIndex = (currentIndex + 1) % apiKeys.length;
  }

  return new GoogleGenAI({ apiKey: key });
};

// --- Helper Functions ---

// Helper to convert FileData to the format expected by the SDK (inlineData)
const fileToPart = (file: FileData) => {
  return {
    inlineData: {
      mimeType: file.type,
      data: file.data.split(',')[1] // Strip the data URL prefix (e.g., "data:image/png;base64,")
    }
  };
};

// --- Service Functions ---

export const generateStudyNotes = async (files: FileData[]): Promise<string> => {
  const ai = getAIClient();
  const model = "gemini-2.5-flash";
  const systemInstruction = `
    You are an expert academic tutor. Analyze the provided study material and create a "Study Guide".
    
    STRICT LAYOUT TEMPLATE (Markdown):

    # [Title of Topic]

    ## 📝 Overview
    [Short, friendly introduction (3–5 sentences). Explain what the topic covers and why it's important.]

    ## 🔑 Key Concepts

    ### 1. [Concept Name]
    * **Definition**: [Clear definition]
    * **Explanation**: [Short explanation]
    * **Why it matters**: [Context]
    
    > 💡 **Example**: [Practical real-world example in 1-3 lines]

    ### 2. [Next Concept]
    * **What it is**: [Description]
    * **Key Details**: [Bullets]
    
    > 💬 **Quick Tip**: [Helpful tip or reminder]

    (Repeat pattern for other concepts)

    ## 🧠 Summary & Takeaways
    * [Bullet point 1]
    * [Bullet point 2]
    * [Bullet point 3]

    RULES:
    Title
    - Executive Overview.
    - Detailed Topic Breakdown (Exhaustive).
    - Master Glossary (Headers and Bullets).
    - Critical Nuances.
    -  Big Picture Summary.
    - High-Retention Practice.
    - Use ONLY Markdown formatting.
    - No raw HTML tags.
    - Use LaTeX for math ($E=mc^2$).
    - Do not use code blocks unless strictly necessary for programming code.
    - Keep output clean, structured, and PDF-friendly.
  `;

  // Prepare contents: Text prompt + file parts
  const parts: any[] = [{ text: "Here is the study material. Please generate detailed, easy-to-understand notes following the strict layout." }];
  files.forEach(file => parts.push(fileToPart(file)));

  try {
    const response = await ai.models.generateContent({
      model,
      config: { systemInstruction },
      contents: { parts }
    });
    
    return response.text || "No notes generated.";
  } catch (error) {
    console.error("Error generating notes:", error);
    throw error;
  }
};
// generatePracticePaper has been removed as the Practice Paper feature was deprecated/removed.
// If needed in the future, re-implement a focused generator with clear limits and safeguards.

export const generateFlashcards = async (files: FileData[], notesContext: string, currentCount: number): Promise<Flashcard[]> => {
  const ai = getAIClient();
  const model = "gemini-2.5-flash";
  
  // Define Schema for reliable JSON
  const schema = {
    type: Type.OBJECT,
    properties: {
      flashcards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["question", "answer"]
        }
      }
    },
    required: ["flashcards"]
  };

  const systemInstruction = `
    You are an AI tutor. Generate 15-20 flashcards for studying based on the content provided.
    Focus on key concepts, definitions, and important facts.
    Keep the Question concise.
    Keep the Answer clear and direct.
  `;

  const userPrompt = `
    Context from notes: ${notesContext ? notesContext.substring(0, 5000) : "None"}
    Please analyze the attached files (if any) and the context to generate flashcards.
  `;

  const parts: any[] = [{ text: userPrompt }];
  files.forEach(file => parts.push(fileToPart(file)));

  try {
    const response = await ai.models.generateContent({
      model,
      config: { 
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      },
      contents: { parts }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonStr);
    const cards = parsed.flashcards;

    if (!Array.isArray(cards)) throw new Error("Invalid JSON format");

    return cards.map((item: any, index: number) => ({
      id: currentCount + index + 1,
      question: item.question,
      answer: item.answer,
      isLearned: false
    }));
  } catch (error) {
    console.error("Error generating flashcards:", error);
    throw error;
  }
};

export const generateQuiz = async (
    files: FileData[], 
    notesContext: string, 
    difficulty: QuizDifficulty
): Promise<QuizQuestion[]> => {
  const ai = getAIClient();
  const model = "gemini-2.5-flash";

  const schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: 4, maxItems: 4 },
            correctAnswerIndex: { type: Type.INTEGER }
          },
          required: ["question", "options", "correctAnswerIndex"]
        }
      }
    },
    required: ["questions"]
      
  };

  const systemInstruction = `
    Create a ${difficulty} difficulty multiple-choice quiz with 15-20 questions based on the provided material.
    
    For 'Easy': Focus on definitions and basic recall.
    For 'Medium': Focus on understanding and application.
    For 'Hard': Focus on analysis and complex scenarios.
  `;

  const userPrompt = `
    Context: ${notesContext ? notesContext.substring(0, 5000) : "None"}
    Generate the quiz JSON based on the context and the files attached.
  `;

  const parts: any[] = [{ text: userPrompt }];
  files.forEach(file => parts.push(fileToPart(file)));

  try {
    const response = await ai.models.generateContent({
      model,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      },
      contents: { parts }
    });

    const jsonStr = response.text;
    if (!jsonStr) throw new Error("Empty response from AI");

    const parsed = JSON.parse(jsonStr);
    const questions = parsed.questions;

    if (!Array.isArray(questions)) throw new Error("Invalid JSON format");

    return questions.map((item: any, index: number) => ({
      id: index + 1,
      question: item.question,
      options: item.options,
      correctAnswerIndex: item.correctAnswerIndex
    }));
  } catch (error) {
    console.error("Error generating quiz:", error);
    throw error;
  }
};

export const getMotivationalMessage = async (score: number, total: number): Promise<string> => {
    const ai = getAIClient();
    const percentage = (score / total) * 100;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                systemInstruction: "You are a supportive study coach. Keep messages short (max 2 sentences).",
            },
            contents: { parts: [{ text: `A student scored ${score} out of ${total} (${Math.round(percentage)}%). Give a message based on this score (Low < 60%, Med 60-85%, High > 85%).` }] }
        });
        return response.text || "Keep learning, you're doing great!";
    } catch (e) {
        return "Keep learning, you're doing great!";
    }
}

export const getChatResponse = async (
  message: string,
  history: ChatMessage[],
  context: {
    notes: string;
    flashcards: Flashcard[];
    quizResults: QuizResult[];
  },
  attachment?: FileData
): Promise<string> => {
  const ai = getAIClient();
  const model = "gemini-2.5-flash";

  // Prepare context summary
  const notesContext = context.notes 
    ? `Study Notes Content:\n${context.notes.slice(0, 10000)}` 
    : "No study notes generated yet.";
    
  const flashcardsContext = context.flashcards.length > 0
    ? `Flashcards Sample:\n${context.flashcards.slice(0, 5).map(f => `Q: ${f.question} A: ${f.answer}`).join('\n')}`
    : "No flashcards generated.";

  const quizContext = context.quizResults.length > 0
    ? `Recent Quiz Results:\n${context.quizResults.map(r => `Score: ${r.score}/${r.total}`).join('\n')}`
    : "No quizzes taken.";

  const systemInstruction = `
    You are ScholarAI, an enthusiastic and friendly study companion using the Google Gemini API.

    IDENTITY:
    If asked about your identity, who made you, or your developer, you MUST answer: "I am Scholar AI trained by Google and developed by Kronstadt."
    (Maintain this persona strictly).
    
    CONTEXT:
    ${notesContext}
    ${flashcardsContext}
    ${quizContext}
    
    GOAL:
    Help the student learn by answering questions about their notes, clarifying concepts, 
    offering study tips based on their performance, and being supportive.
    
    INSTRUCTIONS:
    - Use Markdown for general formatting.
    - **Mathematical Formulas**: Use LaTeX syntax. 
      - Wrap inline equations in single dollar signs (e.g. $E=mc^2$).
      - Wrap block equations in double dollar signs (e.g. $$...$$).
      - Do NOT put spaces between the dollar signs and the formula.
  `;

  // Construct history for the SDK
  // We need to map our ChatMessage objects to the structure expected by contents
  const pastContents = history
    .filter(h => h.role === 'user' || h.role === 'model') 
    .map(h => {
        const parts: any[] = [{ text: h.text }];
        // If the history message had an attachment, add it as a part
        if (h.attachment && h.role === 'user') {
            parts.push(fileToPart(h.attachment));
        }
        return {
            role: h.role,
            parts: parts
        };
    });

  // Construct current user content
  const currentParts: any[] = [{ text: message }];
  if (attachment) {
      currentParts.push(fileToPart(attachment));
  }

  // Combine history + current
  // Note: generateContent accepts 'contents' as a list of Content objects for multi-turn
  const contents = [...pastContents, { role: 'user', parts: currentParts }];

  try {
    const response = await ai.models.generateContent({
      model,
      config: { systemInstruction },
      contents: contents
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Chat error:", error);
    throw error;
  }
};