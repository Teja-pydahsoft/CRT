import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { toast } from 'react-hot-toast';
import {
  Calculator,
  Brain,
  Code,
  BookOpen,
  Target,
  Award,
  Layers,
  Upload,
  Download,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Search,
  Sparkles,
  X,
  ChevronRight,
  Filter,
  FileText,
  RefreshCw,
  HelpCircle,
  AlertCircle,
  Check,
  Headphones,
  Mic,
  Volume2,
  Play,
  Square,
  Radio,
  FileCode,
  Info
} from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  getCrtModules,
  createCrtModule,
  updateCrtModule,
  deleteCrtModule,
  createCrtTopic,
  updateCrtTopic,
  deleteCrtTopic,
  getCrtQuestions,
  createCrtQuestion,
  bulkUploadCrtQuestions,
  updateCrtQuestion,
  deleteCrtQuestion,
  getCrtStats
} from '../../services/api';

// Icon Map for Dynamic Modules
const ICON_MAP = {
  Calculator: Calculator,
  Brain: Brain,
  Code: Code,
  BookOpen: BookOpen,
  Target: Target,
  Award: Award,
  Layers: Layers,
  Headphones: Headphones,
  Mic: Mic
};

const COLOR_MAP = {
  indigo: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-200',
    text: 'text-indigo-700',
    activeBg: 'bg-indigo-600 text-white',
    badge: 'bg-indigo-100 text-indigo-800',
    ring: 'focus:ring-indigo-500',
    gradient: 'from-indigo-600 to-blue-600'
  },
  emerald: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    activeBg: 'bg-emerald-600 text-white',
    badge: 'bg-emerald-100 text-emerald-800',
    ring: 'focus:ring-emerald-500',
    gradient: 'from-emerald-600 to-teal-600'
  },
  purple: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    activeBg: 'bg-purple-600 text-white',
    badge: 'bg-purple-100 text-purple-800',
    ring: 'focus:ring-purple-500',
    gradient: 'from-purple-600 to-violet-600'
  },
  amber: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    activeBg: 'bg-amber-600 text-white',
    badge: 'bg-amber-100 text-amber-800',
    ring: 'focus:ring-amber-500',
    gradient: 'from-amber-600 to-orange-600'
  },
  rose: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    activeBg: 'bg-rose-600 text-white',
    badge: 'bg-rose-100 text-rose-800',
    ring: 'focus:ring-rose-500',
    gradient: 'from-rose-600 to-red-600'
  }
};

const DEFAULT_LEVEL_PRESETS = [
  { level: 1, name: 'Level 1 (Beginner)', description: 'Fundamental concepts, basic formulas & direct problems' },
  { level: 2, name: 'Level 2 (Intermediate)', description: 'Standard exam problems & moderate multi-step questions' },
  { level: 3, name: 'Level 3 (Advanced)', description: 'Complex scenarios, high difficulty & speed tricks' },
  { level: 4, name: 'Level 4 (Expert)', description: 'Campus placement round 2 and competitive benchmarks' },
  { level: 5, name: 'Level 5 (Mastery)', description: 'Mastery tier, deep analytical and optimization queries' }
];

// System Conversion Types
const SYSTEM_CONVERSION_TYPES = [
  {
    id: 'none',
    label: 'Standard MCQ / Written',
    sublabel: 'Multiple choice text question',
    icon: FileText,
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Standard question with text options (A, B, C, D) and correct answer.'
  },
  {
    id: 'text_to_audio',
    label: 'Text to Audio (TTS)',
    sublabel: 'System generates & speaks voice prompt',
    icon: Volume2,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    description: 'Text-to-Speech (TTS): System converts written text/dialogue into spoken audio for listening comprehension.'
  },
  {
    id: 'audio_to_text',
    label: 'Audio to Text (STT / Versant)',
    sublabel: 'Student speaks, AI transcribes & grades',
    icon: Mic,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    description: 'Speech-to-Text (STT): Student speaks into microphone; AI Whisper transcribes and evaluates pronunciation & fluency against reference text.'
  },
  {
    id: 'both',
    label: 'Dual Voice AI (TTS + STT)',
    sublabel: 'Interactive Versant (Audio Prompt + Spoken Response)',
    icon: Headphones,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    description: 'Complete Versant cycle: System speaks audio prompt via TTS, and candidate responds or repeats via microphone for STT grading.'
  },
  {
    id: 'technical',
    label: 'Technical / Coding',
    sublabel: 'Programming code stub & output',
    icon: FileCode,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    description: 'Coding question with code stubs, language configuration, and expected output validation.'
  }
];

export default function CRTUpload() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalModules: 0, totalTopics: 0, totalQuestions: 0 });

  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedConversionFilter, setSelectedConversionFilter] = useState('all');

  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Audio Playback State
  const [playingScript, setPlayingScript] = useState('');

  // Modals state
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [moduleForm, setModuleForm] = useState({
    name: '',
    code: '',
    description: '',
    icon: 'BookOpen',
    color: 'indigo'
  });

  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState(null);
  const [topicForm, setTopicForm] = useState({
    name: '',
    code: '',
    description: '',
    levels: [
      { level: 1, name: 'Level 1 (Beginner)', description: '' },
      { level: 2, name: 'Level 2 (Intermediate)', description: '' },
      { level: 3, name: 'Level 3 (Advanced)', description: '' }
    ]
  });

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    text: '',
    conversion_type: 'none',
    question_type: 'mcq',
    options: ['', '', '', ''],
    correct_answer: '',
    reference_text: '',
    audio_script: '',
    time_limit_seconds: 45,
    code_stub: '',
    expected_output: '',
    explanation: '',
    level_id: 1
  });

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [parsedUploadRows, setParsedUploadRows] = useState([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadSubmitting, setUploadSubmitting] = useState(false);

  // Active module & topic references
  const currentModule = useMemo(() => {
    return modules.find(m => String(m._id) === String(selectedModuleId) || m.code === selectedModuleId) || modules[0] || null;
  }, [modules, selectedModuleId]);

  const currentTopic = useMemo(() => {
    if (!currentModule || !currentModule.topics) return null;
    return currentModule.topics.find(t => String(t._id) === String(selectedTopicId) || t.code === selectedTopicId) || currentModule.topics[0] || null;
  }, [currentModule, selectedTopicId]);

  // Audio preview helper using browser Web Speech API
  const handlePlayAudio = (text) => {
    if (!text || !text.trim()) {
      toast.error('No speech text or script provided');
      return;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.rate = 0.95;
      utterance.lang = 'en-US';
      utterance.onstart = () => setPlayingScript(text);
      utterance.onend = () => setPlayingScript('');
      utterance.onerror = () => setPlayingScript('');
      window.speechSynthesis.speak(utterance);
      toast.success('Playing audio prompt...', { icon: '🔊', duration: 2000 });
    } else {
      toast.error('Browser speech synthesis is not supported on this device');
    }
  };

  const handleStopAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setPlayingScript('');
    }
  };

  // Load modules & stats
  const fetchStructure = useCallback(async (preserveSelection = true) => {
    try {
      setLoading(true);
      const [modRes, statRes] = await Promise.all([
        getCrtModules(),
        getCrtStats().catch(() => ({ data: { data: {} } }))
      ]);

      const modList = modRes?.data?.data || [];
      setModules(modList);
      if (statRes?.data?.data) {
        setStats(statRes.data.data);
      }

      if (modList.length > 0) {
        if (!preserveSelection || !selectedModuleId) {
          const firstMod = modList[0];
          setSelectedModuleId(String(firstMod._id));
          if (firstMod.topics && firstMod.topics.length > 0) {
            setSelectedTopicId(String(firstMod.topics[0]._id));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching CRT structure:', err);
      toast.error('Failed to load CRT modules');
    } finally {
      setLoading(false);
    }
  }, [selectedModuleId]);

  useEffect(() => {
    fetchStructure(false);
  }, []);

  // When selected module changes, update active topic
  useEffect(() => {
    if (currentModule) {
      const topics = currentModule.topics || [];
      const topicExists = topics.some(t => String(t._id) === String(selectedTopicId) || t.code === selectedTopicId);
      if (!topicExists && topics.length > 0) {
        setSelectedTopicId(String(topics[0]._id));
      } else if (topics.length === 0) {
        setSelectedTopicId('');
      }
      setSelectedLevel('all');
    }
  }, [currentModule]);

  // Load questions for active module, topic, level, conversion type
  const loadQuestions = useCallback(async () => {
    if (!currentModule || !currentTopic) {
      setQuestions([]);
      return;
    }

    try {
      setQuestionsLoading(true);
      const params = {
        module_id: currentModule.code || currentModule._id,
        topic_id: currentTopic._id || currentTopic.code,
        level_id: selectedLevel !== 'all' ? selectedLevel : undefined,
        conversion_type: selectedConversionFilter !== 'all' ? selectedConversionFilter : undefined,
        limit: 100
      };

      const res = await getCrtQuestions(params);
      const list = res?.data?.data?.questions || [];
      setQuestions(list);
    } catch (err) {
      console.error('Error loading questions:', err);
      toast.error('Failed to load questions for this topic');
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [currentModule, currentTopic, selectedLevel, selectedConversionFilter]);

  useEffect(() => {
    if (currentModule && currentTopic) {
      loadQuestions();
    }
  }, [currentModule, currentTopic, selectedLevel, selectedConversionFilter, loadQuestions]);

  // -------------------------------------------------------------
  // MODULE ACTIONS
  // -------------------------------------------------------------
  const handleOpenModuleModal = (mod = null) => {
    if (mod) {
      setEditingModule(mod);
      setModuleForm({
        name: mod.name || '',
        code: mod.code || '',
        description: mod.description || '',
        icon: mod.icon || 'BookOpen',
        color: mod.color || 'indigo'
      });
    } else {
      setEditingModule(null);
      setModuleForm({
        name: '',
        code: '',
        description: '',
        icon: 'BookOpen',
        color: 'indigo'
      });
    }
    setIsModuleModalOpen(true);
  };

  const handleSaveModule = async (e) => {
    e.preventDefault();
    if (!moduleForm.name.trim()) {
      toast.error('Module name is required');
      return;
    }

    try {
      if (editingModule) {
        await updateCrtModule(editingModule._id, moduleForm);
        toast.success(`Module '${moduleForm.name}' updated!`);
      } else {
        const res = await createCrtModule(moduleForm);
        toast.success(`Main module '${moduleForm.name}' created!`);
        if (res?.data?.data?._id) {
          setSelectedModuleId(String(res.data.data._id));
        }
      }
      setIsModuleModalOpen(false);
      await fetchStructure(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save module');
    }
  };

  const handleDeleteModule = async (mod, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete module '${mod.name}'? This will also remove its topics.`)) {
      return;
    }
    try {
      await deleteCrtModule(mod._id);
      toast.success(`Module '${mod.name}' deleted!`);
      await fetchStructure(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete module');
    }
  };

  // -------------------------------------------------------------
  // TOPIC & LEVEL ACTIONS (WITH LEVEL SELECTION PROMPT)
  // -------------------------------------------------------------
  const handleOpenTopicModal = (topic = null) => {
    if (topic) {
      setEditingTopic(topic);
      setTopicForm({
        name: topic.name || '',
        code: topic.code || '',
        description: topic.description || '',
        levels: topic.levels && topic.levels.length > 0
          ? topic.levels.map(l => ({ level: l.level, name: l.name, description: l.description || '' }))
          : [
              { level: 1, name: 'Level 1 (Beginner)', description: '' },
              { level: 2, name: 'Level 2 (Intermediate)', description: '' },
              { level: 3, name: 'Level 3 (Advanced)', description: '' }
            ]
      });
    } else {
      setEditingTopic(null);
      setTopicForm({
        name: '',
        code: '',
        description: '',
        levels: [
          { level: 1, name: 'Level 1 (Beginner)', description: '' },
          { level: 2, name: 'Level 2 (Intermediate)', description: '' },
          { level: 3, name: 'Level 3 (Advanced)', description: '' }
        ]
      });
    }
    setIsTopicModalOpen(true);
  };

  const handleTogglePresetLevel = (preset) => {
    setTopicForm(prev => {
      const exists = prev.levels.some(l => l.level === preset.level);
      if (exists) {
        if (prev.levels.length <= 1) {
          toast.error('A topic must have at least one level configured');
          return prev;
        }
        return {
          ...prev,
          levels: prev.levels.filter(l => l.level !== preset.level)
        };
      } else {
        const updated = [...prev.levels, { level: preset.level, name: preset.name, description: preset.description }];
        updated.sort((a, b) => a.level - b.level);
        return { ...prev, levels: updated };
      }
    });
  };

  const handleAddCustomLevel = () => {
    setTopicForm(prev => {
      const maxLvl = prev.levels.length > 0 ? Math.max(...prev.levels.map(l => l.level)) : 0;
      const nextNum = maxLvl + 1;
      return {
        ...prev,
        levels: [
          ...prev.levels,
          { level: nextNum, name: `Level ${nextNum}`, description: `Custom level ${nextNum}` }
        ]
      };
    });
  };

  const handleUpdateLevelName = (index, newName) => {
    setTopicForm(prev => {
      const copy = [...prev.levels];
      copy[index] = { ...copy[index], name: newName };
      return { ...prev, levels: copy };
    });
  };

  const handleRemoveLevel = (index) => {
    setTopicForm(prev => {
      if (prev.levels.length <= 1) {
        toast.error('A topic must have at least one level configured');
        return prev;
      }
      const copy = prev.levels.filter((_, i) => i !== index);
      return { ...prev, levels: copy };
    });
  };

  const handleSaveTopic = async (e) => {
    e.preventDefault();
    if (!topicForm.name.trim()) {
      toast.error('Topic name is required');
      return;
    }
    if (!topicForm.levels || topicForm.levels.length === 0) {
      toast.error('Please select or configure at least one level for this topic!');
      return;
    }

    try {
      if (editingTopic) {
        await updateCrtTopic(currentModule._id, editingTopic._id, topicForm);
        toast.success(`Topic '${topicForm.name}' and level selections updated!`);
      } else {
        const res = await createCrtTopic(currentModule._id, topicForm);
        toast.success(`Topic '${topicForm.name}' created with ${topicForm.levels.length} levels!`);
        if (res?.data?.data?._id) {
          setSelectedTopicId(String(res.data.data._id));
        }
      }
      setIsTopicModalOpen(false);
      await fetchStructure(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save topic');
    }
  };

  const handleDeleteTopic = async (topic, e) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete topic '${topic.name}'?`)) {
      return;
    }
    try {
      await deleteCrtTopic(currentModule._id, topic._id);
      toast.success(`Topic '${topic.name}' deleted!`);
      await fetchStructure(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete topic');
    }
  };

  // -------------------------------------------------------------
  // QUESTION MANAGEMENT WITH CONVERSION SYSTEM TYPES
  // -------------------------------------------------------------
  const handleOpenQuestionModal = (q = null) => {
    const availableLevels = currentTopic?.levels || [];
    const defaultLevel = selectedLevel !== 'all' ? Number(selectedLevel) : (availableLevels[0]?.level || 1);

    if (q) {
      setEditingQuestion(q);
      setQuestionForm({
        text: q.text || '',
        conversion_type: q.conversion_type || 'none',
        question_type: q.question_type || 'mcq',
        options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['', '', '', ''],
        correct_answer: q.correct_answer || (q.options ? q.options[0] : ''),
        reference_text: q.reference_text || '',
        audio_script: q.audio_script || '',
        time_limit_seconds: q.time_limit_seconds || 45,
        code_stub: q.code_stub || '',
        expected_output: q.expected_output || '',
        explanation: q.explanation || '',
        level_id: q.level_id || defaultLevel
      });
    } else {
      // Default to sensible conversion type based on current topic or module
      let defaultConv = 'none';
      let defaultType = 'mcq';
      if (currentTopic?.code?.includes('reading') || currentTopic?.code?.includes('speaking') || currentTopic?.name?.includes('Audio-to-Text')) {
        defaultConv = 'audio_to_text';
        defaultType = 'audio_to_text';
      } else if (currentTopic?.code?.includes('repeat') || currentTopic?.name?.includes('Dual Voice')) {
        defaultConv = 'both';
        defaultType = 'audio_interactive';
      } else if (currentTopic?.code?.includes('listening') || currentTopic?.name?.includes('Text-to-Audio')) {
        defaultConv = 'text_to_audio';
        defaultType = 'text_to_audio';
      }

      setEditingQuestion(null);
      setQuestionForm({
        text: '',
        conversion_type: defaultConv,
        question_type: defaultType,
        options: ['', '', '', ''],
        correct_answer: '',
        reference_text: '',
        audio_script: '',
        time_limit_seconds: 45,
        code_stub: '',
        expected_output: '',
        explanation: '',
        level_id: defaultLevel
      });
    }
    setIsQuestionModalOpen(true);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!questionForm.text.trim()) {
      toast.error('Question text or prompt statement is required');
      return;
    }

    const conv = questionForm.conversion_type;
    const cleanOpts = questionForm.options.map(o => String(o).trim()).filter(Boolean);

    // Validate options only for standard MCQ
    if (conv === 'none' && questionForm.question_type === 'mcq' && cleanOpts.length < 2) {
      toast.error('At least 2 options are required for Multiple Choice questions');
      return;
    }

    // Reference text for speech scoring
    const refText = questionForm.reference_text.trim() || (conv === 'audio_to_text' || conv === 'both' ? questionForm.text.trim() : '');
    const script = questionForm.audio_script.trim() || (conv === 'text_to_audio' || conv === 'both' ? questionForm.text.trim() : '');
    const ans = questionForm.correct_answer.trim() || (cleanOpts.length > 0 ? cleanOpts[0] : refText);

    const payload = {
      ...questionForm,
      options: cleanOpts,
      reference_text: refText,
      audio_script: script,
      correct_answer: ans,
      module_id: currentModule.code,
      main_module_id: currentModule._id,
      topic_id: currentTopic._id,
      subcategory: currentTopic.code || currentTopic.name,
      level_name: `Level ${questionForm.level_id}`
    };

    try {
      if (editingQuestion) {
        await updateCrtQuestion(editingQuestion._id, payload);
        toast.success('Question updated successfully!');
      } else {
        await createCrtQuestion(payload);
        toast.success('Question added to bank!');
      }
      setIsQuestionModalOpen(false);
      await loadQuestions();
      await fetchStructure(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save question');
    }
  };

  const handleDeleteQuestion = async (qId) => {
    if (!window.confirm('Are you sure you want to delete this question?')) {
      return;
    }
    try {
      await deleteCrtQuestion(qId);
      toast.success('Question deleted successfully');
      setQuestions(prev => prev.filter(q => q._id !== qId));
      fetchStructure(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete question');
    }
  };

  // -------------------------------------------------------------
  // TEMPLATE DOWNLOAD & FILE UPLOAD (SUPPORTING SYSTEM TYPES)
  // -------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const lvlNum = selectedLevel !== 'all' ? selectedLevel : 1;

    // Comprehensive template featuring Text-to-Audio (TTS), Audio-to-Text (STT), Dual Voice AI, and MCQ
    const csvContent =
      'question,conversion_type,question_type,audio_script,reference_text,option_a,option_b,option_c,option_d,correct_answer,explanation,level\n' +
      `"Listen to the announcement and identify the departure time.","text_to_audio","text_to_audio","Attention passengers. The express train bound for Central Station departs promptly from Platform 4 at quarter past nine.","","8:45 AM","9:15 AM","9:45 AM","10:15 AM","9:15 AM","Text-to-Audio (TTS): System plays synthesized voice audio, student answers comprehension.",${lvlNum}\n` +
      `"Read the following sentence aloud clearly into the microphone.","audio_to_text","audio_to_text","","Traffic congestion has become a major challenge for modern urban cities worldwide.","","","","","Traffic congestion has become a major challenge for modern urban cities worldwide.","Audio-to-Text (STT / Versant): Student speaks; AI evaluates pronunciation against reference text.",${lvlNum}\n` +
      `"Listen and repeat the sentence exactly as you hear it.","both","audio_interactive","Please leave your visitor badge at the reception desk before departing.","Please leave your visitor badge at the reception desk before departing.","","","","","Please leave your visitor badge at the reception desk before departing.","Dual Voice AI: System plays TTS audio prompt, student repeats via microphone for STT grading.",${lvlNum}\n` +
      `"A pipe can fill a tank in 6 hours and another empties it in 8 hours. Time taken together?","none","mcq","","","18 hrs","24 hrs","12 hrs","30 hrs","24 hrs","Standard MCQ: Net work = 1/6 - 1/8 = 1/24. Time = 24 hours.",${lvlNum}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CRT_Versant_Questions_Template_Level${lvlNum}.csv`;
    link.click();
    toast.success('Customized CSV template downloaded with Text-to-Audio and Audio-to-Text examples!');
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processParsedData(results.data);
        },
        error: () => toast.error('CSV parse error')
      });
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target.result, { type: 'binary' });
          const firstSheet = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet);
          processParsedData(rows);
        } catch {
          toast.error('Failed to parse Excel file');
        }
      };
      reader.readAsBinaryString(file);
    } else {
      toast.error('Please upload a .csv or .xlsx file');
    }
    e.target.value = '';
  };

  const processParsedData = (rows) => {
    const activeLvl = selectedLevel !== 'all' ? parseInt(selectedLevel, 10) : 1;
    const parsed = [];

    rows.forEach((r, idx) => {
      const qText = r.question || r.text || r.Question || r.QuestionText;
      if (!qText || !String(qText).trim()) return;

      const opts = [
        r.option_a || r.option1 || r['Option A'] || r['option A'],
        r.option_b || r.option2 || r['Option B'] || r['option B'],
        r.option_c || r.option3 || r['Option C'] || r['option C'],
        r.option_d || r.option4 || r['Option D'] || r['option D']
      ].map(o => (o !== undefined && o !== null) ? String(o).trim() : '').filter(Boolean);

      let convType = r.conversion_type || r.type || 'none';
      let qType = r.question_type || 'mcq';

      // Auto-detect conversion type from headers
      if (!convType || convType === 'none') {
        if (r.audio_script || qType === 'text_to_audio' || qType === 'listening') {
          convType = 'text_to_audio';
          qType = 'text_to_audio';
        } else if (r.reference_text || qType === 'audio_to_text' || qType === 'speaking') {
          convType = 'audio_to_text';
          qType = 'audio_to_text';
        } else if (qType === 'both' || qType === 'audio_interactive') {
          convType = 'both';
          qType = 'audio_interactive';
        }
      }

      const refText = r.reference_text || (convType === 'audio_to_text' || convType === 'both' ? String(qText).trim() : '');
      const script = r.audio_script || (convType === 'text_to_audio' || convType === 'both' ? String(qText).trim() : '');
      const ans = r.correct_answer || r.answer || r['Correct Answer'] || refText || (opts.length > 0 ? opts[0] : '');
      const expl = r.explanation || r.Explanation || '';
      const lvl = r.level ? parseInt(r.level, 10) : activeLvl;

      parsed.push({
        idx: idx + 1,
        text: String(qText).trim(),
        conversion_type: convType,
        question_type: qType,
        options: opts,
        correct_answer: String(ans).trim(),
        reference_text: String(refText).trim(),
        audio_script: String(script).trim(),
        explanation: String(expl).trim(),
        level_id: lvl || 1
      });
    });

    if (parsed.length > 0) {
      setParsedUploadRows(parsed);
      setIsUploadModalOpen(true);
      toast.success(`Parsed ${parsed.length} questions ready to upload!`);
    } else {
      toast.error('No valid question rows found in file');
    }
  };

  const handleConfirmUpload = async () => {
    if (!currentModule || !currentTopic) {
      toast.error('Please select a main module and topic first');
      return;
    }
    if (parsedUploadRows.length === 0) {
      toast.error('No questions to upload');
      return;
    }

    try {
      setUploadSubmitting(true);
      const payload = {
        module_id: currentModule.code,
        main_module_id: currentModule._id,
        topic_id: currentTopic._id,
        subcategory: currentTopic.code || currentTopic.name,
        level_id: selectedLevel !== 'all' ? parseInt(selectedLevel, 10) : 1,
        questions: parsedUploadRows
      };

      const res = await bulkUploadCrtQuestions(payload);
      toast.success(res?.data?.message || `Uploaded ${parsedUploadRows.length} questions successfully!`);
      setIsUploadModalOpen(false);
      setParsedUploadRows([]);
      setUploadFileName('');
      await loadQuestions();
      await fetchStructure(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Bulk upload failed');
    } finally {
      setUploadSubmitting(false);
    }
  };

  // Filtered questions by search term
  const filteredQuestions = useMemo(() => {
    if (!searchTerm.trim()) return questions;
    const term = searchTerm.toLowerCase();
    return questions.filter(q => {
      const inText = (q.text || '').toLowerCase().includes(term);
      const inAns = (String(q.correct_answer) || '').toLowerCase().includes(term);
      const inRef = (q.reference_text || '').toLowerCase().includes(term);
      const inScript = (q.audio_script || '').toLowerCase().includes(term);
      const inOpts = (q.options || []).some(o => String(o).toLowerCase().includes(term));
      return inText || inAns || inRef || inScript || inOpts;
    });
  }, [questions, searchTerm]);

  // Color config helper
  const currentColor = currentModule ? (COLOR_MAP[currentModule.color] || COLOR_MAP.indigo) : COLOR_MAP.indigo;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <LoadingSpinner />
        <p className="mt-4 text-slate-600 font-semibold text-sm animate-pulse">
          Loading Dynamic CRT &amp; Versant Question Bank...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* 1. Header Card with Versant Engine Callout */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 mb-2 border border-indigo-100">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>CRT &amp; Versant Assessment Portal</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                CRT &amp; Versant Question Bank Upload
              </h1>
              <p className="text-slate-500 text-sm mt-1 max-w-2xl leading-relaxed">
                Configure dynamic Main Modules, Topics with custom Level selections, and manage assessment question sets with bidirectional speech conversions.
              </p>

              {/* Metrics */}
              <div className="flex flex-wrap items-center gap-2.5 mt-4 text-xs font-semibold text-slate-600">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  {modules.length} Modules
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg">
                  <Target className="w-3.5 h-3.5 text-slate-500" />
                  {stats.totalTopics || modules.reduce((acc, m) => acc + (m.topics?.length || 0), 0)} Topics
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-lg">
                  <FileText className="w-3.5 h-3.5 text-slate-500" />
                  {stats.totalQuestions || 0} Total Questions
                </span>
              </div>
            </div>

            {/* Action Header Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Sample CSV Template</span>
              </button>

              <label className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Upload CSV / Excel</span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => handleOpenModuleModal()}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>New Main Module</span>
              </button>
            </div>
          </div>

          {/* Versant System Architecture Highlight Banner */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-purple-50/80 to-rose-50/80 rounded-2xl p-4 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xs shrink-0">
                <Headphones className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 block">
                  Versant Speech AI &amp; Audio Conversion Engine
                </span>
                <p className="text-slate-600 text-[11px] mt-0.5">
                  Versant assessments utilize <strong>Text-to-Audio (TTS voice prompts)</strong> for listening comprehension &amp; sentence prompts, and <strong>Audio-to-Text (AI Whisper speech recognition)</strong> to score pronunciation, word-match, and speaking fluency.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg font-bold text-[10px] text-blue-700 border border-blue-200 shadow-2xs">
                <Volume2 className="w-3 h-3 text-blue-600" />
                Text &rarr; Audio (TTS)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-white rounded-lg font-bold text-[10px] text-emerald-700 border border-emerald-200 shadow-2xs">
                <Mic className="w-3 h-3 text-emerald-600" />
                Audio &rarr; Text (STT)
              </span>
            </div>
          </div>
        </div>

        {/* 2. Main Modules Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Main Modules ({modules.length})
            </h2>
            <button
              onClick={() => handleOpenModuleModal()}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Module</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {modules.map((mod) => {
              const isSelected = String(mod._id) === String(selectedModuleId) || mod.code === selectedModuleId;
              const IconComp = ICON_MAP[mod.icon] || BookOpen;
              const col = COLOR_MAP[mod.color] || COLOR_MAP.indigo;

              return (
                <div
                  key={mod._id || mod.code}
                  onClick={() => setSelectedModuleId(String(mod._id))}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? `bg-white border-2 ${col.border} shadow-md ring-2 ring-offset-1 ${col.ring}`
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? col.bg : 'bg-slate-100 text-slate-600'} transition-colors`}>
                      <IconComp className={`w-5 h-5 ${isSelected ? col.text : 'text-slate-600'}`} />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        title="Edit Module"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenModuleModal(mod);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        title="Delete Module"
                        onClick={(e) => handleDeleteModule(mod, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 mt-2.5 text-sm group-hover:text-indigo-600 transition-colors truncate">
                    {mod.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                    {mod.description || 'No description provided'}
                  </p>

                  <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-100 text-xs">
                    <span className="font-semibold text-slate-600 text-[11px]">
                      {mod.topics?.length || 0} Topics
                    </span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${col.badge}`}>
                      {mod.question_count || 0} Qs
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Topics Bar inside Selected Module */}
        {currentModule && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Selected Module:</span>
                  <span className={`text-sm font-extrabold ${currentColor.text}`}>{currentModule.name}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{currentModule.description}</p>
              </div>

              <button
                onClick={() => handleOpenTopicModal()}
                className="inline-flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Topic with Levels</span>
              </button>
            </div>

            {/* Topic Pills */}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Topics ({currentModule.topics?.length || 0})
              </div>

              {(!currentModule.topics || currentModule.topics.length === 0) ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 font-semibold text-sm">No topics in this module yet</p>
                  <p className="text-slate-400 text-xs mt-1">Click "Add Topic with Levels" above to create your first topic.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {currentModule.topics.map(topic => {
                    const isTopicSelected = String(topic._id) === String(selectedTopicId) || topic.code === selectedTopicId;
                    return (
                      <div
                        key={topic._id || topic.code}
                        onClick={() => setSelectedTopicId(String(topic._id))}
                        className={`group inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isTopicSelected
                            ? `${currentColor.activeBg} shadow-sm border-transparent`
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        <span>{topic.name}</span>

                        {/* Level tags */}
                        <div className="flex items-center gap-1">
                          {(topic.levels || []).map(lvl => (
                            <span
                              key={lvl.level}
                              title={lvl.name}
                              className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                                isTopicSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              L{lvl.level}
                            </span>
                          ))}
                        </div>

                        {/* Question count */}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isTopicSelected ? 'bg-black/20 text-white' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {topic.question_count || 0}
                        </span>

                        {/* Action buttons */}
                        <div className="inline-flex items-center gap-0.5 ml-1 opacity-70 group-hover:opacity-100">
                          <button
                            title="Edit Topic & Levels"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenTopicModal(topic);
                            }}
                            className={`p-1 rounded hover:bg-black/10 transition-colors ${
                              isTopicSelected ? 'text-white' : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            title="Delete Topic"
                            onClick={(e) => handleDeleteTopic(topic, e)}
                            className={`p-1 rounded hover:bg-black/10 transition-colors ${
                              isTopicSelected ? 'text-white' : 'text-slate-500 hover:text-rose-600'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Active Topic & Level + System Type Filters + Questions Management */}
        {currentTopic && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            {/* Topic Info & Action */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-extrabold text-slate-900">{currentTopic.name}</h3>
                  <button
                    onClick={() => handleOpenTopicModal(currentTopic)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit Topic / Levels</span>
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{currentTopic.description || 'Topic question repository'}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenQuestionModal()}
                  className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Question</span>
                </button>
              </div>
            </div>

            {/* Level Tabs & Conversion System Filter */}
            <div className="space-y-3">
              {/* Level Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
                  Difficulty Level:
                </span>

                <button
                  onClick={() => setSelectedLevel('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    selectedLevel === 'all'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Levels ({questions.length})
                </button>

                {(currentTopic.levels || []).map(lvl => {
                  const isLvlSelected = String(selectedLevel) === String(lvl.level);
                  return (
                    <button
                      key={lvl.level}
                      onClick={() => setSelectedLevel(lvl.level)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        isLvlSelected
                          ? `${currentColor.activeBg} shadow-sm`
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{lvl.name}</span>
                      {lvl.question_count !== undefined && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                          isLvlSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {lvl.question_count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Conversion System Filter Pills */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                    System Type:
                  </span>

                  <button
                    onClick={() => setSelectedConversionFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedConversionFilter === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All Types
                  </button>

                  <button
                    onClick={() => setSelectedConversionFilter('text_to_audio')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedConversionFilter === 'text_to_audio'
                        ? 'bg-blue-600 text-white'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Text to Audio (TTS)</span>
                  </button>

                  <button
                    onClick={() => setSelectedConversionFilter('audio_to_text')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedConversionFilter === 'audio_to_text'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    <span>Audio to Text (STT)</span>
                  </button>

                  <button
                    onClick={() => setSelectedConversionFilter('both')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedConversionFilter === 'both'
                        ? 'bg-purple-600 text-white'
                        : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                    }`}
                  >
                    <Headphones className="w-3 h-3" />
                    <span>Dual Voice AI</span>
                  </button>

                  <button
                    onClick={() => setSelectedConversionFilter('none')}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedConversionFilter === 'none'
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <FileText className="w-3 h-3" />
                    <span>MCQ / Written</span>
                  </button>
                </div>

                {/* Search Box */}
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search prompt, answer, script..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Questions List */}
            {questionsLoading ? (
              <div className="py-12 flex flex-col items-center justify-center">
                <LoadingSpinner />
                <span className="text-xs text-slate-500 font-semibold mt-2">Loading questions...</span>
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-700 font-bold text-sm">No questions found</p>
                <p className="text-slate-400 text-xs mt-1 max-w-md mx-auto">
                  {searchTerm
                    ? 'No questions matched your search criteria. Try a different keyword.'
                    : `No questions found for this topic filter. Click 'Upload CSV / Excel' or 'Add Question' above.`}
                </p>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => handleOpenQuestionModal()}
                    className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Question</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-semibold text-slate-500">
                  Showing {filteredQuestions.length} questions
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {filteredQuestions.map((q, idx) => {
                    const convType = q.conversion_type || 'none';
                    const isPlaying = playingScript === (q.audio_script || q.text);

                    return (
                      <div
                        key={q._id || idx}
                        className="p-4 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            {/* Badges Row */}
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold text-[10px] rounded-md">
                                Q{idx + 1}
                              </span>

                              <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${currentColor.badge}`}>
                                Level {q.level_id || 1}
                              </span>

                              {/* System Conversion Badge */}
                              {convType === 'text_to_audio' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                  <Volume2 className="w-3 h-3" />
                                  <span>Text &rarr; Audio (TTS)</span>
                                </span>
                              )}

                              {convType === 'audio_to_text' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <Mic className="w-3 h-3" />
                                  <span>Audio &rarr; Text (STT / Versant)</span>
                                </span>
                              )}

                              {convType === 'both' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                                  <Headphones className="w-3 h-3" />
                                  <span>Dual Voice AI (TTS + STT)</span>
                                </span>
                              )}

                              {convType === 'none' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                  <FileText className="w-3 h-3" />
                                  <span>Multiple Choice (MCQ)</span>
                                </span>
                              )}

                              {q.time_limit_seconds && (convType === 'audio_to_text' || convType === 'both') && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  ⏱ {q.time_limit_seconds}s limit
                                </span>
                              )}
                            </div>

                            {/* Question prompt */}
                            <p className="text-sm font-semibold text-slate-900 leading-snug">
                              {q.text}
                            </p>

                            {/* Audio Script for Text-to-Audio */}
                            {(convType === 'text_to_audio' || convType === 'both') && (q.audio_script || q.text) && (
                              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
                                <div className="flex items-center gap-2">
                                  <Volume2 className="w-4 h-4 text-blue-600 shrink-0" />
                                  <div>
                                    <span className="font-bold text-blue-900">TTS Audio Prompt: </span>
                                    <span className="text-blue-800">{q.audio_script || q.text}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => isPlaying ? handleStopAudio() : handlePlayAudio(q.audio_script || q.text)}
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold shadow-2xs transition-all shrink-0 ${
                                    isPlaying
                                      ? 'bg-rose-600 text-white animate-pulse'
                                      : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
                                  }`}
                                >
                                  {isPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                                  <span>{isPlaying ? 'Stop' : 'Listen Voice'}</span>
                                </button>
                              </div>
                            )}

                            {/* Reference Text for Audio-to-Text */}
                            {(convType === 'audio_to_text' || convType === 'both') && (
                              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
                                <div className="flex items-center gap-2">
                                  <Mic className="w-4 h-4 text-emerald-600 shrink-0" />
                                  <div>
                                    <span className="font-bold text-emerald-900">Expected Spoken Transcript: </span>
                                    <span className="text-emerald-800 font-medium">"{q.reference_text || q.text}"</span>
                                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                                      AI Whisper speech recognition will score candidate microphone recording against this reference.
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Options grid for MCQ */}
                            {q.options && q.options.length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {q.options.map((opt, oIdx) => {
                                  const isCorrect = String(opt).trim() === String(q.correct_answer).trim();
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border ${
                                        isCorrect
                                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                                          : 'bg-slate-50 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-white border border-slate-200 shrink-0">
                                        {String.fromCharCode(65 + oIdx)}
                                      </span>
                                      <span className="truncate">{opt}</span>
                                      {isCorrect && (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Explanation */}
                            {q.explanation && (
                              <div className="text-xs bg-slate-50 text-slate-600 p-2.5 rounded-xl border border-slate-100 mt-2">
                                <span className="font-bold text-slate-700">Explanation / Note: </span>
                                {q.explanation}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              title="Edit Question"
                              onClick={() => handleOpenQuestionModal(q)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              title="Delete Question"
                              onClick={() => handleDeleteQuestion(q._id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      {/* ============================================================= */}
      {/* MODAL 1: CREATE / EDIT MAIN MODULE                            */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isModuleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {editingModule ? 'Edit Main Module' : 'Create New Main Module'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsModuleModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveModule} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Module Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={moduleForm.name}
                    onChange={(e) => setModuleForm({ ...moduleForm, name: e.target.value })}
                    placeholder="e.g. Quantitative Aptitude, Versant Voice, Technical"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Code / Key (Identifier)
                  </label>
                  <input
                    type="text"
                    value={moduleForm.code}
                    onChange={(e) => setModuleForm({ ...moduleForm, code: e.target.value })}
                    placeholder="Auto-generated if blank (e.g. aptitude, versant)"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    placeholder="Brief description of assessments covered..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Icon
                    </label>
                    <select
                      value={moduleForm.icon}
                      onChange={(e) => setModuleForm({ ...moduleForm, icon: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Calculator">Calculator</option>
                      <option value="Brain">Brain (Reasoning / Versant)</option>
                      <option value="Headphones">Headphones (Audio / Listening)</option>
                      <option value="Mic">Mic (Speaking)</option>
                      <option value="Code">Code (Technical)</option>
                      <option value="BookOpen">BookOpen (Reading / Verbal)</option>
                      <option value="Target">Target</option>
                      <option value="Layers">Layers</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Theme Color
                    </label>
                    <select
                      value={moduleForm.color}
                      onChange={(e) => setModuleForm({ ...moduleForm, color: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="indigo">Indigo / Blue</option>
                      <option value="emerald">Emerald / Green</option>
                      <option value="purple">Purple / Violet</option>
                      <option value="amber">Amber / Orange</option>
                      <option value="rose">Rose / Pink</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModuleModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {editingModule ? 'Save Changes' : 'Create Module'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* MODAL 2: CREATE / EDIT TOPIC (WITH LEVEL SELECTION PROMPT)    */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isTopicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {editingTopic ? 'Edit Topic & Levels' : 'Add New Topic with Levels'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Module: <strong className="text-slate-800">{currentModule?.name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTopicModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTopic} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Topic Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={topicForm.name}
                    onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                    placeholder="e.g. Time & Work, Reading Aloud, Repeat Sentence, Data Structures"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={topicForm.description}
                    onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                    placeholder="Short description of concepts and speech tests"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* Level Selection Prompt */}
                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Select Available Difficulty Levels *</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Choose which difficulty levels are available for student assessments in this topic.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomLevel}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2.5 py-1 rounded-lg border border-indigo-200 shadow-2xs"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Custom Level</span>
                    </button>
                  </div>

                  {/* Standard Presets */}
                  <div className="space-y-1.5">
                    {DEFAULT_LEVEL_PRESETS.map((preset) => {
                      const isSelected = topicForm.levels.some(l => l.level === preset.level);
                      return (
                        <div
                          key={preset.level}
                          onClick={() => handleTogglePresetLevel(preset)}
                          className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white border-indigo-300 shadow-2xs'
                              : 'bg-white/60 border-slate-200 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900">{preset.name}</span>
                              <span className="text-[10px] text-slate-500 block leading-tight">
                                {preset.description}
                              </span>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            L{preset.level}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Configured Levels */}
                  <div className="pt-2 border-t border-indigo-100/80">
                    <div className="text-[11px] font-bold text-slate-600 mb-1.5">
                      Configured Levels ({topicForm.levels.length}):
                    </div>
                    <div className="space-y-1.5">
                      {topicForm.levels.map((lvl, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                          <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-black shrink-0">
                            L{lvl.level}
                          </span>
                          <input
                            type="text"
                            value={lvl.name}
                            onChange={(e) => handleUpdateLevelName(idx, e.target.value)}
                            placeholder="Level label (e.g. Level 1 - Beginner)"
                            className="flex-1 text-xs font-semibold text-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveLevel(idx)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsTopicModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {editingTopic ? 'Update Topic & Levels' : 'Create Topic'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* MODAL 3: QUESTION CREATOR / EDITOR WITH SYSTEM CONVERSIONS     */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isQuestionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      {editingQuestion ? 'Edit Question' : 'Add Question with System Type'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target: <strong className="text-slate-800">{currentModule?.name} &gt; {currentTopic?.name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveQuestion} className="space-y-4">
                {/* 1. System Conversion Type Selector */}
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase mb-2">
                    System Conversion &amp; Assessment Type *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SYSTEM_CONVERSION_TYPES.map(type => {
                      const isSelected = questionForm.conversion_type === type.id;
                      const IconComp = type.icon;
                      return (
                        <div
                          key={type.id}
                          onClick={() => {
                            let qType = 'mcq';
                            if (type.id === 'text_to_audio') qType = 'text_to_audio';
                            if (type.id === 'audio_to_text') qType = 'audio_to_text';
                            if (type.id === 'both') qType = 'audio_interactive';
                            if (type.id === 'technical') qType = 'technical';
                            setQuestionForm({
                              ...questionForm,
                              conversion_type: type.id,
                              question_type: qType
                            });
                          }}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50/70 border-indigo-400 ring-2 ring-indigo-500 shadow-2xs'
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <IconComp className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-500'}`} />
                            <span className="font-bold text-xs text-slate-900">{type.label}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                            {type.sublabel}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Level and Time Limit */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Difficulty Level *
                    </label>
                    <select
                      value={questionForm.level_id}
                      onChange={(e) => setQuestionForm({ ...questionForm, level_id: parseInt(e.target.value, 10) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {(currentTopic?.levels || []).map(lvl => (
                        <option key={lvl.level} value={lvl.level}>
                          {lvl.name} (Level {lvl.level})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(questionForm.conversion_type === 'audio_to_text' || questionForm.conversion_type === 'both') ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Speaking Duration Limit
                      </label>
                      <select
                        value={questionForm.time_limit_seconds}
                        onChange={(e) => setQuestionForm({ ...questionForm, time_limit_seconds: parseInt(e.target.value, 10) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value={15}>15 Seconds (Short answers)</option>
                        <option value={25}>25 Seconds (Repeat sentence)</option>
                        <option value={45}>45 Seconds (Standard speaking)</option>
                        <option value={60}>60 Seconds (Long prompt)</option>
                        <option value={90}>90 Seconds (Story retell)</option>
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Category / Sub-type
                      </label>
                      <input
                        type="text"
                        value={currentTopic?.name || 'General'}
                        disabled
                        className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500"
                      />
                    </div>
                  )}
                </div>

                {/* Question Prompt / Main Statement */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Question Text / Instruction Prompt *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={questionForm.text}
                    onChange={(e) => setQuestionForm({ ...questionForm, text: e.target.value })}
                    placeholder={
                      questionForm.conversion_type === 'audio_to_text'
                        ? 'e.g. "Read the following sentence aloud clearly into your microphone."'
                        : questionForm.conversion_type === 'text_to_audio'
                        ? 'e.g. "Listen to the announcement and answer the question."'
                        : questionForm.conversion_type === 'both'
                        ? 'e.g. "Listen to the sentence and repeat it exactly as you hear it."'
                        : 'Enter the full question prompt or problem statement...'
                    }
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                {/* A. TEXT TO AUDIO (TTS) FIELD */}
                {(questionForm.conversion_type === 'text_to_audio' || questionForm.conversion_type === 'both') && (
                  <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-extrabold text-blue-900 uppercase flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-blue-600" />
                        <span>Text to Audio (TTS Voice Prompt Script) *</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => handlePlayAudio(questionForm.audio_script || questionForm.text)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-blue-100 text-blue-700 px-2.5 py-1 rounded-lg text-[11px] font-bold border border-blue-200 shadow-2xs transition-colors"
                      >
                        <Play className="w-3 h-3 text-blue-600" />
                        <span>Test Voice (TTS)</span>
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={questionForm.audio_script}
                      onChange={(e) => setQuestionForm({ ...questionForm, audio_script: e.target.value })}
                      placeholder="The exact sentence or dialogue the system will speak to the candidate..."
                      className="w-full px-3 py-2 bg-white border border-blue-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-blue-700">
                      💡 The system will synthesize this text into speech audio and play it through candidate headphones.
                    </p>
                  </div>
                )}

                {/* B. AUDIO TO TEXT (STT) FIELD */}
                {(questionForm.conversion_type === 'audio_to_text' || questionForm.conversion_type === 'both') && (
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
                    <label className="block text-xs font-extrabold text-emerald-900 uppercase flex items-center gap-1.5">
                      <Mic className="w-4 h-4 text-emerald-600" />
                      <span>Audio to Text (Expected Reference Sentence for AI Scoring) *</span>
                    </label>
                    <textarea
                      rows={2}
                      value={questionForm.reference_text}
                      onChange={(e) => setQuestionForm({ ...questionForm, reference_text: e.target.value })}
                      placeholder="e.g. Traffic congestion has become a major challenge for modern urban cities worldwide."
                      className="w-full px-3 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <p className="text-[10px] text-emerald-700">
                      🎙️ Candidate will speak into the microphone; AI Whisper will transcribe speech and score pronunciation against this exact reference text.
                    </p>
                  </div>
                )}

                {/* C. MULTIPLE CHOICE OPTIONS (FOR MCQ OR LISTENING COMPREHENSION) */}
                {(questionForm.conversion_type === 'none' || questionForm.conversion_type === 'text_to_audio') && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        Options &amp; Correct Answer Selection *
                      </label>
                      <span className="text-[11px] text-slate-500">
                        Click radio circle to mark correct answer
                      </span>
                    </div>

                    <div className="space-y-2">
                      {questionForm.options.map((opt, idx) => {
                        const isCorrect = String(opt).trim() !== '' && String(opt).trim() === String(questionForm.correct_answer).trim();
                        return (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
                              isCorrect ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <button
                              type="button"
                              title="Mark as correct answer"
                              onClick={() => setQuestionForm({ ...questionForm, correct_answer: opt })}
                              className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                                isCorrect ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white hover:border-slate-400'
                              }`}
                            >
                              {isCorrect && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            <span className="text-xs font-bold text-slate-500 w-4">
                              {String.fromCharCode(65 + idx)}.
                            </span>

                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...questionForm.options];
                                newOpts[idx] = e.target.value;
                                const updated = { ...questionForm, options: newOpts };
                                if (isCorrect) updated.correct_answer = e.target.value;
                                setQuestionForm(updated);
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                              className="flex-1 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* D. TECHNICAL / CODING FIELDS */}
                {questionForm.conversion_type === 'technical' && (
                  <div className="space-y-3 p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                    <div>
                      <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                        Code Stub / Template
                      </label>
                      <textarea
                        rows={3}
                        value={questionForm.code_stub}
                        onChange={(e) => setQuestionForm({ ...questionForm, code_stub: e.target.value })}
                        placeholder="def solution(nums):&#10;    # Write code here&#10;    pass"
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-900 uppercase mb-1">
                        Expected Output / Test Case
                      </label>
                      <input
                        type="text"
                        value={questionForm.expected_output}
                        onChange={(e) => setQuestionForm({ ...questionForm, expected_output: e.target.value })}
                        placeholder="e.g. [0, 1] or 42"
                        className="w-full px-3 py-2 bg-white border border-amber-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Explanation / Solution Walkthrough
                  </label>
                  <textarea
                    rows={2}
                    value={questionForm.explanation}
                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                    placeholder="Explain the step-by-step logic, formula, or reason for the correct answer..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsQuestionModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {editingQuestion ? 'Update Question' : 'Save Question'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================= */}
      {/* MODAL 4: BULK CSV / EXCEL UPLOAD PREVIEW & CONFIRMATION        */}
      {/* ============================================================= */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-4xl w-full p-6 border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Bulk Upload Preview ({parsedUploadRows.length} Questions)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Target: <strong className="text-slate-800">{currentModule?.name} &gt; {currentTopic?.name}</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsUploadModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Table Preview with System Conversion Column */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl max-h-[50vh]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-3 w-10">#</th>
                      <th className="p-3 w-32">System Type</th>
                      <th className="p-3">Prompt / Text</th>
                      <th className="p-3">Reference / Answer</th>
                      <th className="p-3 w-16">Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {parsedUploadRows.slice(0, 50).map((row, rIdx) => {
                      const conv = row.conversion_type || 'none';
                      return (
                        <tr key={rIdx} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-400">{rIdx + 1}</td>
                          <td className="p-3">
                            {conv === 'text_to_audio' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                <Volume2 className="w-3 h-3" />
                                <span>Text &rarr; Audio</span>
                              </span>
                            )}
                            {conv === 'audio_to_text' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Mic className="w-3 h-3" />
                                <span>Audio &rarr; Text</span>
                              </span>
                            )}
                            {conv === 'both' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                <Headphones className="w-3 h-3" />
                                <span>Dual Voice AI</span>
                              </span>
                            )}
                            {conv === 'none' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                <span>MCQ</span>
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold max-w-xs truncate" title={row.text}>
                            {row.text}
                          </td>
                          <td className="p-3 font-bold text-emerald-700 max-w-xs truncate">
                            {row.reference_text || row.correct_answer}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-black text-[10px]">
                              L{row.level_id}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {parsedUploadRows.length > 50 && (
                <div className="text-[11px] text-slate-400 text-center">
                  Showing first 50 rows of {parsedUploadRows.length}. All rows will be imported.
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-xs text-slate-500">
                  File: <strong className="text-slate-700">{uploadFileName}</strong>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={uploadSubmitting}
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={uploadSubmitting}
                    onClick={handleConfirmUpload}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    {uploadSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Import ({parsedUploadRows.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
