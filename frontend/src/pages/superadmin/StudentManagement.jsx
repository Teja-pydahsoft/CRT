import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { Users, Filter, Search, Trash2, ListChecks, CheckCircle, BookOpen, Lock, Unlock, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User, Edit2, RotateCcw, Download } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { 
    getStudentAccessStatus, 
    authorizeStudentModule, 
    lockStudentModule, 
    authorizeStudentLevel, 
    lockStudentLevel, 
    getStudentDetailedInsights, 
    getStudentDetails, 
    updateStudent,
    getSdmsColleges,
    getSdmsCourses,
    getSdmsBranches,
    getSdmsYears,
    getSdmsSemesters,
    getSdmsSections,
    getSdmsStudents
} from '../../services/api';
import { useRdsOrgSource } from '../../hooks/useRdsOrgSource';

const StudentManagement = () => {
    const { isRdsReadOnly, applyFromResponse } = useRdsOrgSource();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const { success, error } = useNotification();
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [progressLoading, setProgressLoading] = useState(false);
    const [progressError, setProgressError] = useState(null);
    const [moduleProgress, setModuleProgress] = useState([]);
    const [authorizing, setAuthorizing] = useState(false);
    const [authorizeMsg, setAuthorizeMsg] = useState('');
    const [availableModules, setAvailableModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [levelProgress, setLevelProgress] = useState([]);
    const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
    const [modalSelectedModule, setModalSelectedModule] = useState(null);
    const [levelTestModal, setLevelTestModal] = useState({ open: false, module: null, level: null });
    const [levelTests, setLevelTests] = useState({ loading: false, practice: [], online: [] });
    const [unlockMsg, setUnlockMsg] = useState('');
    const [onlineExamResults, setOnlineExamResults] = useState([]);
    const [detailedInsights, setDetailedInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [practiceResults, setPracticeResults] = useState([]);
    const [selectedLevel, setSelectedLevel] = useState(null);
    const [selectedLevelResults, setSelectedLevelResults] = useState([]);
    const [levelResultsLoading, setLevelResultsLoading] = useState(false);
    const [showLevelResultsPanel, setShowLevelResultsPanel] = useState(false);
    const [selectedLevelPracticeResults, setSelectedLevelPracticeResults] = useState([]);
    // SDMS Filter Hierarchy State
    const [colleges, setColleges] = useState([]);
    const [courses, setCourses] = useState([]);
    const [branches, setBranches] = useState([]);
    const [years, setYears] = useState([]);
    const [semesters, setSemesters] = useState([]);
    const [sections, setSections] = useState([]);

    const [selectedCollege, setSelectedCollege] = useState('');
    const [selectedCourse, setSelectedCourse] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedYear, setSelectedYear] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedSection, setSelectedSection] = useState('');

    const [accessStatus, setAccessStatus] = useState([]);
    const [showLevelsModal, setShowLevelsModal] = useState(false);
    const [levelsModalData, setLevelsModalData] = useState({ module: null, levels: [] });
    const [levelPercentages, setLevelPercentages] = useState({}); // { levelId: { practice: %, online: % } }
    const [moduleActionLoading, setModuleActionLoading] = useState({});
    const [levelActionLoading, setLevelActionLoading] = useState({});
    
    // Filter and lazy loading state
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [totalStudents, setTotalStudents] = useState(0);
    const [loadingFilters, setLoadingFilters] = useState({
        colleges: false,
        courses: false,
        branches: false,
        years: false,
        semesters: false,
        sections: false
    });
    const [searchInput, setSearchInput] = useState('');
    const [downloadingAll, setDownloadingAll] = useState(false);
    
    // Bulk selection state
    const [selectedStudents, setSelectedStudents] = useState(new Set());
    const [isAllSelected, setIsAllSelected] = useState(false);
    const [showBulkActions, setShowBulkActions] = useState(false);
    const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // Edit student state
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editForm, setEditForm] = useState({ name: '', email: '', roll_number: '', mobile_number: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Fetch colleges on initial mount
    useEffect(() => {
        const fetchColleges = async () => {
            setLoadingFilters(prev => ({ ...prev, colleges: true }));
            try {
                const res = await getSdmsColleges();
                applyFromResponse(res);
                setColleges(res.data.data || []);
            } catch (err) {
                console.error('Failed to fetch SDMS colleges', err);
                error('Failed to fetch colleges from SDMS.');
            } finally {
                setLoadingFilters(prev => ({ ...prev, colleges: false }));
            }
        };
        fetchColleges();
    }, []);

    // When College changes: load Courses, Branches, and Years
    useEffect(() => {
        const loadCollegeData = async () => {
            setSelectedCourse('');
            setSelectedBranch('');
            setSelectedYear('');
            setSelectedSemester('');
            setSelectedSection('');
            setCourses([]);
            setBranches([]);
            setYears([]);
            setSemesters([]);
            setSections([]);

            if (!selectedCollege) return;

            setLoadingFilters(prev => ({ ...prev, courses: true, branches: true }));
            try {
                const [courseRes, branchRes, yearRes] = await Promise.all([
                    getSdmsCourses(selectedCollege),
                    getSdmsBranches(selectedCollege, ''),
                    getSdmsYears(selectedCollege, '', '')
                ]);
                applyFromResponse(courseRes);
                setCourses(courseRes.data.data || []);
                setBranches(branchRes.data.data || []);
                setYears(yearRes.data.data || []);
            } catch (err) {
                console.error('Failed to load courses/branches for college', err);
            } finally {
                setLoadingFilters(prev => ({ ...prev, courses: false, branches: false }));
            }
        };
        loadCollegeData();
    }, [selectedCollege]);

    // When Course changes: reload Branches and Years for this Course
    useEffect(() => {
        const loadCourseData = async () => {
            setSelectedBranch('');
            setSelectedYear('');
            setSelectedSemester('');
            setSelectedSection('');
            setSemesters([]);
            setSections([]);

            if (!selectedCourse) return;

            setLoadingFilters(prev => ({ ...prev, branches: true, years: true }));
            try {
                const [branchRes, yearRes] = await Promise.all([
                    getSdmsBranches(selectedCollege, selectedCourse),
                    getSdmsYears(selectedCollege, selectedCourse, '')
                ]);
                setBranches(branchRes.data.data || []);
                setYears(yearRes.data.data || []);
            } catch (err) {
                console.error('Failed to load branches/years for course', err);
            } finally {
                setLoadingFilters(prev => ({ ...prev, branches: false, years: false }));
            }
        };
        loadCourseData();
    }, [selectedCourse]);

    // When Branch changes: reload Years for this Branch
    useEffect(() => {
        const loadBranchData = async () => {
            setSelectedYear('');
            setSelectedSemester('');
            setSelectedSection('');
            setSemesters([]);
            setSections([]);

            if (!selectedBranch) return;

            try {
                const yearRes = await getSdmsYears(selectedCollege, selectedCourse, selectedBranch);
                setYears(yearRes.data.data || []);
            } catch (err) {
                console.error('Failed to load years for branch', err);
            }
        };
        loadBranchData();
    }, [selectedBranch]);

    // When Year changes: load Semesters
    useEffect(() => {
        const loadSemesters = async () => {
            setSelectedSemester('');
            setSelectedSection('');
            setSections([]);

            if (!selectedYear) {
                setSemesters([]);
                return;
            }

            setLoadingFilters(prev => ({ ...prev, semesters: true }));
            try {
                const res = await getSdmsSemesters(selectedCollege, selectedCourse, selectedBranch, selectedYear);
                setSemesters(res.data.data || []);
            } catch (err) {
                console.error('Failed to load semesters', err);
            } finally {
                setLoadingFilters(prev => ({ ...prev, semesters: false }));
            }
        };
        loadSemesters();
    }, [selectedYear]);

    // When Semester changes: load Sections
    useEffect(() => {
        const loadSections = async () => {
            setSelectedSection('');

            if (!selectedSemester) {
                setSections([]);
                return;
            }

            setLoadingFilters(prev => ({ ...prev, sections: true }));
            try {
                const res = await getSdmsSections(selectedCollege, selectedCourse, selectedBranch, selectedYear, selectedSemester);
                setSections(res.data.data || []);
            } catch (err) {
                console.error('Failed to load sections', err);
            } finally {
                setLoadingFilters(prev => ({ ...prev, sections: false }));
            }
        };
        loadSections();
    }, [selectedSemester]);

    // Fetch students from SDMS with cascading filters, search, and pagination
    const fetchStudents = useCallback(async (page = 1, search = '') => {
        try {
            if (page === 1) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            
            const params = {
                page,
                limit: 20,
                ...(search && { search }),
                ...(selectedCollege && { college_id: selectedCollege }),
                ...(selectedCourse && { course_id: selectedCourse }),
                ...(selectedBranch && { branch_id: selectedBranch }),
                ...(selectedYear && { year: selectedYear }),
                ...(selectedSemester && { semester: selectedSemester }),
                ...(selectedSection && { section: selectedSection })
            };
            
            console.log('Fetching SDMS students with params:', params);
            const res = await getSdmsStudents(params);
            applyFromResponse(res);
            
            const studentList = res.data?.data || [];
            const pagination = res.data?.pagination || {};

            if (page === 1) {
                setStudents(studentList);
                if (selectedStudent) {
                    const updatedStudent = studentList.find(s => (s._id === selectedStudent._id || s.id === selectedStudent.id));
                    if (updatedStudent) {
                        setSelectedStudent(updatedStudent);
                    }
                }
            } else {
                setStudents(prev => [...prev, ...studentList]);
            }
            
            setHasMore(pagination.has_more ?? false);
            setTotalStudents(pagination.total ?? studentList.length);
            setCurrentPage(page);
        } catch (err) {
            console.error('SDMS fetchStudents error:', err);
            error('Failed to fetch students from SDMS.');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [selectedCollege, selectedCourse, selectedBranch, selectedYear, selectedSemester, selectedSection]);

    useEffect(() => {
        fetchStudents(1, searchTerm);
    }, [searchTerm, selectedCollege, selectedCourse, selectedBranch, selectedYear, selectedSemester, selectedSection]);

    // Clear selection when filters change
    useEffect(() => {
        clearSelection();
    }, [selectedCollege, selectedCourse, selectedBranch, selectedYear, selectedSemester, selectedSection]);
    
    const handleDeleteStudent = async (studentId) => {
        if (window.confirm('Are you sure you want to delete this student? This action is permanent.')) {
            try {
                await api.delete(`/batch-management/students/${studentId}`);
                success('Student deleted successfully.');
                fetchStudents(); // Refresh the list
            } catch (err) {
                error(err.response?.data?.message || 'Failed to delete student.');
            }
        }
    };

    const handleOpenEditStudent = async (student) => {
        const targetId = student.student_id || student._id;
        let merged = student;
        try {
            const res = await getStudentDetails(targetId);
            if (res.data?.success && res.data.data) {
                merged = { ...student, ...res.data.data, student_id: targetId };
            }
        } catch (err) {
            // If detailed fetch fails (e.g., 404 student not found), fall back to list data
            console.warn('Using list data for student edit due to fetch error', err);
        }

        setEditingStudent(merged);
        setEditForm({
            name: merged.name || '',
            email: merged.email || '',
            roll_number: merged.roll_number || '',
            mobile_number: merged.mobile_number || '',
        });
        setIsEditModalOpen(true);
    };

    const handleSaveStudent = async () => {
        if (!editingStudent) return;
        
        // Basic mobile number validation: require exactly 10 digits
        if (editForm.mobile_number && editForm.mobile_number.length !== 10) {
            error('Mobile number must be exactly 10 digits.');
            return;
        }

        setSavingEdit(true);
        try {
            const targetId = editingStudent.student_id || editingStudent._id;
            await updateStudent(targetId, {
                name: editForm.name,
                email: editForm.email,
                roll_number: editForm.roll_number,
                mobile_number: editForm.mobile_number,
            });
            success('Student updated successfully.');
            setIsEditModalOpen(false);
            setEditingStudent(null);
            await fetchStudents(1, searchTerm);
        } catch (err) {
            error(err.response?.data?.message || 'Failed to update student.');
        } finally {
            setSavingEdit(false);
        }
    };

    // Bulk selection functions
    const handleSelectStudent = (studentId) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
        setShowBulkActions(newSelected.size > 0);
        setIsAllSelected(newSelected.size === students.length && students.length > 0);
    };

    const handleSelectAll = () => {
        if (isAllSelected) {
            setSelectedStudents(new Set());
            setShowBulkActions(false);
        } else {
            const allIds = new Set(students.map(student => student._id));
            setSelectedStudents(allIds);
            setShowBulkActions(true);
        }
        setIsAllSelected(!isAllSelected);
    };

    const handleBulkDelete = async () => {
        if (selectedStudents.size === 0) {
            error('No students selected for deletion.');
            return;
        }

        setBulkDeleteLoading(true);
        try {
            const response = await api.post('/batch-management/students/bulk-delete', {
                student_ids: Array.from(selectedStudents)
            });

            if (response.data.success) {
                success(response.data.message);
                setSelectedStudents(new Set());
                setShowBulkActions(false);
                setIsAllSelected(false);
                setShowBulkDeleteModal(false);
                fetchStudents(); // Refresh the list
            } else {
                error(response.data.message || 'Failed to delete students.');
            }
        } catch (err) {
            error(err.response?.data?.message || 'Failed to delete students.');
        } finally {
            setBulkDeleteLoading(false);
        }
    };

    const clearSelection = () => {
        setSelectedStudents(new Set());
        setShowBulkActions(false);
        setIsAllSelected(false);
    };

    const handleSendCredentialsAgain = async (student) => {
        try {
            const response = await api.post(`/batch-management/students/${student._id}/send-credentials`);
            if (response.data.success) {
                success('Credentials sent successfully to ' + student.email);
            } else {
                error(response.data.message || 'Failed to send credentials');
            }
        } catch (err) {
            error(err.response?.data?.message || 'Failed to send credentials');
        }
    };

    const handleDownloadCredentials = async (student) => {
        try {
            const headers = ['ID', 'PIN / Roll No', 'Admission No', 'Name', 'Email', 'Mobile', 'College', 'Course', 'Branch', 'Year', 'Semester', 'Section', 'Status'];
            const row = [
                `"${student.id || student._id || ''}"`,
                `"${student.roll_number || student.pin_no || ''}"`,
                `"${student.admission_number || ''}"`,
                `"${(student.name || '').replace(/"/g, '""')}"`,
                `"${student.email || ''}"`,
                `"${student.mobile_number || ''}"`,
                `"${(student.college_name || student.campus_name || '').replace(/"/g, '""')}"`,
                `"${(student.course_name || '').replace(/"/g, '""')}"`,
                `"${(student.branch_name || '').replace(/"/g, '""')}"`,
                `"${student.year || ''}"`,
                `"${student.semester || ''}"`,
                `"${student.section || ''}"`,
                `"${student.status || 'active'}"`
            ];
            
            const csvContent = [headers.join(','), row.join(',')].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${(student.roll_number || student.name || 'student').replace(/\s+/g, '_')}_details.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            success('Student details downloaded successfully');
        } catch (err) {
            error('Failed to download student details');
        }
    };

    const handleDownloadAllCredentials = async () => {
        try {
            setDownloadingAll(true);
            const params = new URLSearchParams({
                ...(searchTerm && { search: searchTerm }),
                ...(selectedCollege && { college_id: selectedCollege }),
                ...(selectedCourse && { course_id: selectedCourse }),
                ...(selectedBranch && { branch_id: selectedBranch }),
                ...(selectedYear && { year: selectedYear }),
                ...(selectedSemester && { semester: selectedSemester }),
                ...(selectedSection && { section: selectedSection })
            });
            
            const response = await api.get(`/student/sdms/export?${params.toString()}`, {
                responseType: 'blob'
            });
            
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            
            let filename = 'sdms_students';
            if (selectedCollege) {
                const col = colleges.find(c => c.id === Number(selectedCollege));
                if (col) filename += `_${(col.code || col.name).replace(/\s+/g, '_')}`;
            }
            if (selectedCourse) {
                const cou = courses.find(c => c.id === Number(selectedCourse));
                if (cou) filename += `_${(cou.code || cou.name).replace(/\s+/g, '_')}`;
            }
            if (selectedBranch) {
                const br = branches.find(b => b.id === Number(selectedBranch));
                if (br) filename += `_${(br.code || br.name).replace(/\s+/g, '_')}`;
            }
            if (selectedYear) filename += `_Y${selectedYear}`;
            if (selectedSemester) filename += `_S${selectedSemester}`;
            if (selectedSection) filename += `_Sec${selectedSection}`;
            if (searchTerm) filename += '_search';
            filename += '.csv';
            
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            success('All filtered students downloaded successfully');
        } catch (err) {
            console.error('Download error:', err);
            error(err.response?.data?.message || 'Failed to download students');
        } finally {
            setDownloadingAll(false);
        }
    };

    const handleResetFilters = () => {
        setSelectedCollege('');
        setSelectedCourse('');
        setSelectedBranch('');
        setSelectedYear('');
        setSelectedSemester('');
        setSelectedSection('');
        setSearchInput('');
        setSearchTerm('');
        setCurrentPage(1);
    };

    const handleSearch = () => {
        console.log('Searching for:', searchInput);
        setSearchTerm(searchInput);
        // Reset to first page when searching
        setCurrentPage(1);
        // Keep the modal open if a student is selected and the search matches them
        if (selectedStudent) {
            const studentMatches = selectedStudent.name?.toLowerCase().includes(searchInput.toLowerCase()) ||
                                 selectedStudent.email?.toLowerCase().includes(searchInput.toLowerCase()) ||
                                 selectedStudent.roll_number?.toLowerCase().includes(searchInput.toLowerCase());
            
            if (!studentMatches) {
                // If the selected student doesn't match the search, close the modal
                setIsProgressModalOpen(false);
                setSelectedStudent(null);
            }
        }
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearchTerm('');
        setCurrentPage(1);
        // Keep the modal open when clearing search
    };


    // Load more function
    const loadMore = () => {
        if (hasMore && !loadingMore) {
            fetchStudents(currentPage + 1, searchTerm);
        }
    };

    const handleStudentClick = async (student) => {
        setSelectedStudent(student);
        setIsProgressModalOpen(true);
        setProgressLoading(true);
        setInsightsLoading(true);
        setProgressError(null);
        setAccessStatus([]);
        setDetailedInsights(null);
        
        try {
            // Fetch both access status and detailed insights in parallel
            const [accessRes, insightsRes] = await Promise.all([
                getStudentAccessStatus(student._id),
                getStudentDetailedInsights(student._id)
            ]);
            setAccessStatus(accessRes.data.data || []);
            setDetailedInsights(insightsRes.data.data || null);
        } catch (e) {
            console.error('Error fetching student data:', e);
            setProgressError('Failed to load student data.');
        } finally {
            setProgressLoading(false);
            setInsightsLoading(false);
        }
    };

    const handleAuthorizeNext = async (moduleId, nextLevel) => {
        if (!selectedStudent) return;
        setAuthorizing(true);
        setAuthorizeMsg('');
        try {
            const res = await api.post(`/batch-management/student/${selectedStudent._id}/authorize-level`, { level: nextLevel });
            setAuthorizeMsg(res.data.message || 'Authorized!');
        } catch (e) {
            setAuthorizeMsg('Failed to authorize next level.');
        } finally {
            setAuthorizing(false);
        }
    };

    const handleModuleCardClick = async (student, module) => {
        setSelectedStudent(student);
        setSelectedModule(module);
        setIsLevelModalOpen(true);
        setLevelProgress([]);
        try {
            // Fetch level progress for this student/module
            const res = await api.get(`/superadmin/student-practice-results?student=${encodeURIComponent(student.email)}&module=${module.id}`);
            setLevelProgress(res.data.data || []);
        } catch (e) {
            setLevelProgress([]);
        }
    };

    const handleLevelClick = async (mod, lvl) => {
        setLevelTestModal({ open: true, module: mod, level: lvl });
        setLevelTests({ loading: true, practice: [], online: [] });
        try {
            const res = await api.get('/test-management/tests');
            const allTests = res.data.data || [];
            // Filter by module and level
            const practice = allTests.filter(t => t.module_name === mod.module_name && t.level_name === lvl.level_name && t.test_type === 'practice');
            const online = allTests.filter(t => t.module_name === mod.module_name && t.level_name === lvl.level_name && t.test_type === 'online_exam');
            setLevelTests({ loading: false, practice, online });
        } catch (e) {
            setLevelTests({ loading: false, practice: [], online: [] });
        }
    };

    const handleModuleLockToggle = async (studentId, moduleId, unlocked) => {
        setModuleActionLoading(prev => ({ ...prev, [moduleId]: true }));
        try {
            if (unlocked) {
                await lockStudentModule(studentId, moduleId);
                setUnlockMsg('Module locked!');
            } else {
                await authorizeStudentModule(studentId, moduleId);
                setUnlockMsg('Module unlocked!');
            }
            // Refresh both access status and insights
            const [accessRes, insightsRes] = await Promise.all([
                getStudentAccessStatus(studentId),
                getStudentDetailedInsights(studentId)
            ]);
            setAccessStatus([...accessRes.data.data]); // new array reference
            setDetailedInsights(insightsRes.data.data || null);
        } catch (e) {
            setUnlockMsg('Failed to update module access.');
        } finally {
            setModuleActionLoading(prev => ({ ...prev, [moduleId]: false }));
            setTimeout(() => setUnlockMsg(''), 2000);
        }
    };

    const handleLevelLockToggle = async (studentId, levelId, unlocked) => {
        try {
            if (unlocked) {
                await lockStudentLevel(studentId, levelId);
                setUnlockMsg('Level locked!');
            } else {
                await authorizeStudentLevel(studentId, levelId);
                setUnlockMsg('Level unlocked!');
            }
            // Refresh access status
            const res = await getStudentAccessStatus(studentId);
            setAccessStatus(res.data.data || []);
        } catch (e) {
            setUnlockMsg('Failed to update level access.');
        } finally {
        setTimeout(() => setUnlockMsg(''), 2000);
        }
    };

    // Helper to fetch percentages for all levels in a module
    const fetchLevelPercentages = async (student, module) => {
        const percentages = {};
        for (const lvl of module.levels) {
            let practice = 0;
            let online = 0;
            try {
                // Fetch practice results
                const practiceRes = await api.get(`/superadmin/student-practice-results?student=${encodeURIComponent(student.email)}&module=${module.module_id}&level=${lvl.level_id}`);
                if (practiceRes.data.data && practiceRes.data.data.length > 0) {
                    const scores = practiceRes.data.data.map(r => r.average_score || 0);
                    practice = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                }
                // Fetch online results
                const onlineRes = await api.get(`/superadmin/student-online-results?student=${encodeURIComponent(student.email)}&module=${module.module_id}&level=${lvl.level_id}`);
                if (onlineRes.data.data && onlineRes.data.data.length > 0) {
                    const scores = onlineRes.data.data.map(r => r.average_score || 0);
                    online = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                }
            } catch {}
            percentages[lvl.level_id] = { practice, online };
        }
        setLevelPercentages(percentages);
    };

    // Sort modules: Grammar, Vocabulary first, then others
    const sortedAccessStatus = useMemo(() => {
        if (!accessStatus) return [];
        const priority = ['GRAMMAR', 'VOCABULARY'];
        const priorityModules = accessStatus.filter(m => priority.includes(m.module_id));
        const otherModules = accessStatus.filter(m => !priority.includes(m.module_id));
        return [...priorityModules, ...otherModules];
    }, [accessStatus]);

    return (
        <>
        <main className="px-3 sm:px-4 md:px-6 lg:px-8 xl:px-12 mt-4 sm:mt-6 w-full h-[calc(100vh-120px)] flex flex-col overflow-hidden">
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col h-full overflow-hidden">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-0 mb-2 sm:mb-3 flex-shrink-0">
                            <div className="flex-1 min-w-0">
                                <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1 sm:mb-2 flex items-center gap-2">
                                    Student Management
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                                        SDMS Regular Students
                                    </span>
                                </h1>
                                <p className="text-sm sm:text-base text-gray-600">
                                    {isRdsReadOnly
                                        ? 'Connected to AWS RDS Student Database (SDMS). Displaying Regular students only across colleges, courses, branches, years, semesters & sections.'
                                        : 'View and manage student information across the system.'}
                                    {!loading && (
                                        <span className="ml-1 sm:ml-2 text-blue-600 font-semibold">
                                            ({totalStudents.toLocaleString()} regular students
                                            {(selectedCollege || selectedCourse || selectedBranch || selectedYear || selectedSemester || selectedSection || searchTerm) && (
                                                <span className="text-xs sm:text-sm text-gray-500 font-normal">
                                                    {' '}filtered
                                                </span>
                                            )}
                                            )
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Filter Section */}
                        <div className="mb-2 sm:mb-3 bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 flex-shrink-0">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-sm sm:text-base font-semibold text-gray-800 flex items-center">
                                    <Filter className="mr-2 h-4 w-4 text-blue-600" />
                                    SDMS Cascading Filters
                                </h3>
                                {(selectedCollege || selectedCourse || selectedBranch || selectedYear || selectedSemester || selectedSection || searchTerm) && (
                                    <button
                                        onClick={handleResetFilters}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium flex items-center gap-1 hover:underline"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        Reset All Filters
                                    </button>
                                )}
                            </div>
                            
                            {/* 6 Cascading Dropdowns */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-3">
                                {/* 1. College */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        College
                                    </label>
                                    <select
                                        value={selectedCollege}
                                        onChange={(e) => setSelectedCollege(e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="">All Colleges</option>
                                        {colleges.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name} {c.code ? `(${c.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 2. Course */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Course
                                    </label>
                                    <select
                                        value={selectedCourse}
                                        onChange={(e) => setSelectedCourse(e.target.value)}
                                        disabled={!selectedCollege || loadingFilters.courses}
                                        className="w-full py-1.5 px-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {loadingFilters.courses ? 'Loading...' : 'All Courses'}
                                        </option>
                                        {courses.map(cou => (
                                            <option key={cou.id} value={cou.id}>
                                                {cou.name} {cou.code ? `(${cou.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 3. Branch */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Branch
                                    </label>
                                    <select
                                        value={selectedBranch}
                                        onChange={(e) => setSelectedBranch(e.target.value)}
                                        disabled={!selectedCollege || loadingFilters.branches}
                                        className="w-full py-1.5 px-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {loadingFilters.branches ? 'Loading...' : 'All Branches'}
                                        </option>
                                        {branches.map(br => (
                                            <option key={br.id} value={br.id}>
                                                {br.name} {br.code ? `(${br.code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 4. Year */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Academic Year
                                    </label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full py-1.5 px-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                    >
                                        <option value="">All Years</option>
                                        {years.map(y => {
                                            const courseObj = courses.find(c => String(c.id) === String(selectedCourse));
                                            return (
                                                <option key={y} value={y}>
                                                    Year {y}{courseObj?.total_years ? ` (of ${courseObj.total_years})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                {/* 5. Semester */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Semester
                                    </label>
                                    <select
                                        value={selectedSemester}
                                        onChange={(e) => setSelectedSemester(e.target.value)}
                                        disabled={loadingFilters.semesters}
                                        className="w-full py-1.5 px-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {loadingFilters.semesters ? 'Loading...' : 'All Semesters'}
                                        </option>
                                        {semesters.map(s => (
                                            <option key={s} value={s}>
                                                {selectedYear ? `${selectedYear}-${s} (Sem ${s})` : `Sem ${s}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* 6. Section */}
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                                        Section
                                    </label>
                                    <select
                                        value={selectedSection}
                                        onChange={(e) => setSelectedSection(e.target.value)}
                                        disabled={loadingFilters.sections}
                                        className="w-full py-1.5 px-2 text-xs sm:text-sm border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {loadingFilters.sections ? 'Loading...' : 'All Sections'}
                                        </option>
                                        {sections.map(sec => (
                                            <option key={sec} value={sec}>
                                                Section {sec}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Search and Action Bar */}
                            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between pt-2 border-t border-gray-100">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search by student name, PIN / roll number, email, mobile..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                        className="w-full pl-9 pr-20 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                                    />
                                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {searchInput && (
                                            <button
                                                onClick={handleClearSearch}
                                                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Clear
                                            </button>
                                        )}
                                        <button
                                            onClick={handleSearch}
                                            className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Search
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {students.length > 0 && (
                                        <button
                                            onClick={handleDownloadAllCredentials}
                                            disabled={downloadingAll}
                                            className="px-4 py-2 text-xs sm:text-sm bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 disabled:bg-emerald-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                                            title="Export filtered student list as CSV"
                                        >
                                            {downloadingAll ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    <span>Exporting...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Download className="w-4 h-4" />
                                                    <span>Export CSV</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Student Modal Status */}
                        {selectedStudent && isProgressModalOpen && (
                            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                        <span className="text-sm font-medium text-blue-800">
                                            Viewing: {selectedStudent.name}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setIsProgressModalOpen(false);
                                            setSelectedStudent(null);
                                        }}
                                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    >
                                        Close Details
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Enhanced Student Display Table */}
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 w-full flex flex-col flex-1 min-h-0">
                            {/* Enhanced Table Header - Outside scrollable area */}
                            {!loading && students.length > 0 && (
                                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 flex-shrink-0">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bulk Actions Bar - Outside scrollable area */}
                            {!loading && students.length > 0 && showBulkActions && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-red-50 border border-red-200 rounded-lg p-4 mx-4 sm:mx-6 lg:mx-8 my-4 flex-shrink-0"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-red-100 rounded-lg">
                                                <Trash2 className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-red-900">
                                                    {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''} Selected
                                                </h3>
                                                <p className="text-sm text-red-700">
                                                    Choose an action to perform on selected students
                                                </p>
                                                {selectedStudents.size > 0 && (
                                                    <div className="mt-2 text-xs text-red-600">
                                                        Selected: {Array.from(selectedStudents).slice(0, 3).map(id => {
                                                            const student = students.find(s => s._id === id);
                                                            return student?.name || 'Unknown';
                                                        }).join(', ')}
                                                        {selectedStudents.size > 3 && ` and ${selectedStudents.size - 3} more...`}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={clearSelection}
                                                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                Clear Selection
                                            </button>
                                            <button
                                                onClick={() => setShowBulkDeleteModal(true)}
                                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                                Delete Selected
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Scrollable Table Container */}
                            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                                {loading ? (
                                    <div className="flex items-center justify-center py-16">
                                        <LoadingSpinner />
                                    </div>
                                ) : students.length === 0 ? (
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }} 
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex flex-col items-center justify-center py-16"
                                    >
                                        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full mb-6">
                                            <Users className="w-12 h-12 text-blue-500" />
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-3">No students found</h3>
                                        <p className="text-gray-600 text-center max-w-md">
                                            {searchTerm ? `No students match your search for "${searchTerm}"` : 'No students have been added to the system yet.'}
                                        </p>
                                    </motion.div>
                                ) : (
                                    <>
                                        <table className="w-full">
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-left border-b border-gray-200 w-12">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={isAllSelected}
                                                                onChange={handleSelectAll}
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                            />
                                                        </div>
                                                    </th>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-left border-b border-gray-200">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Student</span>
                                                    </th>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-left border-b border-gray-200">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">PIN / Roll No</span>
                                                    </th>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-left border-b border-gray-200">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">College</span>
                                                    </th>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-left border-b border-gray-200">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Course & Branch</span>
                                                    </th>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-left border-b border-gray-200">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Year / Sem / Sec</span>
                                                    </th>
                                                    <th className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 text-right border-b border-gray-200">
                                                        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Actions</span>
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {students.map((student, index) => (
                                                    <motion.tr 
                                                        key={student._id || student.id} 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                                        className={`group hover:bg-gradient-to-r hover:from-blue-50/60 hover:to-indigo-50/60 cursor-pointer transition-all duration-150 ${
                                                            selectedStudents.has(student._id || student.id) 
                                                                ? 'bg-blue-50 border-l-4 border-blue-500' 
                                                                : ''
                                                        }`}
                                                        onClick={() => handleStudentClick(student)}
                                                    >
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap w-12">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedStudents.has(student._id || student.id)}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectStudent(student._id || student.id);
                                                                }}
                                                                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                                                            />
                                                        </td>
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0">
                                                                    {student.name?.charAt(0)?.toUpperCase() || 'S'}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors truncate">
                                                                        {student.name}
                                                                    </div>
                                                                    <div className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors truncate">
                                                                        {student.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                                                            <div>
                                                                <span className="inline-block font-mono text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md border border-gray-200">
                                                                    {student.roll_number || student.username || student.admission_number || 'N/A'}
                                                                </span>
                                                                {student.mobile_number && (
                                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                                        <span>📱 {student.mobile_number}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                                                            <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[220px] truncate" title={student.college_name || student.campus_name}>
                                                                {student.college_name || student.campus_name || 'Main Campus'}
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                                                            <div className="space-y-1">
                                                                <div className="text-sm font-semibold text-gray-900">
                                                                    {student.course_name || 'N/A'}
                                                                </div>
                                                                <div className="inline-flex items-center text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                                                                    {student.branch_name || student.batch_name || 'General'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap text-xs sm:text-sm">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                                    {student.year ? `Year ${student.year}` : 'Year -'}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                    {student.year && student.semester ? `${student.year}-${student.semester}` : student.semester ? `Sem ${student.semester}` : 'Sem -'}
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    {student.section ? `Sec ${student.section}` : 'Sec -'}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                                    Regular
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 sm:px-3 md:px-6 lg:px-8 py-3 md:py-4 whitespace-nowrap text-right text-xs sm:text-sm">
                                                            <div className="flex items-center justify-end gap-2">
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenEditStudent(student);
                                                                    }} 
                                                                    className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
                                                                    title="Edit Student"
                                                                >
                                                                    <Edit2 className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleSendCredentialsAgain(student);
                                                                    }} 
                                                                    className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Send Credentials"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                                    </svg>
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadCredentials(student);
                                                                    }} 
                                                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                                                    title="Download Details"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteStudent(student._id || student.id);
                                                                    }} 
                                                                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete Student"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        
                                        {/* Load More Button - Inside scrollable area */}
                                        {students.length > 0 && (
                                            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 lg:px-8 py-4 z-10 shadow-lg">
                                                <div className="flex items-center justify-between">
                                                    <div className="text-sm text-gray-700 font-medium">
                                                        Showing {students.length} of {totalStudents} students
                                                    </div>
                                                    
                                                    {hasMore && (
                                                        <button
                                                            onClick={loadMore}
                                                            disabled={loadingMore}
                                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                                        >
                                                            {loadingMore ? (
                                                                <>
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                                    Loading...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    Load More Students
                                                                    <ChevronRight size={16} />
                                                                </>
                                                            )}
                                                        </button>
                                                    )}
                                                    
                                                    {!hasMore && students.length > 0 && (
                                                        <div className="text-sm text-gray-500 font-medium">
                                                            All students loaded
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Edit Student Modal */}
                        {isEditModalOpen && (
                            <Modal 
                                isOpen={isEditModalOpen} 
                                onClose={() => setIsEditModalOpen(false)} 
                                title="Edit Student"
                            >
                                <div className="space-y-6">
                                    <div className="border border-gray-200 rounded-xl divide-y">
                                        <div className="flex items-center px-6 py-3">
                                            <div className="w-1/4 text-sm font-medium text-gray-700">
                                                Name
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                                    className="block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center px-6 py-3">
                                            <div className="w-1/4 text-sm font-medium text-gray-700">
                                                Email
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="email"
                                                    value={editForm.email}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                                    className="block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center px-6 py-3">
                                            <div className="w-1/4 text-sm font-medium text-gray-700">
                                                Roll Number
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="text"
                                                    value={editForm.roll_number}
                                                    onChange={(e) => setEditForm(prev => ({ ...prev, roll_number: e.target.value }))}
                                                    className="block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center px-6 py-3">
                                            <div className="w-1/4 text-sm font-medium text-gray-700">
                                                Mobile Number
                                            </div>
                                            <div className="w-3/4">
                                                <input
                                                    type="tel"
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    value={editForm.mobile_number}
                                                    onChange={(e) => {
                                                        // Allow only digits and limit to 10 characters
                                                        const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setEditForm(prev => ({ ...prev, mobile_number: digitsOnly }));
                                                    }}
                                                    className="block w-full rounded-md border-0 px-3 py-2 text-sm text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                    placeholder="10-digit mobile number"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setIsEditModalOpen(false)}
                                            className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            disabled={savingEdit}
                                            onClick={handleSaveStudent}
                                            className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
                                        >
                                            {savingEdit ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </div>
                            </Modal>
                        )}
                    </motion.div>
                </main>
            {/* Student Info & Access Control Modal */}
            {selectedStudent && (
                <Modal isOpen={isProgressModalOpen} onClose={() => { setIsProgressModalOpen(false); setSelectedStudent(null); setSelectedModule(null); setShowLevelsModal(false); setLevelsModalData({ module: null, levels: [] }); }} title={`Student Details: ${selectedStudent.name}`}>
                    <div className="p-6">
                        {/* Detailed Insights Section */}
                        {detailedInsights && (
                            <div className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                                <h3 className="text-lg font-semibold mb-4 text-blue-900 flex items-center gap-2">
                                    📊 Student Progress Insights
                                </h3>
                                
                                {/* Overall Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                    <div className="bg-white p-3 rounded-lg border">
                                        <div className="text-2xl font-bold text-blue-600">{detailedInsights.overall_stats.total_attempts}</div>
                                        <div className="text-sm text-gray-600">Total Attempts</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border">
                                        <div className="text-2xl font-bold text-green-600">{detailedInsights.overall_stats.average_score.toFixed(1)}%</div>
                                        <div className="text-sm text-gray-600">Average Score</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border">
                                        <div className="text-2xl font-bold text-purple-600">{detailedInsights.overall_stats.modules_accessed}</div>
                                        <div className="text-sm text-gray-600">Modules Accessed</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border">
                                        <div className="text-2xl font-bold text-orange-600">{detailedInsights.overall_stats.levels_unlocked}</div>
                                        <div className="text-sm text-gray-600">Levels Unlocked</div>
                                    </div>
                                </div>

                                {/* Module Analysis */}
                                <div className="mb-4">
                                    <h4 className="font-semibold mb-2 text-blue-800">Module Performance</h4>
                                    <div className="space-y-2">
                                        {Object.entries(detailedInsights.module_analysis).map(([moduleId, moduleData]) => {
                                            const pAttempts = Number((moduleData.practice && moduleData.practice.total_attempts) || 0);
                                            const oAttempts = Number((moduleData.online && moduleData.online.total_attempts) || 0);
                                            const attemptsCount = pAttempts + oAttempts;
                                            const pAvg = Number((moduleData.practice && moduleData.practice.average_score) || 0);
                                            const oAvg = Number((moduleData.online && moduleData.online.average_score) || 0);
                                            // Weighted average
                                            const displayScore = attemptsCount > 0 ? ((pAvg * pAttempts + oAvg * oAttempts) / attemptsCount) : (Number(moduleData.current_score || 0));
                                            return (
                                            <div key={moduleId} className="bg-white p-3 rounded-lg border flex justify-between items-center">
                                                <div>
                                                    <span className="font-medium">{moduleId}</span>
                                                    <span className="text-sm text-gray-600 ml-2">(Level: {moduleData.current_level || 'N/A'})</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-blue-600">{Number.isFinite(displayScore) ? displayScore.toFixed(1) : '0.0'}%</div>
                                                    <div className="text-xs text-gray-500">{attemptsCount} attempts — P: {pAttempts} ({pAttempts>0? pAvg.toFixed(1)+'%':'--'}) · O: {oAttempts} ({oAttempts>0? oAvg.toFixed(1)+'%':'--'})</div>
                                                </div>
                                            </div>
                                        )})}
                                    </div>
                                </div>

                                {/* Unlock Recommendations */}
                                {detailedInsights.unlock_recommendations && detailedInsights.unlock_recommendations.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-2 text-green-800">💡 Recommendations</h4>
                                        <div className="space-y-2">
                                            {detailedInsights.unlock_recommendations.map((rec, index) => (
                                                <div key={index} className="bg-white p-3 rounded-lg border border-green-200">
                                                    <div className="font-medium text-green-800">{rec.action}</div>
                                                    <div className="text-sm text-gray-600">{rec.reason}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <h3 className="text-lg font-semibold mb-2">Module Access Control</h3>
                        {progressLoading ? (
                            <LoadingSpinner />
                        ) : progressError ? (
                            <div className="text-red-500">{progressError}</div>
                        ) : (
                            <div>
                                {accessStatus.length === 0 && !progressError && (
                                    <div className="text-gray-500">No modules found for this student.</div>
                                )}
                                {sortedAccessStatus.map((mod) => (
                                    <div key={mod.module_id} className={`mb-4 p-4 border rounded-lg bg-gray-50 flex items-center justify-between transition ${mod.unlocked ? 'cursor-pointer hover:bg-blue-100' : ''}`}
                                        onClick={mod.unlocked ? async () => {
                                            setLevelsModalData({ module: mod, levels: mod.levels });
                                            setShowLevelsModal(true);
                                            setLevelPercentages({});
                                            await fetchLevelPercentages(selectedStudent, mod);
                                        } : undefined}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-lg">{mod.module_name}</span>
                                            {mod.unlocked ? <Unlock className="text-green-600" /> : <Lock className="text-gray-400" />}
                                        </div>
                                        {!mod.unlocked && (
                                            <button
                                                className={`ml-2 px-3 py-1 rounded font-semibold transition-colors duration-150 bg-green-200 text-green-800 hover:bg-green-300`}
                                                onClick={e => { e.stopPropagation(); handleModuleLockToggle(selectedStudent._id, mod.module_id, mod.unlocked); }}
                                                disabled={!!moduleActionLoading[mod.module_id]}
                                            >
                                                {moduleActionLoading[mod.module_id] ? 'Unlocking...' : 'Unlock Module'}
                                            </button>
                                        )}
                                        {mod.unlocked && (
                                            <button
                                                className={`ml-2 px-3 py-1 rounded font-semibold transition-colors duration-150 bg-red-200 text-red-800 hover:bg-red-300`}
                                                onClick={e => { e.stopPropagation(); handleModuleLockToggle(selectedStudent._id, mod.module_id, mod.unlocked); }}
                                                disabled={!!moduleActionLoading[mod.module_id]}
                                            >
                                                {moduleActionLoading[mod.module_id] ? 'Locking...' : 'Lock Module'}
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {unlockMsg && <div className="mt-2 text-center text-sm text-green-600">{unlockMsg}</div>}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
            {/* Level Tests Modal */}
            {levelTestModal.open && (
                <Modal title={`Tests for ${levelTestModal.level.level_name} in ${levelTestModal.module.module_name}`} onClose={() => setLevelTestModal({ open: false, module: null, level: null })}>
                    {levelTests.loading ? (
                        <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>
                    ) : (
                        <div className="space-y-6">
                            <div>
                                <h4 className="font-bold text-blue-700 mb-2">Practice Tests</h4>
                                {levelTests.practice.length === 0 ? (
                                    <div className="text-gray-400">No practice tests found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {levelTests.practice.map(test => (
                                            <li key={test._id} className="bg-blue-50 rounded px-4 py-2 flex flex-col">
                                                <span className="font-semibold text-blue-900">{test.name}</span>
                                                <span className="text-xs text-blue-600">Questions: {test.question_count}</span>
                                                <span className="text-xs text-gray-500">Created: {test.created_at}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div>
                                <h4 className="font-bold text-blue-700 mb-2">Online Tests</h4>
                                {levelTests.online.length === 0 ? (
                                    <div className="text-gray-400">No online tests found.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {levelTests.online.map(test => (
                                            <li key={test._id} className="bg-green-50 rounded px-4 py-2 flex flex-col">
                                                <span className="font-semibold text-green-900">{test.name}</span>
                                                <span className="text-xs text-green-600">Questions: {test.question_count}</span>
                                                <span className="text-xs text-gray-500">Created: {test.created_at}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </Modal>
            )}
            {/* Levels Modal */}
            {showLevelsModal && levelsModalData.module && levelsModalData.module.unlocked && (
                <Modal isOpen={showLevelsModal} onClose={() => { setShowLevelsModal(false); setLevelsModalData({ module: null, levels: [] }); }} title={`${levelsModalData.module.module_name} Levels`}>
                    <div className="p-4">
                        <div className="mb-4 text-lg font-semibold">Levels for {levelsModalData.module.module_name}</div>
                        {levelsModalData.levels.length === 0 ? (
                            <div className="text-gray-500">No levels found for this module.</div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {levelsModalData.levels.map(lvl => (
                                    <div key={lvl.level_id} className="flex flex-col md:flex-row md:items-center justify-between p-3 bg-white rounded shadow border">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold">{lvl.level_name}</span>
                                            {lvl.unlocked ? <Unlock className="text-green-600" /> : <Lock className="text-gray-400" />}
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
                                            <span className="text-xs text-blue-700">Practice: <b>{levelPercentages[lvl.level_id]?.practice?.toFixed(1) ?? '--'}%</b></span>
                                            <span className="text-xs text-green-700">Online: <b>{levelPercentages[lvl.level_id]?.online?.toFixed(1) ?? '--'}%</b></span>
                                        </div>
                                        <button
                                            className={`ml-2 px-2 py-1 rounded ${lvl.unlocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
                                            onClick={async () => {
                                                setLevelActionLoading(prev => ({ ...prev, [lvl.level_id]: true }));
                                                try {
                                                    if (lvl.unlocked) {
                                                        await lockStudentLevel(selectedStudent._id, lvl.level_id);
                                                        setUnlockMsg('Level locked!');
                                                    } else {
                                                        await authorizeStudentLevel(selectedStudent._id, lvl.level_id);
                                                        setUnlockMsg('Level unlocked!');
                                                    }
                                                    // Refresh levels for modal UI
                                                    const res = await getStudentAccessStatus(selectedStudent._id);
                                                    const updatedModule = (res.data.data || []).find(m => m.module_id === levelsModalData.module.module_id);
                                                    setLevelsModalData({ module: updatedModule, levels: updatedModule.levels });
                                                } catch (e) {
                                                    setUnlockMsg('Failed to update level access.');
                                                } finally {
                                                    setLevelActionLoading(prev => ({ ...prev, [lvl.level_id]: false }));
                                                    setTimeout(() => setUnlockMsg(''), 2000);
                                                }
                                            }}
                                            disabled={!!levelActionLoading[lvl.level_id]}
                                        >
                                            {levelActionLoading[lvl.level_id]
                                                ? (lvl.unlocked ? 'Locking...' : 'Unlocking...')
                                                : (lvl.unlocked ? 'Lock Level' : 'Unlock Level')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Modal>
            )}
            {/* Bulk Delete Confirmation Modal */}
            {showBulkDeleteModal && (
                <Modal 
                    isOpen={showBulkDeleteModal} 
                    onClose={() => setShowBulkDeleteModal(false)} 
                    title="Confirm Bulk Delete"
                >
                    <div className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-red-100 rounded-full">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">
                                    Delete {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}?
                                </h3>
                                <p className="text-gray-600 mt-1">
                                    This action cannot be undone. All selected students and their data will be permanently deleted.
                                </p>
                            </div>
                        </div>
                        
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h4 className="font-semibold text-red-900 mb-2">Warning:</h4>
                            <ul className="text-sm text-red-800 space-y-1">
                                <li>• All student accounts will be deleted</li>
                                <li>• All student progress data will be lost</li>
                                <li>• All test results will be permanently removed</li>
                                <li>• This action cannot be reversed</li>
                            </ul>
                        </div>
                        
                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => setShowBulkDeleteModal(false)}
                                disabled={bulkDeleteLoading}
                                className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={bulkDeleteLoading}
                                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {bulkDeleteLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        Delete {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}

            {/* Unlock message toast */}
            {unlockMsg && (
                <div className="fixed top-8 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg z-50 text-lg font-semibold animate-fade-in">{unlockMsg}</div>
            )}
        </>
    );
};

export default StudentManagement; 