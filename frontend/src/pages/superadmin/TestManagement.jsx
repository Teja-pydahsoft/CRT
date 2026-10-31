import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  FileText,
  Upload,
  Download,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Eye,
  Bell,
  BookOpen,
  ArrowRight,
  HelpCircle,
  Layers
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  getAllTests,
  createOnlineTest,
  deleteTest,
  getAutoPracticeQuestions,
  getStudentCount,
  getCampuses,
  getBatchCampuses
} from '../../services/api';
import api from '../../services/api';

// Module & Topic configuration
const MODULE_OPTIONS = [
  {
    id: 'CRT',
    name: 'CRT Modules',
    description: 'Aptitude, Reasoning, and Technical assessments',
    topics: [
      { id: 'aptitude', name: 'Quantitative Aptitude' },
      { id: 'reasoning', name: 'Logical Reasoning' },
      { id: 'technical', name: 'Technical & CS' }
    ]
  },
  {
    id: 'VERSANT',
    name: 'VERSANT English',
    description: 'Language, comprehension, and business communication',
    topics: [
      { id: 'grammar', name: 'Grammar Mastery' },
      { id: 'reading', name: 'Reading Comprehension' },
      { id: 'listening', name: 'Listening Skills' },
      { id: 'speaking', name: 'Speaking Proficiency' },
      { id: 'writing', name: 'Written Expression' },
      { id: 'vocabulary', name: 'Vocabulary & Idioms' }
    ]
  }
];

export default function TestManagement() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [previewTest, setPreviewTest] = useState(null);

  // Fetch Tests
  const loadTests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAllTests();
      const list = res?.data?.data || res?.data || [];
      setTests(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('Failed to load tests:', err);
      toast.error('Failed to load tests list');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  // Handle Delete
  const handleDeleteTest = async (testId, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    try {
      await deleteTest(testId);
      toast.success('Test deleted successfully');
      setTests(prev => prev.filter(t => t._id !== testId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete test');
    }
  };

  // Filtered Tests
  const filteredTests = useMemo(() => {
    const now = Date.now();
    return tests.filter(test => {
      const titleMatch = (test.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (test.subcategory || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const moduleMatch = filterModule === 'ALL' ||
        (test.module_id || '').toUpperCase().includes(filterModule);

      let statusMatch = true;
      if (filterStatus !== 'ALL') {
        const start = test.startDateTime ? new Date(test.startDateTime).getTime() : 0;
        const end = test.endDateTime ? new Date(test.endDateTime).getTime() : Infinity;
        if (filterStatus === 'ACTIVE') {
          statusMatch = now >= start && now <= end;
        } else if (filterStatus === 'UPCOMING') {
          statusMatch = now < start;
        } else if (filterStatus === 'EXPIRED') {
          statusMatch = now > end;
        }
      }

      return titleMatch && moduleMatch && statusMatch;
    });
  }, [tests, searchTerm, filterModule, filterStatus]);

  // Compute Stats
  const stats = useMemo(() => {
    const now = Date.now();
    let active = 0;
    let upcoming = 0;
    let totalQuestions = 0;

    tests.forEach(t => {
      const start = t.startDateTime ? new Date(t.startDateTime).getTime() : 0;
      const end = t.endDateTime ? new Date(t.endDateTime).getTime() : Infinity;
      if (now >= start && now <= end) active++;
      else if (now < start) upcoming++;
      totalQuestions += Array.isArray(t.questions) ? t.questions.length : (t.question_count || 0);
    });

    return { total: tests.length, active, upcoming, totalQuestions };
  }, [tests]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-700 bg-indigo-50 rounded-full border border-indigo-100">
                Administration Portal
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
              Online Test Management
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Create, configure, and schedule CRT & Versant assessments in a streamlined 3-step modal.
            </p>
          </div>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-5 py-3 rounded-xl font-medium shadow-md shadow-indigo-100 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Plus className="w-5 h-5" />
            <span>Create Online Test</span>
          </button>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tests</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Exams</p>
              <h3 className="text-2xl font-bold text-emerald-600">{stats.active}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Upcoming</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.upcoming}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Questions</p>
              <h3 className="text-2xl font-bold text-slate-900">{stats.totalQuestions}</h3>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by test name or topic..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-medium text-slate-500">Module:</span>
              <select
                value={filterModule}
                onChange={e => setFilterModule(e.target.value)}
                className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Modules</option>
                <option value="CRT">CRT Modules</option>
                <option value="VERSANT">VERSANT English</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Status:</span>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active Now</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="EXPIRED">Closed / Expired</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tests Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-500">
              <LoadingSpinner />
              <p className="text-sm">Loading tests...</p>
            </div>
          ) : filteredTests.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">No Tests Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                No assessments match your current filters. Click below to create your first online test in 3 simple steps.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Test</span>
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Test Details</th>
                    <th className="py-3.5 px-6">Module & Topic</th>
                    <th className="py-3.5 px-6">Schedule Window</th>
                    <th className="py-3.5 px-6">Duration</th>
                    <th className="py-3.5 px-6">Questions</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredTests.map(test => {
                    const now = Date.now();
                    const start = test.startDateTime ? new Date(test.startDateTime) : null;
                    const end = test.endDateTime ? new Date(test.endDateTime) : null;
                    const isUpcoming = start && now < start.getTime();
                    const isClosed = end && now > end.getTime();
                    const isActive = !isUpcoming && !isClosed;
                    const qCount = Array.isArray(test.questions) ? test.questions.length : (test.question_count || 0);

                    return (
                      <tr key={test._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-semibold text-slate-900">{test.title}</div>
                          {test.description && (
                            <div className="text-xs text-slate-400 line-clamp-1 mt-0.5">{test.description}</div>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            <span>{test.module_id || 'CRT'}</span>
                            <span className="text-slate-400">•</span>
                            <span className="capitalize">{test.subcategory || 'General'}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{start ? start.toLocaleDateString() : 'Immediate'}</span>
                          </div>
                          <div className="text-slate-400 mt-0.5">
                            until {end ? end.toLocaleDateString() : 'Permanent'}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-700 font-medium">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{test.duration || 30} mins</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {qCount} Qs
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Active
                            </span>
                          ) : isUpcoming ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/50">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                              Upcoming
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Closed
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button
                            onClick={() => setPreviewTest(test)}
                            title="Preview Questions"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteTest(test._id, e)}
                            title="Delete Test"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* 3-Step Create Online Test Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreateTestWizardModal
            onClose={() => setIsCreateModalOpen(false)}
            onTestCreated={(newTest) => {
              setTests(prev => [newTest, ...prev]);
              setIsCreateModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      {/* Preview Questions Modal */}
      <AnimatePresence>
        {previewTest && (
          <PreviewTestModal
            test={previewTest}
            onClose={() => setPreviewTest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Single 3-Step Wizard Modal for Online Test Creation
 */
function CreateTestWizardModal({ onClose, onTestCreated }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // STEP 1 STATE: Test & Audience Details
  const [moduleId, setModuleId] = useState('CRT');
  const [subcategory, setSubcategory] = useState('aptitude');
  const [title, setTitle] = useState('CRT Quantitative Aptitude Assessment');
  const [description, setDescription] = useState('Online assessment for campus placement training.');
  const [duration, setDuration] = useState(30);
  
  // Format dates for input: YYYY-MM-DDTHH:MM
  const formatDateTimeLocal = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [startDateTime, setStartDateTime] = useState(() => formatDateTimeLocal(new Date()));
  const [endDateTime, setEndDateTime] = useState(() => {
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    return formatDateTimeLocal(nextWeek);
  });

  // Audience targeting
  const [campuses, setCampuses] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState(['all']);
  const [targetStudentCount, setTargetStudentCount] = useState(120);

  // STEP 2 STATE: Questions
  const [questions, setQuestions] = useState([]);
  const [isLoadingBank, setIsLoadingBank] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualQText, setManualQText] = useState('');
  const [manualOptions, setManualOptions] = useState(['', '', '', '']);
  const [manualCorrectAns, setManualCorrectAns] = useState('');

  // STEP 3 STATE: Review & Notifications
  const [notifyStudents, setNotifyStudents] = useState(true);

  // Fetch Campuses and Batches on mount
  useEffect(() => {
    async function fetchAudienceData() {
      try {
        const campRes = await getBatchCampuses().catch(() => getCampuses().catch(() => null));
        const campList = campRes?.data?.data || campRes?.data || [];
        if (Array.isArray(campList)) setCampuses(campList);

        const batchRes = await api.get('/batch-management').catch(() => null);
        const batchList = batchRes?.data?.data || batchRes?.data || [];
        if (Array.isArray(batchList)) setBatches(batchList);
      } catch (err) {
        console.warn('Audience fetch fallback:', err);
      }
    }
    fetchAudienceData();
  }, []);

  // Update Student Count when audience choices change
  useEffect(() => {
    async function calcStudentCount() {
      try {
        const res = await getStudentCount({
          campus: selectedCampus,
          batches: selectedBatches
        });
        if (res?.data?.count !== undefined) {
          setTargetStudentCount(res.data.count);
        }
      } catch {
        setTargetStudentCount(selectedBatches.includes('all') ? 120 : selectedBatches.length * 45);
      }
    }
    calcStudentCount();
  }, [selectedCampus, selectedBatches]);

  // Update default title when module/topic changes
  const handleModuleChange = (newMod) => {
    setModuleId(newMod);
    const modObj = MODULE_OPTIONS.find(m => m.id === newMod);
    const firstTopic = modObj?.topics[0]?.id || 'general';
    setSubcategory(firstTopic);
    setTitle(`${newMod} ${modObj?.topics[0]?.name || ''} Assessment`);
  };

  const handleTopicChange = (newTopic) => {
    setSubcategory(newTopic);
    const modObj = MODULE_OPTIONS.find(m => m.id === moduleId);
    const topicObj = modObj?.topics.find(t => t.id === newTopic);
    setTitle(`${moduleId} ${topicObj?.name || newTopic} Assessment`);
  };

  // Auto-pull 25 questions from Question Bank
  const handleAutoPullBank = async () => {
    try {
      setIsLoadingBank(true);
      const res = await getAutoPracticeQuestions(moduleId, subcategory, 25);
      const bankQuestions = res?.data?.questions || [];
      if (bankQuestions.length > 0) {
        setQuestions(bankQuestions);
        toast.success(`Loaded ${bankQuestions.length} questions from Question Bank!`);
      } else {
        toast.error('No questions available for this topic in Question Bank');
      }
    } catch (err) {
      toast.error('Failed to pull questions from bank');
    } finally {
      setIsLoadingBank(false);
    }
  };

  // Download Sample CSV
  const handleDownloadSampleCsv = () => {
    const csvContent =
      "question,option_a,option_b,option_c,option_d,correct_answer\n" +
      '"What is the primary function of an operating system?","Hardware management","Word processing","Painting","None","Hardware management"\n' +
      '"A train covers 120 km in 2 hours. What is its speed?","50 km/h","60 km/h","70 km/h","80 km/h","60 km/h"\n' +
      '"Choose the synonym of METICULOUS:","Careless","Thorough","Hasty","Vague","Thorough"';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `test_questions_template_${subcategory}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Sample CSV template downloaded!');
  };

  // File Upload Handler (CSV or Excel)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = parseRowsToQuestions(results.data);
          if (parsed.length > 0) {
            setQuestions(prev => [...prev, ...parsed]);
            toast.success(`Imported ${parsed.length} questions from CSV!`);
          } else {
            toast.error('Could not find valid question rows in CSV file');
          }
        },
        error: (err) => {
          toast.error(`CSV parsing error: ${err.message}`);
        }
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          const parsed = parseRowsToQuestions(data);
          if (parsed.length > 0) {
            setQuestions(prev => [...prev, ...parsed]);
            toast.success(`Imported ${parsed.length} questions from Excel!`);
          } else {
            toast.error('Could not find valid question rows in Excel file');
          }
        } catch (err) {
          toast.error(`Excel parsing error: ${err.message}`);
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error('Please upload a .csv, .xlsx, or .xls file');
    }

    // Reset input
    e.target.value = '';
  };

  // Row Parser Helper (Supports both MCQ and Speaking Sentences)
  const parseRowsToQuestions = (rows) => {
    const result = [];
    const isSpeakingTest = String(moduleId || '').toUpperCase().includes('SPEAKING');

    rows.forEach((row, idx) => {
      const qText = row.question || row.text || row.Question || row.QUESTION || row['Question Text'];
      if (!qText) return;

      const optA = row.option_a || row.option1 || row['Option A'] || row.A || '';
      const optB = row.option_b || row.option2 || row['Option B'] || row.B || '';
      const optC = row.option_c || row.option3 || row['Option C'] || row.C || '';
      const optD = row.option_d || row.option4 || row['Option D'] || row.D || '';
      const options = [optA, optB, optC, optD].filter(Boolean);

      const isSpeakingRow = isSpeakingTest || !!row.reference_text || options.length === 0;
      const refText = row.reference_text || (isSpeakingRow ? String(qText).trim() : '');
      const correctAns = row.correct_answer || row.answer || row.CorrectAnswer || row.Answer || (isSpeakingRow ? refText : optA);

      result.push({
        id: `upload_${Date.now()}_${idx}`,
        text: String(qText).trim(),
        reference_text: refText,
        options: options.length >= 2 ? options : [],
        correct_answer: String(correctAns).trim(),
        question_type: isSpeakingRow ? 'audio_to_text' : 'mcq',
        conversion_type: isSpeakingRow ? 'audio_to_text' : 'none',
        time_limit_seconds: isSpeakingRow ? 30 : 60,
        subcategory: subcategory
      });
    });
    return result;
  };

  // Add Manual Question
  const handleAddManualQuestion = () => {
    if (!manualQText.trim()) {
      toast.error('Question text is required');
      return;
    }
    const cleanOpts = manualOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOpts.length < 2) {
      toast.error('Provide at least 2 options');
      return;
    }
    const ans = manualCorrectAns.trim() || cleanOpts[0];

    const newQ = {
      id: `manual_${Date.now()}`,
      text: manualQText.trim(),
      options: cleanOpts,
      correct_answer: ans,
      question_type: 'mcq',
      subcategory: subcategory
    };

    setQuestions(prev => [newQ, ...prev]);
    setManualQText('');
    setManualOptions(['', '', '', '']);
    setManualCorrectAns('');
    setShowManualForm(false);
    toast.success('Question added!');
  };

  // Remove Question
  const handleRemoveQuestion = (idxToRemove) => {
    setQuestions(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  // Publish / Submit Test
  const handlePublishTest = async () => {
    if (!title.trim()) {
      toast.error('Please enter a test title');
      setCurrentStep(1);
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add or upload at least 1 question');
      setCurrentStep(2);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        title: title.trim(),
        description: description.trim(),
        module_id: moduleId,
        subcategory: subcategory,
        duration: parseInt(duration, 10) || 30,
        startDateTime: new Date(startDateTime),
        endDateTime: new Date(endDateTime),
        test_type: 'online_exam',
        target_campus_ids: selectedCampus === 'all' ? [] : [selectedCampus],
        target_batch_ids: selectedBatches.includes('all') ? [] : selectedBatches,
        questions: questions,
        notify_students: notifyStudents
      };

      const res = await createOnlineTest(payload);
      toast.success('Online Test Published Successfully!');
      if (onTestCreated) {
        onTestCreated(res.data?.data || res.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create online test');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
              <h2 className="text-xl font-bold text-slate-900">Create Online Test</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete the 3 simple steps to schedule and publish the online assessment.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3-Step Wizard Navigation Pills */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 grid grid-cols-3 gap-2 text-xs font-semibold">
          <button
            onClick={() => setCurrentStep(1)}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all ${
              currentStep === 1
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">1</span>
            <span>Test & Audience</span>
          </button>

          <button
            onClick={() => {
              if (!title.trim()) {
                toast.error('Please enter a test title');
                return;
              }
              setCurrentStep(2);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all ${
              currentStep === 2
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">2</span>
            <span>Questions & Preview</span>
            {questions.length > 0 && (
              <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {questions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              if (questions.length === 0) {
                toast.error('Add questions in Step 2 before reviewing');
                return;
              }
              setCurrentStep(3);
            }}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl transition-all ${
              currentStep === 3
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px]">3</span>
            <span>Review & Publish</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          
          {/* STEP 1: TEST & AUDIENCE DETAILS */}
          {currentStep === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Module & Topic Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Module & Assessment Topic
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  {MODULE_OPTIONS.map(mod => {
                    const isSelected = moduleId === mod.id;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => handleModuleChange(mod.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex items-start gap-3 ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{mod.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{mod.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Subcategories / Topics Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs font-medium text-slate-400 mr-1">Topic:</span>
                  {MODULE_OPTIONS.find(m => m.id === moduleId)?.topics.map(topic => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => handleTopicChange(topic.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        subcategory === topic.id
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {topic.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* General Test Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Test Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. TCS NQT Quantitative Aptitude Assessment"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Instructions / Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Brief instructions or notes for the exam takers..."
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Duration (Minutes)
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      min="5"
                      max="300"
                      value={duration}
                      onChange={e => setDuration(Math.max(1, parseInt(e.target.value) || 30))}
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Exam Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={startDateTime}
                    onChange={e => setStartDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Exam Expiry / End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={endDateTime}
                    onChange={e => setEndDateTime(e.target.value)}
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Target Students / Audience */}
              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-indigo-600" />
                      Target Students & Batches
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Designate which campuses and student batches will be assigned this test.
                    </p>
                  </div>

                  {/* Real-time Student Count Badge */}
                  <div className="bg-indigo-100/70 border border-indigo-200 text-indigo-800 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <span>🎯</span>
                    <span>{targetStudentCount} Students Target</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Campus
                    </label>
                    <select
                      value={selectedCampus}
                      onChange={e => setSelectedCampus(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="all">All Campuses (Entire Institution)</option>
                      {campuses.map(camp => (
                        <option key={camp._id} value={camp._id}>
                          {camp.name || camp.campus_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Student Batches
                    </label>
                    <select
                      value={selectedBatches[0] || 'all'}
                      onChange={e => setSelectedBatches([e.target.value])}
                      className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    >
                      <option value="all">All Active Batches</option>
                      {batches.map(batch => (
                        <option key={batch._id} value={batch._id}>
                          {batch.name || batch.batch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: QUESTIONS UPLOAD & QUESTIONS SHOWING */}
          {currentStep === 2 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Question Add Action Bar */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {questions.length}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Questions Loaded</h4>
                    <p className="text-xs text-slate-500">
                      {questions.length === 0
                        ? 'No questions loaded yet. Use the actions on the right.'
                        : 'Review questions below before proceeding to final review.'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Auto-pull 25 Questions */}
                  <button
                    type="button"
                    onClick={handleAutoPullBank}
                    disabled={isLoadingBank}
                    className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{isLoadingBank ? 'Pulling 25...' : '⚡ Auto-Pull 25 from Bank'}</span>
                  </button>

                  {/* CSV Template */}
                  <button
                    type="button"
                    onClick={handleDownloadSampleCsv}
                    className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                    title="Download Sample CSV Format"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Template</span>
                  </button>

                  {/* Upload CSV/Excel */}
                  <label className="inline-flex items-center justify-center gap-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 px-3.5 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-sm transition-all">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV/Excel</span>
                    <input
                      type="file"
                      accept=".csv, .xlsx, .xls"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {/* Add Manual Question Toggle */}
                  <button
                    type="button"
                    onClick={() => setShowManualForm(!showManualForm)}
                    className="inline-flex items-center justify-center gap-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 px-3 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Manual</span>
                  </button>
                </div>
              </div>

              {/* Manual Question Inline Form */}
              <AnimatePresence>
                {showManualForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                        Add Custom Question
                      </h5>
                      <button
                        onClick={() => setShowManualForm(false)}
                        className="text-slate-400 hover:text-slate-600 text-xs"
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder="Enter question text here..."
                      value={manualQText}
                      onChange={e => setManualQText(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {manualOptions.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                          value={opt}
                          onChange={e => {
                            const newOpts = [...manualOptions];
                            newOpts[oIdx] = e.target.value;
                            setManualOptions(newOpts);
                          }}
                          className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none"
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <input
                        type="text"
                        placeholder="Correct Answer (Exact text or Option)"
                        value={manualCorrectAns}
                        onChange={e => setManualCorrectAns(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualQuestion}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-sm"
                      >
                        Save Question
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Questions List & Showing */}
              {questions.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">No Questions Loaded Yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Click <strong>"Auto-Pull 25 from Bank"</strong> to load 25 curated questions in one click, or upload your own CSV/Excel file.
                  </p>
                  <button
                    type="button"
                    onClick={handleAutoPullBank}
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Pull 25 Questions</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="space-y-2 flex-1">
                            <p className="text-sm font-semibold text-slate-900 leading-snug">
                              {q.text}
                            </p>
                            {Array.isArray(q.options) && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                {q.options.map((opt, oIdx) => {
                                  const isCorrect = String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`px-2.5 py-1 rounded-lg text-xs flex items-center justify-between ${
                                        isCorrect
                                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                                          : 'bg-slate-50 text-slate-600 border border-slate-100'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      {isCorrect && (
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-1" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(idx)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 3: REVIEW & NOTIFICATION */}
          {currentStep === 3 && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              {/* Summary Card */}
              <div className="bg-gradient-to-br from-indigo-50/70 to-blue-50/70 p-6 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white">
                    {moduleId} • {subcategory}
                  </span>
                  <span className="text-xs text-indigo-700 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {duration} Minutes
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-slate-900">{title}</h3>
                  {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block mb-0.5">Start Date</span>
                    <strong className="text-slate-800">{new Date(startDateTime).toLocaleString()}</strong>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block mb-0.5">End Date</span>
                    <strong className="text-slate-800">{new Date(endDateTime).toLocaleString()}</strong>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block mb-0.5">Enrolled Audience</span>
                    <strong className="text-indigo-600">{targetStudentCount} Students</strong>
                  </div>
                  <div className="bg-white/80 p-3 rounded-xl border border-indigo-100">
                    <span className="text-slate-400 block mb-0.5">Questions Count</span>
                    <strong className="text-emerald-600">{questions.length} Questions</strong>
                  </div>
                </div>
              </div>

              {/* Notification Settings */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="notify-students-check"
                  checked={notifyStudents}
                  onChange={e => setNotifyStudents(e.target.checked)}
                  className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="notify-students-check" className="cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    <span className="text-sm font-bold text-slate-900">
                      Send Test Notification to Enrolled Students
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When checked, an in-app exam alert will be broadcast to the {targetStudentCount} targeted students.
                    The exam will appear automatically in their <strong>Online Exams</strong> dashboard.
                  </p>
                </label>
              </div>

              {/* Notice */}
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Once published, students will be able to take this assessment during the scheduled window. You can monitor responses and scores from Campus Reports.
                </span>
              </div>
            </motion.div>
          )}

        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep(currentStep - 1)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/80 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/80 transition-colors"
            >
              Cancel
            </button>
          )}

          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 1) {
                  if (!title.trim()) {
                    toast.error('Please enter a test title');
                    return;
                  }
                  setCurrentStep(2);
                } else if (currentStep === 2) {
                  if (questions.length === 0) {
                    toast.error('Please add or pull at least 1 question');
                    return;
                  }
                  setCurrentStep(3);
                }
              }}
              className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all"
            >
              <span>Next Step</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublishTest}
              disabled={submitting}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-emerald-200 transition-all disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <LoadingSpinner />
                  <span>Publishing Test...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Publish Online Test</span>
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Preview Test Modal
 */
function PreviewTestModal({ test, onClose }) {
  const questions = Array.isArray(test.questions) ? test.questions : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white w-full max-w-3xl max-h-[88vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              {test.module_id || 'CRT'} • {test.subcategory || 'General'}
            </span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">{test.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div>
              <span className="text-slate-400">Duration: </span>
              <strong>{test.duration || 30} mins</strong>
            </div>
            <div>
              <span className="text-slate-400">Total Questions: </span>
              <strong>{questions.length}</strong>
            </div>
            <div>
              <span className="text-slate-400">Status: </span>
              <strong className="capitalize">{test.status || 'Active'}</strong>
            </div>
          </div>

          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Questions ({questions.length})
          </h4>

          {questions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No questions loaded for this test.</p>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1 space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{q.text}</p>
                      {Array.isArray(q.options) && (
                        <div className="grid grid-cols-2 gap-1.5 text-xs">
                          {q.options.map((opt, oIdx) => {
                            const isCorrect = String(opt).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase();
                            return (
                              <div
                                key={oIdx}
                                className={`px-2.5 py-1 rounded-lg ${
                                  isCorrect
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium'
                                    : 'bg-slate-50 text-slate-600'
                                }`}
                              >
                                {opt}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </div>
  );
}
