import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNotification } from '../../contexts/NotificationContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import api from '../../services/api';
import { Users, Filter, Search, ChevronRight, RotateCcw, Download } from 'lucide-react';
import { 
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

    // Pagination & lazy loading state
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

    // Fetch colleges on mount
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
        setSearchTerm(searchInput);
        setCurrentPage(1);
    };

    const handleClearSearch = () => {
        setSearchInput('');
        setSearchTerm('');
        setCurrentPage(1);
    };

    const loadMore = () => {
        if (hasMore && !loadingMore) {
            fetchStudents(currentPage + 1, searchTerm);
        }
    };

    const formatPhotoUrl = (photo) => {
        if (!photo) return null;
        const trimmed = String(photo).trim();
        if (trimmed.startsWith('data:image/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        return `data:image/jpeg;base64,${trimmed}`;
    };

    return (
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
                                : 'View student information across the system.'}
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

                {/* Student Display Table */}
                <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 w-full flex flex-col flex-1 min-h-0">
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
                                    {searchTerm ? `No students match your search for "${searchTerm}"` : 'No students have been found in the database.'}
                                </p>
                            </motion.div>
                        ) : (
                            <>
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200 w-16">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Photo</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Student Name</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">PIN Number</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">College Name</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Course</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Branch</span>
                                            </th>
                                            <th className="px-3 sm:px-6 py-3.5 text-left border-b border-gray-200">
                                                <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Year & Sem</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-100">
                                        {students.map((student, index) => {
                                            const photoUrl = formatPhotoUrl(student.photo || student.student_photo);
                                            const pinNumber = student.pin_no || student.roll_number || student.username || student.admission_number || 'N/A';
                                            const studentName = student.name || student.student_name || 'N/A';
                                            const collegeName = student.college_name || student.campus_name || 'Main Campus';
                                            const courseName = student.course_name || 'N/A';
                                            const branchName = student.branch_name || student.batch_name || 'General';

                                            return (
                                                <motion.tr 
                                                    key={student._id || student.id || index} 
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: Math.min(index * 0.02, 0.3) }}
                                                    className="group hover:bg-blue-50/40 transition-colors duration-150"
                                                >
                                                    {/* 1. Photo */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap w-16">
                                                        <div className="w-10 h-10 relative flex-shrink-0">
                                                            {photoUrl ? (
                                                                <img 
                                                                    src={photoUrl} 
                                                                    alt={studentName}
                                                                    className="w-10 h-10 rounded-full object-cover border-2 border-emerald-400 shadow-sm"
                                                                    onError={(e) => {
                                                                        e.currentTarget.style.display = 'none';
                                                                        if (e.currentTarget.nextElementSibling) {
                                                                            e.currentTarget.nextElementSibling.style.display = 'flex';
                                                                        }
                                                                    }}
                                                                />
                                                            ) : null}
                                                            <div 
                                                                className={`w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm items-center justify-center shadow-sm ${photoUrl ? 'hidden' : 'flex'}`}
                                                            >
                                                                {studentName.charAt(0).toUpperCase()}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* 2. Student Name */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                                                        <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                            {studentName}
                                                        </div>
                                                    </td>

                                                    {/* 3. PIN Number */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                                                        <span className="inline-block font-mono text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-800 rounded-md border border-gray-200">
                                                            {pinNumber}
                                                        </span>
                                                    </td>

                                                    {/* 4. College Name */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200/60 max-w-[240px] truncate" title={collegeName}>
                                                            {collegeName}
                                                        </span>
                                                    </td>

                                                    {/* 5. Course */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {courseName}
                                                        </div>
                                                    </td>

                                                    {/* 6. Branch */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                                                        <span className="inline-flex items-center text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded">
                                                            {branchName}
                                                        </span>
                                                    </td>

                                                    {/* 7. Year & Sem */}
                                                    <td className="px-3 sm:px-6 py-3.5 whitespace-nowrap">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                                                {student.year ? `Year ${student.year}` : 'Year -'}
                                                            </span>
                                                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                                                {student.year && student.semester 
                                                                    ? `${student.year}-${student.semester}` 
                                                                    : student.semester ? `Sem ${student.semester}` : 'Sem -'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            );
                                        })}
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
            </motion.div>
        </main>
    );
};

export default StudentManagement;
