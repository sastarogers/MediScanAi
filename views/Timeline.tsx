import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, Calendar, ChevronDown, 
  Search, Plus, Trash2, Edit2, FileText, 
  Stethoscope, Pill, AlertCircle, Printer,
  Brain, Loader2, Sparkles, TrendingUp
} from 'lucide-react';
import { Card, Badge, Button, Modal, PageTransition } from '../components/Shared';
import { HealthRecord, TriageLevel, HealthInsight } from '../types';
import { generateHealthInsights } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';

interface TimelineProps {
  onBack: () => void;
  history: HealthRecord[];
  onUpdateRecord: (record: HealthRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord: (record: HealthRecord) => void;
  language: string;
}

const Timeline: React.FC<TimelineProps> = ({ 
  onBack, 
  history, 
  onUpdateRecord, 
  onDeleteRecord, 
  onAddRecord,
  language
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  
  // Insight State
  const [insights, setInsights] = useState<HealthInsight | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  
  const [newEntry, setNewEntry] = useState<{
    type: 'appointment' | 'note' | 'symptom';
    summary: string;
    details: string;
    notes: string;
  }>({ type: 'note', summary: '', details: '', notes: '' });

  const filteredHistory = useMemo(() => {
    let filtered = [...history];
    if (filterType !== 'all') {
      if (filterType === 'appointments') {
        filtered = filtered.filter(h => h.type === 'appointment');
      } else {
        filtered = filtered.filter(h => h.type === filterType);
      }
    }
    const now = Date.now();
    if (timeRange === '7days') filtered = filtered.filter(h => now - h.date < 7 * 24 * 60 * 60 * 1000);
    else if (timeRange === '30days') filtered = filtered.filter(h => now - h.date < 30 * 24 * 60 * 60 * 1000);

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(h => 
        h.summary.toLowerCase().includes(q) || 
        h.details.toLowerCase().includes(q) ||
        h.notes?.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a, b) => b.date - a.date);
  }, [history, filterType, timeRange, searchQuery]);

  const toggleExpand = (id: string) => setExpandedId(prev => prev === id ? null : id);
  const handleDelete = (id: string) => { if (window.confirm("Are you sure?")) onDeleteRecord(id); };
  
  const handleAddSubmit = () => {
    if (!newEntry.summary) return;
    onAddRecord({
      id: Date.now().toString(),
      profileId: '',
      date: Date.now(),
      type: newEntry.type as any,
      summary: newEntry.summary,
      details: newEntry.details,
      notes: newEntry.notes,
      triageLevel: TriageLevel.LOW
    });
    setIsAddingEntry(false);
    setNewEntry({ type: 'note', summary: '', details: '', notes: '' });
  };
  
  const handleEditSubmit = () => {
    if (!isEditingId) return;
    const record = history.find(h => h.id === isEditingId);
    if (record) onUpdateRecord({ ...record, summary: newEntry.summary, notes: newEntry.notes, details: newEntry.details });
    setIsEditingId(null);
    setNewEntry({ type: 'note', summary: '', details: '', notes: '' });
  };
  
  const openEdit = (record: HealthRecord) => {
    setNewEntry({ type: record.type as any, summary: record.summary, details: record.details, notes: record.notes || '' });
    setIsEditingId(record.id);
  };

  const handleGenerateInsights = async () => {
    if (history.length === 0) {
        alert("Add some health records first!");
        return;
    }
    setLoadingInsights(true);
    try {
      // Use filteredHistory to respect current search/filter context, or generic history? 
      // Usually users want insights on everything, but filtered is more powerful. Let's use filtered.
      const data = await generateHealthInsights(filteredHistory, language);
      setInsights(data);
      setShowInsightsModal(true);
    } catch (e) {
      console.error(e);
      alert("Unable to generate insights at this time.");
    } finally {
      setLoadingInsights(false);
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header - Fixed to sit below the main App header */}
        <div className="sticky top-16 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md z-20 pb-4 pt-2 -mt-2 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
              <h2 className="text-2xl font-bold">Health Dashboard</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleGenerateInsights} 
                variant="secondary" 
                className="py-2 px-3 text-sm h-10 bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-indigo-900/20"
                disabled={loadingInsights}
              >
                {loadingInsights ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                <span className="hidden sm:inline ml-2">AI Insights</span>
              </Button>
              <Button onClick={() => setIsReportModalOpen(true)} variant="outline" className="py-2 px-3 text-sm h-10"><Printer className="w-5 h-5" /></Button>
              <Button onClick={() => setIsAddingEntry(true)} className="py-2 px-3 text-sm h-10"><Plus className="w-5 h-5" /> Add</Button>
            </div>
          </div>
          
          {/* Search and Filter Bar */}
          <div className="flex flex-col md:flex-row gap-3 animate-fade-in">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
            </div>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500 shadow-sm">
              <option value="all">All Types</option><option value="symptom">Symptoms</option><option value="medication">Meds</option><option value="appointment">Appts</option>
            </select>
          </div>
        </div>

        {/* --- LIST VIEW --- */}
        <div className="animate-slide-up duration-500 pb-20">
          {history.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No records.</p>
              <Button variant="outline" onClick={() => setIsAddingEntry(true)} className="mt-4">Add First Entry</Button>
            </div>
          ) : (
            <div className="relative space-y-6 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
              {filteredHistory.map((record, index) => {
                const isExpanded = expandedId === record.id;
                return (
                  <div key={record.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 dark:border-slate-950 shadow-md shrink-0 z-10 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-all duration-300 group-hover:scale-110 ${
                      record.type === 'emergency' ? 'bg-red-100 text-red-600' : record.type === 'medication' ? 'bg-emerald-100 text-emerald-600' : record.type === 'appointment' ? 'bg-violet-100 text-violet-600' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {record.type === 'symptom' && <Stethoscope className="w-5 h-5" />}
                      {record.type === 'medication' && <Pill className="w-5 h-5" />}
                      {record.type === 'emergency' && <AlertCircle className="w-5 h-5" />}
                      {record.type === 'appointment' && <Calendar className="w-5 h-5" />}
                      {record.type === 'note' && <FileText className="w-5 h-5" />}
                    </div>
                    <Card className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-0 overflow-hidden cursor-pointer transition-all duration-300 ${isExpanded ? 'ring-2 ring-blue-500 shadow-xl z-10 scale-[1.02]' : 'hover:shadow-lg hover:-translate-y-0.5'}`} onClick={() => toggleExpand(record.id)}>
                      <div className="p-4 bg-white dark:bg-slate-800">
                        <div className="flex gap-4">
                          {record.type === 'medication' && record.attachments && record.attachments.length > 0 && !isExpanded && (
                            <img src={`data:image/jpeg;base64,${record.attachments[0]}`} className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 shadow-sm" alt="Medication" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-bold text-slate-900 dark:text-slate-100">{new Date(record.date).toLocaleDateString()}</span>
                              <span className="text-xs text-slate-500">{new Date(record.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <h3 className="font-bold text-lg text-blue-600 dark:text-blue-400 truncate pr-6">{record.summary}</h3>
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex gap-2">{record.triageLevel && <Badge level={record.triageLevel} />}</div>
                              <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown className="w-5 h-5 text-slate-400" /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className={`bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <div className="p-4 space-y-4">
                          {record.attachments && record.attachments.length > 0 && (
                            <div className={`flex gap-2 overflow-x-auto pb-2 ${record.type === 'medication' ? 'justify-center' : ''}`}>
                              {record.attachments.map((img, i) => (<img key={i} src={`data:image/jpeg;base64,${img}`} className={`${record.type === 'medication' ? 'h-48 w-full max-w-sm object-cover rounded-xl shadow-md' : 'h-24 w-24 object-cover rounded-lg border border-slate-200 dark:border-slate-700'}`} alt="Attachment" />))}
                            </div>
                          )}
                          <div className="prose dark:prose-invert text-sm max-w-none"><ReactMarkdown>{record.details}</ReactMarkdown></div>
                          {record.notes && <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700"><p className="text-xs font-bold text-slate-500 uppercase mb-1">My Notes</p><p className="text-sm">{record.notes}</p></div>}
                          <div className="flex gap-2 pt-2">
                            <button onClick={(e) => { e.stopPropagation(); openEdit(record); }} className="flex-1 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-sm font-medium transition-colors flex items-center justify-center gap-2 active:scale-95"><Edit2 className="w-4 h-4" /> Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }} className="flex-1 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 text-sm font-medium transition-colors flex items-center justify-center gap-2 active:scale-95"><Trash2 className="w-4 h-4" /> Delete</button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* AI INSIGHTS MODAL - Text Only, No Charts */}
        <Modal isOpen={showInsightsModal} onClose={() => setShowInsightsModal(false)} title="Dr. AI Analysis">
          {insights ? (
            <div className="space-y-6">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                <div className="flex items-center gap-2 mb-2 text-indigo-800 dark:text-indigo-300">
                   <Sparkles className="w-5 h-5" />
                   <h3 className="font-bold">Medical Summary</h3>
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-sm">{insights.summary}</p>
                <p className="text-xs text-slate-400 mt-2 text-right">Analyzed {new Date(insights.generatedAt).toLocaleDateString()}</p>
              </div>

              {insights.patterns.length > 0 && (
                <div>
                  <h4 className="font-bold mb-3 flex items-center gap-2 text-slate-900 dark:text-white"><TrendingUp className="w-5 h-5 text-blue-500" /> Detected Patterns</h4>
                  <div className="space-y-3">
                    {insights.patterns.map((p, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        p.severity === 'negative' ? 'bg-red-50 border-red-100 dark:bg-red-900/10 dark:border-red-800/30' : 
                        p.severity === 'positive' ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-800/30' : 
                        'bg-slate-50 border-slate-100 dark:bg-slate-800 dark:border-slate-700'
                      }`}>
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{p.title}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider ${
                              p.severity === 'negative' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 
                              p.severity === 'positive' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 
                              'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                            }`}>{p.severity}</span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug">{p.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {insights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-bold mb-3 flex items-center gap-2 text-slate-900 dark:text-white"><Stethoscope className="w-5 h-5 text-emerald-500" /> Recommendations</h4>
                  <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl p-4">
                    <ul className="space-y-2">
                      {insights.recommendations.map((r, i) => (
                        <li key={i} className="flex gap-2 text-sm text-slate-700 dark:text-slate-300">
                          <span className="text-blue-500 font-bold">•</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <p className="text-xs text-slate-400 italic">This analysis is generated by AI and does not replace professional medical advice.</p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500">
               No insights available.
            </div>
          )}
        </Modal>

        <Modal isOpen={isAddingEntry || !!isEditingId} onClose={() => { setIsAddingEntry(false); setIsEditingId(null); }} title={isEditingId ? "Edit Entry" : "Add New Entry"}>
           <div className="space-y-4">
            <input className="w-full p-2 border rounded" placeholder="Summary" value={newEntry.summary} onChange={e => setNewEntry({...newEntry, summary: e.target.value})} />
            <textarea className="w-full p-2 border rounded" placeholder="Details" value={newEntry.details} onChange={e => setNewEntry({...newEntry, details: e.target.value})} />
            <Button onClick={isEditingId ? handleEditSubmit : handleAddSubmit} className="w-full">Save</Button>
           </div>
        </Modal>
        
        <Modal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} title="Report"><Button onClick={() => window.print()}>Print</Button></Modal>
      </div>
    </PageTransition>
  );
};
export default Timeline;