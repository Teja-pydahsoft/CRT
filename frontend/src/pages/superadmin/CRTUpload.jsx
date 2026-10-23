import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import {
  Calculator,
  Puzzle,
  Code,
  Upload,
  Download,
  Plus,
  Trash2,
  CheckCircle,
  Search,
  Sparkles,
  BookOpen,
  X
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api, { getAutoPracticeQuestions } from '../../services/api';

const CRT_MODULES = [
  {
    id: 'aptitude',
    name: 'Quantitative Aptitude',
    icon: Calculator,
    color: 'from-blue-600 to-indigo-600',
    description: 'Arithmetic, percentages, profit-loss, time & work, permutations, probability.'
  },
  {
    id: 'reasoning',
    name: 'Logical Reasoning',
    icon: Puzzle,
    color: 'from-emerald-600 to-teal-600',
    description: 'Syllogisms, blood relations, series completion, coding-decoding, direction sense.'
  },
  {
    id: 'technical',
    name: 'Technical & CS',
    icon: Code,
    color: 'from-purple-600 to-violet-600',
    description: 'Data structures, algorithms, DBMS/SQL, operating systems, networking, OOP.'
  }
];

export default function CRTUpload() {
  const [selectedTopic, setSelectedTopic] = useState('aptitude');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Manual Add Form State
  const [manualText, setManualText] = useState('');
  const [manualOptions, setManualOptions] = useState(['', '', '', '']);
  const [manualAnswer, setManualAnswer] = useState('');

  // Fetch Questions for Selected Topic
  const loadQuestions = useCallback(async (topic) => {
    try {
      setLoading(true);
      const res = await getAutoPracticeQuestions('CRT', topic, 25);
      const list = res?.data?.questions || [];
      setQuestions(list);
    } catch (err) {
      toast.error('Failed to load CRT questions');
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuestions(selectedTopic);
  }, [selectedTopic, loadQuestions]);

  // Handle Download CSV Template
  const handleDownloadTemplate = () => {
    const csvContent =
      "question,option_a,option_b,option_c,option_d,correct_answer\n" +
      '"A train crosses a 150m bridge in 15 seconds at 60 km/h. Length of train?","100m","120m","150m","200m","100m"\n' +
      '"Which sorting algorithm has worst case O(n log n)?","QuickSort","MergeSort","BubbleSort","SelectionSort","MergeSort"\n' +
      '"Complete series: 2, 6, 12, 20, 30, ?","40","42","44","46","42"';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `crt_${selectedTopic}_template.csv`;
    link.click();
    toast.success('Sample CSV template downloaded!');
  };

  // Handle File Upload (CSV/Excel)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = parseRows(results.data);
          if (parsed.length > 0) {
            setQuestions(prev => [...parsed, ...prev]);
            toast.success(`Imported ${parsed.length} questions!`);
          } else {
            toast.error('No valid question rows found in CSV');
          }
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          const parsed = parseRows(data);
          if (parsed.length > 0) {
            setQuestions(prev => [...parsed, ...prev]);
            toast.success(`Imported ${parsed.length} questions!`);
          } else {
            toast.error('No valid question rows found in Excel');
          }
        } catch {
          toast.error('Excel file parse error');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error('Please upload a .csv or .xlsx file');
    }
    e.target.value = '';
  };

  const parseRows = (rows) => {
    const out = [];
    rows.forEach((r, idx) => {
      const qText = r.question || r.text || r.Question;
      if (!qText) return;
      const opts = [
        r.option_a || r.option1 || r['Option A'],
        r.option_b || r.option2 || r['Option B'],
        r.option_c || r.option3 || r['Option C'],
        r.option_d || r.option4 || r['Option D']
      ].filter(Boolean);
      const ans = r.correct_answer || r.answer || opts[0];
      out.push({
        id: `upload_${Date.now()}_${idx}`,
        text: String(qText).trim(),
        options: opts.length >= 2 ? opts : ['A', 'B', 'C', 'D'],
        correct_answer: String(ans).trim(),
        subcategory: selectedTopic
      });
    });
    return out;
  };

  // Add Manual Question
  const handleAddManual = () => {
    if (!manualText.trim()) {
      toast.error('Question text is required');
      return;
    }
    const cleanOpts = manualOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      toast.error('At least 2 options required');
      return;
    }
    const newQ = {
      id: `manual_${Date.now()}`,
      text: manualText.trim(),
      options: cleanOpts,
      correct_answer: manualAnswer.trim() || cleanOpts[0],
      subcategory: selectedTopic
    };
    setQuestions(prev => [newQ, ...prev]);
    setManualText('');
    setManualOptions(['', '', '', '']);
    setManualAnswer('');
    setIsAddModalOpen(false);
    toast.success('Question added to bank!');
  };

  // Filtered Questions
  const filtered = questions.filter(q =>
    (q.text || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Campus Recruitment Training</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
              CRT Question Bank & Uploads
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Manage questions, upload question sets, and configure CRT assessments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>CSV Template</span>
            </button>

            <label className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Upload CSV / Excel</span>
              <input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            </label>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-semibold text-xs shadow-md shadow-indigo-100"
            >
              <Plus className="w-4 h-4" />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* CRT Topic Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {CRT_MODULES.map(mod => {
            const isSelected = selectedTopic === mod.id;
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => setSelectedTopic(mod.id)}
                className={`p-5 rounded-2xl border-2 text-left transition-all flex items-start gap-3.5 ${
                  isSelected
                    ? 'border-indigo-600 bg-white shadow-md'
                    : 'border-slate-200 bg-white/70 hover:border-slate-300'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mod.color} text-white flex items-center justify-center text-xl shrink-0 shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{mod.name}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{mod.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Search & Actions Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${selectedTopic} questions...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
            {filtered.length} Questions
          </span>
        </div>

        {/* Questions Listing */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <LoadingSpinner />
              <p className="text-sm text-slate-500">Loading questions...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-slate-700">No Questions Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Upload a CSV/Excel file or click "Add Question" to populate this topic.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((q, idx) => (
                <div
                  key={q.id || idx}
                  className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all flex items-start justify-between gap-4"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <span className="w-7 h-7 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="space-y-2.5 flex-1">
                      <p className="text-sm font-semibold text-slate-900 leading-relaxed">
                        {q.text}
                      </p>

                      {Array.isArray(q.options) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                            return (
                              <div
                                key={oIdx}
                                className={`px-3 py-1.5 rounded-xl flex items-center justify-between ${
                                  isCorrect
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                                    : 'bg-white text-slate-600 border border-slate-200'
                                }`}
                              >
                                <span>{opt}</span>
                                {isCorrect && <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setQuestions(prev => prev.filter((_, i) => i !== idx))}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Remove Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add Question Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-lg">Add CRT Question</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Question Text
                </label>
                <textarea
                  rows={3}
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  placeholder="Enter problem statement..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {manualOptions.map((opt, oIdx) => (
                  <input
                    key={oIdx}
                    type="text"
                    placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                    value={opt}
                    onChange={e => {
                      const next = [...manualOptions];
                      next[oIdx] = e.target.value;
                      setManualOptions(next);
                    }}
                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  />
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Correct Answer
                </label>
                <input
                  type="text"
                  placeholder="Option text matching correct answer"
                  value={manualAnswer}
                  onChange={e => setManualAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddManual}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100"
                >
                  Save Question
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}