import React, { useState, useRef, useEffect } from 'react';
import { Camera, Send, X, ArrowLeft, Image as ImageIcon, Eye, Sparkles, Mic, MicOff, MapPin, Star, Phone, Stethoscope } from 'lucide-react';
import { Button, Card, Badge, Skeleton, PageTransition } from '../components/Shared';
import { analyzeSymptoms, fileToBase64, findNearbyDoctors } from '../services/geminiService';
import { AnalysisResponse, HealthRecord, Message, TriageLevel, UserProfile, DoctorListing } from '../types';
import { t } from '../utils/translations';
import ReactMarkdown from 'react-markdown';

interface SymptomCheckerProps {
  onBack: () => void;
  onSaveRecord: (record: HealthRecord) => void;
  language: string;
  activeProfile?: UserProfile;
}

const SymptomChecker: React.FC<SymptomCheckerProps> = ({ onBack, onSaveRecord, language, activeProfile }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  
  // Doctor Suggestion State
  const [suggestedDoctors, setSuggestedDoctors] = useState<DoctorListing[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | null>(null);
  const [locationStr, setLocationStr] = useState('');

  // Voice Input State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, analysis, loading]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Get location on mount for doctor search
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationStr(`${pos.coords.latitude.toFixed(4)},${pos.coords.longitude.toFixed(4)}`);
        },
        (err) => console.log("Location access denied")
      );
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice input is not supported in this browser.");
        return;
      }
      
      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: any) => {
        const results = event.results;
        const lastResult = results[results.length - 1];
        if (lastResult.isFinal) {
           setInput(prev => {
             const newText = prev + (prev ? ' ' : '') + lastResult[0].transcript;
             return newText;
           });
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      try {
        recognition.start();
        recognitionRef.current = recognition;
        setIsRecording(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setImages(prev => [...prev, base64]);
      } catch (err) {
        console.error("Image upload failed", err);
      }
    }
  };

  const constructMarkdownDetails = (res: AnalysisResponse): string => {
    let md = res.detailedAnalysis || '';
    if (res.differentialDiagnosis && res.differentialDiagnosis.length > 0) {
      md += '\n\n### Differential Diagnosis\n';
      res.differentialDiagnosis.forEach(d => { md += `- **${d.condition}** (${d.likelihood}): ${d.reasoning}\n`; });
    }
    if (res.visualAnalysis && res.visualAnalysis.findings) {
      md += `\n\n### Visual Analysis\n${res.visualAnalysis.findings}`;
    }
    return md;
  };

  const handleSend = async () => {
    if ((!input.trim() && images.length === 0) || loading) return;

    if (analysis?.status === 'complete') {
      setAnalysis(null);
      setMessages([]);
      setSuggestedDoctors([]);
    }

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, attachments: images, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setInput('');
    const currentImages = [...images];
    setImages([]);

    try {
      const historyText = messages.map(m => `${m.role === 'user' ? 'Patient' : 'Doctor'}: ${m.text}`);
      const profileContext = activeProfile ? `${activeProfile.type} (${activeProfile.age || '?'}), Name: ${activeProfile.name}` : 'Adult';
      const result = await analyzeSymptoms(userMsg.text, historyText, currentImages, language, profileContext);
      
      if (result.status === 'in_progress' && result.nextQuestion) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: result.nextQuestion || "Can you provide more details?", timestamp: Date.now() }]);
      } else if (result.status === 'complete') {
        setAnalysis(result);
        onSaveRecord({
          id: Date.now().toString(),
          profileId: activeProfile?.id || 'default',
          date: Date.now(),
          type: 'symptom',
          summary: result.summary || "Symptom Check",
          details: constructMarkdownDetails(result),
          triageLevel: result.triageLevel || TriageLevel.LOW,
          confidence: result.confidenceScore,
          attachments: currentImages.length > 0 ? currentImages : undefined
        });

        // Auto-fetch doctors if specialist detected
        if (result.recommendedSpecialist) {
           setDoctorLoading(true);
           try {
              const loc = locationStr || "me";
              const docs = await findNearbyDoctors(result.recommendedSpecialist, loc, language, userCoords || undefined);
              setSuggestedDoctors(docs);
           } catch(e) {
              console.error("Failed to fetch doctors", e);
           }
           setDoctorLoading(false);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: "Error analyzing symptoms. Please try again.", timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] flex flex-col relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
        <button onClick={onBack} className="p-3 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm"><ArrowLeft className="w-5 h-5" /></button>
        <div>
           <h2 className="text-xl font-bold leading-tight flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             {t('symptom_checker', language)}
           </h2>
           {activeProfile && <p className="text-xs text-slate-500 font-medium">Consulting for: <span className="text-blue-600 dark:text-blue-400 font-bold">{activeProfile.name}</span></p>}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto space-y-6 px-2 pb-6 scroll-smooth">
        {messages.length === 0 && !analysis && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 animate-fade-in opacity-80">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mb-6 shadow-lg animate-float">
              <Sparkles className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-2xl font-bold mb-3 text-slate-800 dark:text-white">{t('start_assessment', language)}</h3>
            <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">{t('describe_prompt', language)}</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-in-right`} style={{ animationDelay: `${idx * 0.1}s` }}>
            <div className={`max-w-[85%] p-5 rounded-3xl shadow-sm relative group transition-all duration-300 hover:shadow-md ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-br-none' 
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-bl-none'
            }`}>
              {msg.attachments && msg.attachments.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {msg.attachments.map((img, idx) => (
                    <img key={idx} src={`data:image/jpeg;base64,${img}`} alt="Upload" className="h-32 rounded-xl object-cover shadow-md border border-white/20" />
                  ))}
                </div>
              )}
              <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">{msg.text}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[85%] p-5 rounded-3xl rounded-bl-none bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm w-72">
              <div className="flex gap-1 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
              </div>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}

        {analysis && analysis.status === 'complete' && (
          <div className="animate-slide-up duration-500 space-y-4 pt-2">
            <Card className="border-l-4 border-blue-500 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><Sparkles className="w-24 h-24" /></div>
               <div className="relative z-10">
                 <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">{analysis.summary}</h3>
                 <div className="flex gap-3 mb-5">
                   <Badge level={analysis.triageLevel || 'Low'} />
                   <span className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full font-bold flex items-center">
                     Confidence: {analysis.confidenceScore}%
                   </span>
                 </div>
                 <div className="prose dark:prose-invert text-sm max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-blue-600">
                   <ReactMarkdown>{analysis.detailedAnalysis || ''}</ReactMarkdown>
                 </div>
               </div>
            </Card>
            
            {analysis.visualAnalysis && (
              <Card className="border-l-4 border-violet-500 bg-violet-50/50 dark:bg-violet-900/10">
                <h4 className="flex gap-2 font-bold text-violet-700 dark:text-violet-300 mb-2">
                  <Eye className="w-5 h-5" /> Visual Analysis Findings
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{analysis.visualAnalysis.findings}</p>
              </Card>
            )}

            {/* Suggested Doctors Section */}
            {(doctorLoading || suggestedDoctors.length > 0) && (
                <div className="mt-6 animate-slide-up">
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                        <Stethoscope className="w-5 h-5 text-blue-500" />
                        Recommended Specialists: <span className="text-blue-600">{analysis.recommendedSpecialist}</span>
                    </h4>
                    {doctorLoading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-24 w-full rounded-2xl" />
                            <Skeleton className="h-24 w-full rounded-2xl" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {suggestedDoctors.map((doc, i) => (
                                <Card key={i} className="flex flex-col gap-1 border-l-4 border-blue-400">
                                    <div className="flex justify-between items-start">
                                        <h5 className="font-bold text-blue-700 dark:text-blue-400">{doc.name}</h5>
                                        {doc.rating && (
                                            <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-lg shrink-0 text-xs font-bold text-yellow-600 dark:text-yellow-400">
                                                <Star className="w-3 h-3 fill-current" />{doc.rating}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3 text-slate-400" /> {doc.address}
                                    </p>
                                    {doc.phone && (
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1 ml-4">
                                            {doc.phone}
                                        </p>
                                    )}
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <Button onClick={() => { setAnalysis(null); setMessages([]); setSuggestedDoctors([]); }} variant="outline" className="w-full py-4 text-base mt-4">
              {t('scan_new', language)}
            </Button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {(!analysis || analysis.status !== 'complete') && (
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/20 shadow-2xl p-4 rounded-3xl flex-shrink-0 z-30 mb-4 mx-1">
          {images.length > 0 && (
            <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative group animate-scale-in">
                  <img src={`data:image/jpeg;base64,${img}`} className="h-20 w-20 rounded-2xl object-cover border-2 border-white shadow-md" />
                  <button onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            <label className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-all active:scale-95">
              <Camera className="w-6 h-6" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            
            <button 
               onClick={toggleRecording}
               className={`p-4 rounded-2xl transition-all active:scale-95 ${isRecording ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30'}`}
            >
              {isRecording ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <div className="flex-1 relative">
              <textarea 
                value={input} 
                onChange={(e) => setInput(e.target.value)} 
                placeholder={t('type_symptoms', language)} 
                className="w-full bg-slate-100 dark:bg-slate-800 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-blue-500/50 resize-none max-h-32 min-h-[56px]"
                rows={1}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
            </div>
            <button 
              onClick={handleSend} 
              disabled={(!input && images.length === 0) || loading} 
              className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
            >
              <Send className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default SymptomChecker;