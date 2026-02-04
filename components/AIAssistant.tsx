import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { COLORS } from '../constants';

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'ai', content: string}[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history from localStorage on mount (Private to the user's device)
  useEffect(() => {
    const savedHistory = localStorage.getItem('bengal_ai_history');
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to load AI history", e);
      }
    }
  }, []);

  // Save history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('bengal_ai_history', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const clearHistory = () => {
    if (window.confirm("Clear your private chat history?")) {
      setMessages([]);
      localStorage.removeItem('bengal_ai_history');
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = input;
    const newMessages = [...messages, { role: 'user' as const, content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    try {
      // Initialize Gemini API client with the API key from environment variables
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Construct conversation history for the API, mapping 'ai' role to 'model' as required by Gemini
      const conversation = newMessages.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: conversation,
        config: {
          systemInstruction: "You are the Bengal Welding Assistant. Help customers with commercial kitchen equipment inquiries, maintenance schedules, and fabrication terminology. Keep answers concise and professional. The products we offer are Cookers, Extraction Hoods, Grease Cleaning Plans, Hot Cupboards, Stockpots, and Table/Gantry units.",
        },
      });
      
      // Access text directly from the response object
      const aiText = response.text || "I'm sorry, I couldn't process that. Please contact our support team.";
      setMessages([...newMessages, { role: 'ai' as const, content: aiText }]);
    } catch (error) {
      console.error(error);
      setMessages([...newMessages, { role: 'ai' as const, content: "Error connecting to AI service. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-[100]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ backgroundColor: COLORS.primary }}
        className="w-14 h-14 text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95"
      >
        <i className={`fas ${isOpen ? 'fa-times' : 'fa-comment-dots'} text-2xl`}></i>
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-[90vw] md:w-96 bg-[#111111] rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-[#333333] overflow-hidden flex flex-col max-h-[70vh] animate-in slide-in-from-bottom-5 fade-in">
          <header className="bg-black p-4 text-white flex items-center justify-between border-b border-[#333333]">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#F2C200]">
                <i className="fas fa-robot text-sm text-black"></i>
              </div>
              <div>
                <p className="font-bold text-sm text-[#F2C200]">Service Assistant</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter font-black">Private Session</p>
              </div>
            </div>
            {messages.length > 0 && (
              <button onClick={clearHistory} className="text-gray-500 hover:text-red-400 transition-colors px-2">
                <i className="fas fa-trash-alt text-xs"></i>
              </button>
            )}
          </header>

          <div ref={scrollRef} className="flex-grow overflow-y-auto p-4 space-y-4 bg-black/40">
            {messages.length === 0 && (
              <div className="text-center py-10 text-gray-500 px-6">
                <i className="fas fa-sparkles text-2xl mb-2 text-[#F2C200]"></i>
                <p className="text-sm font-medium">Ask me about cooker maintenance, hood cleaning plans, or our custom table designs!</p>
                <p className="text-[10px] mt-4 opacity-50 uppercase tracking-widest font-black">Secure Local Storage</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  m.role === 'user' 
                    ? 'text-black rounded-tr-none shadow-md font-bold' 
                    : 'bg-[#1A1A1A] text-white shadow-inner border border-[#333333] rounded-tl-none font-medium'
                }`}
                style={m.role === 'user' ? { backgroundColor: COLORS.primary } : {}}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-[#1A1A1A] p-3 rounded-2xl shadow-sm border border-[#333333] flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-[#F2C200] rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-[#F2C200] rounded-full animate-bounce delay-100"></div>
                  <div className="w-1.5 h-1.5 bg-[#F2C200] rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[#333333] bg-[#111111] flex items-center space-x-2">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your message..."
              className="flex-grow px-4 py-2 bg-black border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#F2C200]"
              style={{ caretColor: COLORS.primary }}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="w-10 h-10 text-black rounded-full flex items-center justify-center disabled:opacity-50 transition-opacity bg-[#F2C200] hover:brightness-110 shadow-lg shadow-[#F2C2001A]"
            >
              <i className="fas fa-paper-plane text-xs"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;