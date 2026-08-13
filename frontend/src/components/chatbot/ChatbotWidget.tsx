import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  MessageSquareCode, BrainCircuit, Sparkles, X, Send, Mic, MicOff, Volume2, VolumeX, Maximize2, Minimize2, 
  Trash2, Copy, Check, ThumbsUp, ThumbsDown, BookOpen, Layers, Zap, ChevronDown, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { askChatbot, getChatSuggestions, ChatMessage } from './ChatbotService';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../utils';

export default function ChatbotWidget() {
  const location = useLocation();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('crismatech_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isTtsActive, setIsTtsActive] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initial welcome message if no history exists
  useEffect(() => {
    if (messages.length === 0 && user) {
      const welcomeMsg: ChatMessage = {
        id: 'welcome-1',
        sender: 'ai',
        text: `Hello **${user.name}**! I'm your **Crismatech AI Assistant**.\n\nHow can I help your learning today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ragEngine: 'Crismatech AI'
      };
      setMessages([welcomeMsg]);
    }
  }, [user]);

  // Save history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('crismatech_ai_chat_history', JSON.stringify(messages.slice(-30)));
    }
  }, [messages]);

  // Load page-aware suggestions
  useEffect(() => {
    getChatSuggestions(location.pathname).then(setSuggestions);
  }, [location.pathname]);

  // Auto-scroll on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Global hotkey: Alt + C or Cmd/Ctrl + K to open chatbot
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 'c') || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await askChatbot(query, selectedCourseId || undefined, messages);
      
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.answer,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citedSources: res.citedSources,
        ragEngine: res.ragEngine,
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Voice read-out if TTS is enabled
      if (isTtsActive && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(res.answer.replace(/[*#`_]/g, ''));
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'ai',
        text: `**Connection Error**: ${error.message || 'Failed to reach AI assistant service. Please verify server connection.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    localStorage.removeItem('crismatech_ai_chat_history');
    setMessages([
      {
        id: 'welcome-reset',
        sender: 'ai',
        text: `Chat history cleared. How can I assist you now?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const handleCopyCode = (codeText: string, msgId: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (msgId: string, type: 'like' | 'dislike') => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, feedback: m.feedback === type ? null : type } : m))
    );
  };

  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // Render markdown formatting cleanly
  const renderMessageContent = (msg: ChatMessage) => {
    const parts = msg.text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const language = lines[0].match(/^[a-zA-Z0-9_-]+$/) ? lines[0] : 'code';
        const codeContent = language !== 'code' ? lines.slice(1).join('\n') : lines.join('\n');
        const copyKey = `${msg.id}-${index}`;

        return (
          <div key={index} className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#09061d] shadow-xl">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-slate-400 font-mono">
              <span className="uppercase tracking-wider font-bold text-brand-purple">{language}</span>
              <button
                onClick={() => handleCopyCode(codeContent, copyKey)}
                className="flex items-center gap-1.5 text-slate-300 hover:text-white transition-colors"
              >
                {copiedId === copyKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === copyKey ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs text-emerald-300 font-mono leading-relaxed custom-scrollbar">
              <code>{codeContent}</code>
            </pre>
          </div>
        );
      }

      // Format bold, lists, headers
      const formattedLines = part.split('\n').map((line, lIdx) => {
        let lineContent = line;
        
        // Headers
        if (lineContent.startsWith('### ')) {
          return <h4 key={lIdx} className="text-base font-bold text-white mt-2 mb-1">{lineContent.replace('### ', '')}</h4>;
        }
        if (lineContent.startsWith('## ')) {
          return <h3 key={lIdx} className="text-lg font-bold text-white mt-3 mb-1">{lineContent.replace('## ', '')}</h3>;
        }

        // Bullet points
        const isBullet = lineContent.trim().startsWith('* ') || lineContent.trim().startsWith('- ');
        if (isBullet) {
          lineContent = lineContent.trim().replace(/^[*\-]\s+/, '');
        }

        // Process bold text (**text**)
        const chunks = lineContent.split(/(\*\*.*?\*\*)/g).map((chunk, cIdx) => {
          if (chunk.startsWith('**') && chunk.endsWith('**')) {
            return <strong key={cIdx} className="font-bold text-white">{chunk.slice(2, -2)}</strong>;
          }
          return chunk;
        });

        return (
          <p key={lIdx} className={cn("leading-relaxed", isBullet ? "pl-4 relative before:content-['•'] before:absolute before:left-1 before:text-brand-purple" : "mb-1.5")}>
            {chunks}
          </p>
        );
      });

      return <div key={index}>{formattedLines}</div>;
    });
  };

  return (
    <>
      {/* Floating Launcher Button */}
      <motion.div 
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple via-indigo-600 to-brand-blue text-white shadow-2xl glow-shadow hover:scale-105 active:scale-95 transition-transform duration-300"
          title="Open AI Assistant (Alt + C)"
        >
          <div className="absolute inset-0 rounded-2xl bg-brand-purple/40 blur-lg group-hover:blur-xl transition-all" />
          {isOpen ? (
            <X className="w-6 h-6 relative z-10" />
          ) : (
            <MessageSquareCode className="w-7 h-7 relative z-10 group-hover:rotate-12 transition-transform duration-300" />
          )}

          {/* Pulse ring indicator */}
          <span className="absolute top-1 right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
        </button>
      </motion.div>

      {/* Main Chatbot Panel Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn(
              "fixed z-50 glass-panel border border-brand-purple/20 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 backdrop-blur-2xl bg-[#07041a]/95 rounded-3xl",
              isExpanded 
                ? "inset-4 md:inset-8 w-auto h-auto" 
                : "bottom-24 right-4 md:right-6 w-[92vw] sm:w-[440px] h-[640px] max-h-[82vh]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-purple to-brand-blue flex items-center justify-center text-white shadow-md glow-shadow">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base leading-none">Crismatech AI</h3>
                </div>
              </div>

              <div className="flex items-center gap-1 text-slate-400">
                {/* TTS Toggle */}
                <button
                  onClick={() => {
                    setIsTtsActive(!isTtsActive);
                    if (isTtsActive && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                  }}
                  className={cn(
                    "p-2 rounded-xl hover:bg-white/10 transition-colors",
                    isTtsActive ? "text-brand-purple bg-brand-purple/10" : "hover:text-white"
                  )}
                  title={isTtsActive ? "Mute Voice Read-out" : "Enable Voice Read-out"}
                >
                  {isTtsActive ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>

                {/* Clear Chat */}
                <button
                  onClick={handleClearHistory}
                  className="p-2 rounded-xl hover:bg-white/10 hover:text-rose-400 transition-colors"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* Expand / Minimize Toggle */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors hidden sm:flex"
                  title={isExpanded ? "Restore View" : "Expand Hub View"}
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-xl hover:bg-white/10 hover:text-white transition-colors"
                  title="Close Assistant"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-3 text-sm",
                    msg.sender === 'user' ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {msg.sender === 'ai' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-purple to-indigo-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-md">
                      <BrainCircuit className="w-4 h-4 text-purple-200" />
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl p-4 shadow-md",
                      msg.sender === 'user'
                        ? "bg-gradient-to-r from-brand-purple to-indigo-600 text-white rounded-tr-xs"
                        : "bg-white/5 border border-white/10 text-slate-200 rounded-tl-xs backdrop-blur-md"
                    )}
                  >
                    {renderMessageContent(msg)}

                    {/* Cited Sources Badge */}
                    {msg.sender === 'ai' && msg.citedSources && msg.citedSources.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Context Sources:</span>
                        {msg.citedSources.map((src, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-purple/15 text-brand-purple border border-brand-purple/20 text-[10px] font-semibold"
                          >
                            <BookOpen className="w-2.5 h-2.5" />
                            {src.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Footer bar for AI message */}
                    {msg.sender === 'ai' && (
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="text-[10px] font-medium opacity-70">
                          {msg.timestamp}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleFeedback(msg.id, 'like')}
                            className={cn(
                              "p-1 rounded hover:bg-white/10 transition-colors",
                              msg.feedback === 'like' && "text-emerald-400 font-bold"
                            )}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleFeedback(msg.id, 'dislike')}
                            className={cn(
                              "p-1 rounded hover:bg-white/10 transition-colors",
                              msg.feedback === 'dislike' && "text-rose-400 font-bold"
                            )}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}

              {/* Loading Indicator */}
              {loading && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 text-slate-400 text-sm"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-purple/20 flex items-center justify-center text-brand-purple animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl">
                    <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-brand-purple animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-slate-400 font-medium ml-2">Retrieving portal context & generating...</span>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Dynamic Suggestion Chips */}
            {suggestions.length > 0 && (
              <div className="px-4 py-2 border-t border-white/5 bg-white/[0.02] flex gap-2 overflow-x-auto custom-scrollbar">
                {suggestions.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    disabled={loading}
                    className="whitespace-nowrap px-3 py-1.5 rounded-xl bg-white/5 hover:bg-brand-purple/20 hover:text-white border border-white/10 hover:border-brand-purple/30 text-slate-300 text-xs font-medium transition-all shrink-0"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* Input Box Area */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                {/* Voice Input */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={cn(
                    "p-3 rounded-2xl transition-all",
                    isListening
                      ? "bg-rose-500 text-white animate-pulse"
                      : "bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/10"
                  )}
                  title={isListening ? "Listening... Speak now" : "Voice Input"}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything about courses, assignments, code, attendance..."
                  disabled={loading}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-purple/60 transition-all font-medium"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="p-3 rounded-2xl bg-gradient-to-r from-brand-purple to-indigo-600 text-white shadow-lg glow-shadow hover:scale-105 active:scale-95 disabled:opacity-40 disabled:hover:scale-100 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500 font-medium">
                <span>Press <strong>Alt + C</strong> or <strong>Ctrl + K</strong> to toggle</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
