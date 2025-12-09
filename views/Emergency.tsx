import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Phone, MapPin, AlertOctagon, HeartPulse, Wind, Droplets, 
  AlertTriangle, Volume2, VolumeX, Play, Pause, ChevronRight, Check, X,
  Thermometer, Zap, Siren, Plus, Trash2, Share2
} from 'lucide-react';
import { Card, Button, LoadingOverlay, Modal, PageTransition } from '../components/Shared';
import { getFirstAidGuide } from '../services/geminiService';
import { FirstAidGuide, EmergencyContact } from '../types';

interface EmergencyProps {
  onBack: () => void;
  language: string;
}

type EmergencyViewMode = 'dashboard' | 'triage' | 'red_alert' | 'guide' | 'contacts';

const Emergency: React.FC<EmergencyProps> = ({ onBack, language }) => {
  const [mode, setMode] = useState<EmergencyViewMode>('dashboard');
  const [triageIndex, setTriageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Contacts
  const [contacts, setContacts] = useState<EmergencyContact[]>([
    { id: '1', name: 'Emergency Services', relation: 'Public', number: '112' },
  ]);
  const [newContact, setNewContact] = useState({ name: '', relation: '', number: '' });
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  // Guide State
  const [activeGuide, setActiveGuide] = useState<FirstAidGuide | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [timerActive, setTimerActive] = useState(false);
  const [timerCount, setTimerCount] = useState(0);

  // Location
  const [location, setLocation] = useState<string>("Locating...");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
        () => setLocation("Location unavailable")
      );
    }
  }, []);

  const triageQuestions = [
    { id: 'chest', text: "Is there severe chest pain or pressure?", icon: <HeartPulse className="w-8 h-8" /> },
    { id: 'breath', text: "Is there difficulty breathing or gasping?", icon: <Wind className="w-8 h-8" /> },
    { id: 'bleed', text: "Is there uncontrollable bleeding?", icon: <Droplets className="w-8 h-8" /> },
    { id: 'unconscious', text: "Is the person unconscious or unresponsive?", icon: <AlertTriangle className="w-8 h-8" /> },
    { id: 'stroke', text: "Signs of Stroke (Face drooping, Arm weakness, Speech)?", icon: <Zap className="w-8 h-8" /> },
  ];

  const commonEmergencies = [
    { id: 'cpr', name: 'CPR (Adult)', icon: <HeartPulse className="w-6 h-6 text-red-500" /> },
    { id: 'choking', name: 'Choking / Heimlich', icon: <Wind className="w-6 h-6 text-blue-500" /> },
    { id: 'bleeding', name: 'Severe Bleeding', icon: <Droplets className="w-6 h-6 text-red-600" /> },
    { id: 'burns', name: 'Burns', icon: <Thermometer className="w-6 h-6 text-orange-500" /> },
    { id: 'seizure', name: 'Seizure', icon: <ActivityIcon className="w-6 h-6 text-purple-500" /> },
    { id: 'allergic', name: 'Allergic Reaction', icon: <AlertOctagon className="w-6 h-6 text-pink-500" /> },
  ];

  // Helper Icon
  function ActivityIcon(props: any) { return <Zap {...props} />; }

  const handleTriageAnswer = (answer: boolean) => {
    if (answer) {
      setMode('red_alert');
    } else {
      if (triageIndex < triageQuestions.length - 1) {
        setTriageIndex(prev => prev + 1);
      } else {
        // All no -> Dashboard or Suggest
        setMode('dashboard');
        setTriageIndex(0);
      }
    }
  };

  const loadGuide = async (name: string) => {
    setLoading(true);
    try {
      const guide = await getFirstAidGuide(name, language);
      setActiveGuide(guide);
      setCurrentStepIndex(0);
      setMode('guide');
    } catch (e) {
      alert("Failed to load guide. Please call emergency services.");
    } finally {
      setLoading(false);
    }
  };

  // TTS
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Explicitly set the language for proper voice selection
      utterance.lang = language;
      
      utterance.rate = 0.9;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Timer Effect
  useEffect(() => {
    let interval: any;
    if (timerActive) {
      interval = setInterval(() => setTimerCount(c => c + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive]);

  const toggleTimer = () => {
    setTimerActive(!timerActive);
    if (!timerActive) setTimerCount(0);
  };

  const addContact = () => {
    if (newContact.name && newContact.number) {
      setContacts([...contacts, { ...newContact, id: Date.now().toString() }]);
      setIsContactModalOpen(false);
      setNewContact({ name: '', relation: '', number: '' });
    }
  };

  // --- RENDERERS ---

  if (mode === 'red_alert') {
    return (
      <div className="fixed inset-0 bg-red-600 z-50 flex flex-col items-center justify-center p-6 text-white text-center animate-in zoom-in duration-300">
        <Siren className="w-24 h-24 mb-6 animate-pulse-slow" />
        <h1 className="text-4xl font-extrabold mb-4 animate-bounce-slight">CRITICAL EMERGENCY</h1>
        <p className="text-xl mb-8">Based on your answers, immediate professional help is required.</p>
        
        <a 
          href="tel:112" 
          className="w-full max-w-sm bg-white text-red-600 font-black text-2xl py-6 rounded-2xl shadow-2xl flex items-center justify-center gap-3 mb-4 hover:scale-110 transition-transform active:scale-95 animate-pulse"
        >
          <Phone className="w-8 h-8 fill-current" />
          CALL 112 NOW
        </a>

        <div className="space-y-2 mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
           <p className="text-sm opacity-80">Your Location:</p>
           <div className="flex items-center justify-center gap-2 bg-red-700/50 py-2 px-4 rounded-lg">
             <MapPin className="w-4 h-4" />
             <span className="font-mono font-bold">{location}</span>
           </div>
        </div>

        <button onClick={() => setMode('dashboard')} className="text-white/80 underline text-sm hover:text-white">
          I made a mistake, go back
        </button>
      </div>
    );
  }

  if (mode === 'triage') {
    const q = triageQuestions[triageIndex];
    return (
      <PageTransition className="h-full flex flex-col pt-10 pb-6 px-4">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 animate-fade-in">
          <div className="w-32 h-32 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center shadow-lg animate-scale-in">
            {q.icon}
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white leading-tight">{q.text}</h2>
          
          <div className="w-full grid grid-cols-2 gap-4 mt-8">
            <button 
              onClick={() => handleTriageAnswer(false)}
              className="py-6 rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xl font-bold flex flex-col items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all active:scale-95"
            >
              <X className="w-8 h-8" /> NO
            </button>
            <button 
              onClick={() => handleTriageAnswer(true)}
              className="py-6 rounded-2xl bg-red-600 text-white text-xl font-bold flex flex-col items-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none hover:shadow-xl hover:-translate-y-1 active:scale-95"
            >
              <Check className="w-8 h-8" /> YES
            </button>
          </div>
        </div>
        <div className="text-center text-slate-400 text-sm">
          Question {triageIndex + 1} of {triageQuestions.length}
        </div>
      </PageTransition>
    );
  }

  if (mode === 'guide' && activeGuide) {
    const step = activeGuide.steps[currentStepIndex];
    return (
      <PageTransition className="h-full flex flex-col pb-20 relative">
        <div className="flex items-center justify-between mb-4">
           <button onClick={() => setMode('dashboard')} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full hover:bg-slate-200 transition-colors">
             <X className="w-6 h-6" />
           </button>
           <h2 className="font-bold text-lg truncate max-w-[200px]">{activeGuide.title}</h2>
           <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
             activeGuide.severity === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
           }`}>{activeGuide.severity}</div>
        </div>

        <div className="flex-1 flex flex-col">
           {/* Step Card */}
           <Card className="flex-1 flex flex-col justify-center border-l-8 border-blue-600 relative overflow-hidden animate-slide-in-right key={currentStepIndex}">
              <div className="absolute top-4 right-4 text-9xl font-black text-slate-100 dark:text-slate-800 -z-10 opacity-50">
                {currentStepIndex + 1}
              </div>
              
              <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
              <p className="text-xl text-slate-700 dark:text-slate-300 leading-relaxed mb-6">{step.instruction}</p>
              
              {step.warning && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex gap-3 items-start mb-4 animate-pulse">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <p className="text-red-800 dark:text-red-200 font-semibold">{step.warning}</p>
                </div>
              )}

              {step.hasTimer && (
                <div className="mt-4 bg-slate-100 dark:bg-slate-800 p-4 rounded-xl flex items-center justify-between">
                   <div className="font-mono text-3xl font-bold w-24">
                     {Math.floor(timerCount / 60)}:{String(timerCount % 60).padStart(2, '0')}
                   </div>
                   <Button onClick={toggleTimer} variant={timerActive ? 'danger' : 'secondary'} className="py-2 px-4">
                     {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                     {timerActive ? 'Pause' : 'Start Timer'}
                   </Button>
                </div>
              )}
           </Card>

           {/* Controls */}
           <div className="mt-4 grid grid-cols-4 gap-2">
              <button 
                onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                disabled={currentStepIndex === 0}
                className="col-span-1 py-4 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>

              <button 
                onClick={() => isSpeaking ? stopSpeak() : speak(`${step.title}. ${step.instruction}. ${step.warning || ''}`)}
                className={`col-span-2 py-4 rounded-xl flex items-center justify-center gap-2 font-bold text-white transition-all shadow-lg active:scale-95 ${isSpeaking ? 'bg-red-500 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {isSpeaking ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                {isSpeaking ? 'Stop' : 'Read Step'}
              </button>

              <button 
                onClick={() => setCurrentStepIndex(Math.min(activeGuide.steps.length - 1, currentStepIndex + 1))}
                disabled={currentStepIndex === activeGuide.steps.length - 1}
                className="col-span-1 py-4 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center disabled:opacity-30 active:scale-95 transition-transform"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
           </div>
           
           <div className="text-center mt-4 text-sm text-slate-500">
             Step {currentStepIndex + 1} of {activeGuide.steps.length}
           </div>
        </div>
      </PageTransition>
    );
  }

  // DEFAULT DASHBOARD
  return (
    <PageTransition className="h-full space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-2xl font-bold text-red-600">Emergency Center</h2>
      </div>

      {/* Main Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
         <button 
           onClick={() => { setTriageIndex(0); setMode('triage'); }}
           className="bg-red-600 text-white p-6 rounded-3xl shadow-lg shadow-red-200 dark:shadow-red-900/30 hover:bg-red-700 transition-all active:scale-95 text-left flex flex-col justify-between h-44 hover:shadow-xl hover:-translate-y-1 animate-scale-in"
         >
           <div className="p-3 bg-white/20 rounded-full w-fit">
              <AlertOctagon className="w-8 h-8" />
           </div>
           <div>
             <span className="block text-sm opacity-80 font-bold uppercase tracking-wider mb-1">Start</span>
             <span className="block text-2xl font-black leading-tight">Rapid Triage</span>
           </div>
         </button>

         <a 
           href="tel:112"
           className="bg-slate-900 dark:bg-slate-800 text-white p-6 rounded-3xl shadow-lg hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 text-left flex flex-col justify-between h-44 hover:shadow-xl hover:-translate-y-1 animate-scale-in"
           style={{ animationDelay: '0.1s' }}
         >
           <div className="p-3 bg-green-500/20 rounded-full w-fit">
             <Phone className="w-8 h-8 text-green-400" />
           </div>
           <div>
             <span className="block text-sm opacity-80 font-bold uppercase tracking-wider mb-1">Call</span>
             <span className="block text-2xl font-black leading-tight">112 / 911</span>
           </div>
         </a>
      </div>

      {/* Location Bar */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 rounded-xl flex items-center justify-between animate-fade-in" style={{ animationDelay: '0.2s' }}>
         <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full animate-pulse-slow">
               <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Current Location</p>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-300 font-bold">{location}</p>
            </div>
         </div>
         <button className="p-2 bg-blue-100 dark:bg-blue-800 rounded-lg text-blue-700 dark:text-blue-200 hover:opacity-80 active:scale-95 transition-transform">
            <Share2 className="w-4 h-4" />
         </button>
      </div>

      {/* Quick Guides */}
      <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h3 className="font-bold text-lg mb-3 px-1">Common Emergencies</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {commonEmergencies.map((em, idx) => (
            <button 
              key={em.id}
              onClick={() => loadGuide(em.name)}
              className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-red-400 transition-all shadow-sm hover:shadow-md active:scale-95 animate-scale-in"
              style={{ animationDelay: `${0.3 + (idx * 0.05)}s` }}
            >
              {em.icon}
              <span className="font-semibold text-sm text-center">{em.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Contacts */}
      <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="font-bold text-lg">Emergency Contacts</h3>
          <button onClick={() => setIsContactModalOpen(true)} className="text-blue-600 text-sm font-bold flex items-center gap-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
           {contacts.map((contact, idx) => (
             <div key={contact.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm animate-slide-in-right" style={{ animationDelay: `${0.5 + (idx * 0.1)}s` }}>
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                     {contact.name.charAt(0)}
                   </div>
                   <div>
                     <p className="font-bold">{contact.name}</p>
                     <p className="text-xs text-slate-500">{contact.relation}</p>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <a href={`tel:${contact.number}`} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:scale-110 transition-transform">
                     <Phone className="w-4 h-4" />
                   </a>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal isOpen={isContactModalOpen} onClose={() => setIsContactModalOpen(false)} title="Add Contact">
         <div className="space-y-4">
            <input 
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Name"
              value={newContact.name}
              onChange={e => setNewContact({...newContact, name: e.target.value})}
            />
            <input 
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Relation (e.g., Mom, Doctor)"
              value={newContact.relation}
              onChange={e => setNewContact({...newContact, relation: e.target.value})}
            />
            <input 
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Phone Number"
              type="tel"
              value={newContact.number}
              onChange={e => setNewContact({...newContact, number: e.target.value})}
            />
            <Button onClick={addContact} className="w-full">Save Contact</Button>
         </div>
      </Modal>

      {loading && <LoadingOverlay message="Loading Emergency Protocol..." />}
    </PageTransition>
  );
};

export default Emergency;