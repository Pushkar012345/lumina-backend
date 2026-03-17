import { useState, useEffect } from 'react';
import axios from 'axios';
import { Sparkles, BookOpen, Brain, Clock, Trash2, Download, Plus, ShieldCheck, Copy, CheckCircle2, Moon, Sun, Maximize2, Minimize2, Volume2, Highlighter, Menu, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import jsPDF from 'jspdf';
import { SignedIn, SignedOut, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { Helmet, HelmetProvider } from 'react-helmet-async';

const SkeletonLoader = () => (
  <div className="space-y-8 animate-pulse p-4 md:p-8">
    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
    <div className="space-y-3">
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
    </div>
  </div>
);

function App() {
  const { user, isLoaded } = useUser();
  const [topic, setTopic] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [flippedCards, setFlippedCards] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [quizResults, setQuizResults] = useState({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const renderSummary = (content) => {
    if (!content) return "";
    let text = "";
    if (typeof content === 'string') {
      try {
        const parsed = JSON.parse(content);
        text = parsed.summary || parsed.content || parsed.description || content;
      } catch (e) { text = content; }
    } else {
      text = content.summary || content.content || content.description || JSON.stringify(content);
    }
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/([a-z0-9])\n(##|#)/gi, '$1\n\n$2') 
      .replace(/([a-z0-9])\n(\*|\d\.)/gi, '$1\n\n$2');
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`https://lumina-backend-4zad.onrender.com/api/history?userId=${user.id}`); 
      setHistory(res.data);
    } catch (err) { console.error("History fetch error:", err); }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this study session?")) return;
    try {
      await axios.delete(`https://lumina-backend-4zad.onrender.com/api/history/${id}`); // ✅ Live URL
      if (data?._id === id) setData(null);
      fetchHistory();
    } catch (err) {
      console.error("Delete error:", err);
      alert("Failed to delete the item.");
    }
  };

  useEffect(() => {
    if (isLoaded && user) fetchHistory();
  }, [isLoaded, user]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!topic) return;
    setData(null);
    setLoading(true);
    setQuizResults({});
    setIsSidebarOpen(false);
    try {
      const res = await axios.post('https://lumina-backend-4zad.onrender.com/api/generate', { topic, userId: user.id });
      setData(res.data);
      fetchHistory();
    } catch (err) { 
      console.error(err);
      alert("Check your backend server!"); 
    } finally { setLoading(false); }
  };

  const toggleFlip = (idx) => setFlippedCards(prev => ({ ...prev, [idx]: !prev[idx] }));
  
  const downloadPDF = () => {
    const pdf = new jsPDF();
    const cleanText = renderSummary(data.summary).replace(/[#*]/g, '');
    const splitText = pdf.splitTextToSize(cleanText, 180);
    pdf.text(splitText, 10, 10);
    pdf.save(`${data.topic}-study-guide.pdf`);
  };

  return (
    <HelmetProvider>
      <div className={`flex flex-col min-h-screen transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <Helmet>
          <title>{data?.topic ? `${data.topic} | Lumina AI` : "Lumina AI - Personalized Study Guide"}</title>
          <meta name="description" content={data?.topic ? `Master ${data.topic} with AI-generated summaries.` : "Generate smart study materials instantly."} />
        </Helmet>

        {/* MOBILE HEADER WITH NAME */}
        <div className={`md:hidden flex items-center justify-between p-4 border-b ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Brain className="text-blue-500" size={20} />
              <span className="font-bold text-lg leading-tight">Lumina AI</span>
            </div>
            <span className="text-[10px] font-bold text-blue-600/70 ml-7 -mt-1 uppercase tracking-wider">By Pushkar Pawar</span>
          </div>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
          <SignedIn>
            {!focusMode && (
              <>
                {isSidebarOpen && (
                  <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
                )}
                
                <aside className={`
                  fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
                  ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                  md:relative md:translate-x-0
                  border-r p-4 flex flex-col ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}
                `}>
                  {/* DESKTOP HEADER WITH NAME */}
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Brain className="text-blue-500" />
                        <h1 className="font-bold text-xl">Lumina AI</h1>
                      </div>
                      <p className="text-[10px] font-bold text-blue-500/70 uppercase tracking-tighter ml-8">
                        Built by Pushkar Pawar
                      </p>
                    </div>
                    <UserButton />
                  </div>
                  
                  <button onClick={() => {setData(null); setTopic(''); setIsSidebarOpen(false);}} className="w-full flex items-center justify-center gap-2 p-3 bg-blue-600 text-white rounded-xl mb-4 hover:bg-blue-700 transition shadow-lg">
                    <Plus size={18} /> New Study
                  </button>

                  <div className="flex-1 overflow-y-auto space-y-2">
                    <p className="text-xs font-bold text-slate-400 uppercase px-2 mb-2">History</p>
                    {history.length > 0 ? (
                      history.map((item) => (
                        <div 
                          key={item._id} 
                          onClick={() => { setData(item); setIsSidebarOpen(false); }} 
                          className={`group flex items-center justify-between p-2 text-sm rounded-lg cursor-pointer transition-all ${data?._id === item._id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-blue-500/10'}`}
                        >
                          <span className="truncate flex-1">{item.topic.replace(/\*\*/g, '')}</span>
                          <button onClick={(e) => handleDelete(e, item._id)} className={`p-1 rounded-md transition-colors ${data?._id === item._id ? 'hover:bg-blue-700 text-white' : 'hover:bg-red-100 text-red-500 md:opacity-0 group-hover:opacity-100'}`}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500 italic px-2">No history yet</p>
                    )}
                  </div>
                </aside>
              </>
            )}

            <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
              <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-2 z-10">
                <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">{darkMode ? <Sun size={18}/> : <Moon size={18}/>}</button>
                <button onClick={() => setFocusMode(!focusMode)} className="p-2 rounded-lg border bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hidden sm:block">{focusMode ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}</button>
              </div>

              {!data && !loading && (
                <div className="max-w-2xl mx-auto mt-10 md:mt-20 text-center px-2">
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">What are we studying today?</h2>
                  <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-2">
                    <input 
                      className={`flex-1 p-4 rounded-xl border-2 outline-none transition-all focus:border-blue-500 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}
                      placeholder="e.g. Quantum Physics..." 
                      value={topic} 
                      onChange={(e) => setTopic(e.target.value)} 
                    />
                    <button className="bg-blue-600 text-white px-6 py-4 sm:py-0 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg">Generate</button>
                  </form>
                </div>
              )}

              {loading && <SkeletonLoader />}

              {data && (
                <div className="max-w-4xl mx-auto space-y-6 md:space-y-8 pb-20 mt-8 sm:mt-0">
                  <div className={`p-4 md:p-8 rounded-2xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl md:text-2xl font-bold text-blue-500 capitalize">{data.topic.replace(/\*\*/g, '')}</h3>
                      <button onClick={downloadPDF} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"><Download size={18}/></button>
                    </div>
                    <div className={`prose prose-sm md:prose-base max-w-none ${darkMode ? 'prose-invert' : ''}`}>
                      <ReactMarkdown>{renderSummary(data.summary)}</ReactMarkdown>
                    </div>
                  </div>

                  {data.flashcards && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {data.flashcards.map((card, i) => (
                        <div key={i} onClick={() => toggleFlip(i)} className={`min-h-[160px] cursor-pointer p-6 rounded-xl border flex flex-col justify-center text-center transition-all duration-300 ${flippedCards[i] ? 'bg-blue-600 text-white shadow-blue-500/20' : (darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white shadow-sm hover:shadow-md')}`}>
                          <div className={`prose prose-sm max-w-none ${flippedCards[i] ? 'prose-invert' : (darkMode ? 'prose-invert' : '')}`}>
                            <ReactMarkdown>{flippedCards[i] ? card.answer : card.question}</ReactMarkdown>
                          </div>
                          <p className="text-[10px] mt-4 opacity-50 uppercase tracking-widest font-bold">{flippedCards[i] ? 'Answer' : 'Question'}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {data.quiz && data.quiz.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-xl font-bold flex items-center gap-2"><ShieldCheck className="text-green-500"/> Final Quiz</h3>
                      {data.quiz.map((q, i) => (
                        <div key={i} className={`p-4 md:p-6 rounded-xl border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white shadow-sm'}`}>
                          <div className={`prose prose-sm max-w-none mb-4 font-bold ${darkMode ? 'prose-invert' : ''}`}>
                            <ReactMarkdown>{q.question}</ReactMarkdown>
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            {q.options.map((opt) => (
                              <button 
                                key={opt}
                                onClick={() => setQuizResults(prev => ({...prev, [i]: opt}))}
                                className={`p-3 text-left rounded-lg border transition-all text-sm
                                  ${quizResults[i] === opt ? (opt === q.correctAnswer ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500') : (darkMode ? 'border-slate-700 hover:bg-slate-700' : 'hover:bg-slate-50')}
                                  ${quizResults[i] && opt === q.correctAnswer ? 'bg-green-500 text-white border-green-500' : ''}
                                `}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </main>
          </SignedIn>

          <SignedOut>
            <div className="m-auto text-center px-4">
              <Brain size={64} className="mx-auto text-blue-500 mb-6" />
              <h1 className="text-3xl font-bold mb-4">Welcome to Lumina AI</h1>
              <p className="text-slate-500 mb-8 max-w-sm mx-auto">Master any topic with AI-generated study guides, flashcards, and quizzes.</p>
              <SignInButton mode="modal">
                <button className="bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition w-full sm:w-auto shadow-lg">Get Started</button>
              </SignInButton>
            </div>
          </SignedOut>
        </div>

        <footer className={`w-full py-6 border-t text-center transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-600'}`}>
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Brain size={20} className="text-blue-500" />
              <span className="font-semibold text-sm">© {new Date().getFullYear()} Lumina AI</span>
            </div>
            <p className="text-sm font-medium">
              Designed & Built by <span className="text-blue-500 font-bold underline decoration-2 underline-offset-4">Pushkar Pawar</span>
            </p>
            <div className="flex gap-6">
              <a href="https://www.linkedin.com/in/pushkarpawar314/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-500 transition-colors font-semibold text-sm">
                LinkedIn <Maximize2 size={12} className="rotate-45" /> 
              </a>
              <a href="https://github.com/Pushkar012345" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-500 transition-colors font-semibold text-sm">
                GitHub <Maximize2 size={12} className="rotate-45" /> 
              </a>
            </div>
          </div>
        </footer>
      </div>
    </HelmetProvider>
  );
}

export default App;