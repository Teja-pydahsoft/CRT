import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search, Users } from 'lucide-react';
import api from '../../services/api';

const PAGE_SIZE = 25;

const SDMSStudentDirectory = ({ title }) => {
  const [students, setStudents] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadStudents = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/student/sdms/students', {
        params: { page, limit: PAGE_SIZE, search: search || undefined, include_photo: false }
      });
      setStudents(response.data.data || []);
      setPagination(response.data.pagination || { total: 0, pages: 1 });
    } catch (error) {
      setLoadError(error.response?.data?.message || 'Unable to load students from SDMS.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const submitSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Student identities and academic records are read directly from SDMS. This directory cannot create, edit, or delete student records.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
          <Users className="h-5 w-5" />
          {pagination.total.toLocaleString()} students
        </div>
      </div>

      <form onSubmit={submitSearch} className="flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search name, roll number, admission number, or email"
            className="w-full rounded-xl border border-gray-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </label>
        <button type="submit" className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
          Search
        </button>
        <button
          type="button"
          onClick={loadStudents}
          disabled={loading}
          aria-label="Refresh student directory"
          className="inline-flex items-center justify-center rounded-xl border border-gray-300 px-4 py-2.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </form>

      {loadError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Roll / Admission</th>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3">Course / Branch</th>
                <th className="px-4 py-3">Year / Semester</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">Loading SDMS students...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-gray-500">No students found.</td></tr>
              ) : students.map((student) => (
                <tr key={student.sdms_student_id || student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{student.name || '—'}</div>
                    <div className="text-xs text-gray-500">{student.email || 'No email'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{student.roll_number || student.pin_no || '—'}</div>
                    <div className="text-xs text-gray-500">{student.admission_number || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{student.college_name || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    <div>{student.course_name || '—'}</div>
                    <div className="text-xs text-gray-500">{student.branch_name || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {student.year || '—'} / {student.semester || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{student.section || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{student.status || 'Active'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
          <span className="text-xs text-gray-500">Page {page} of {Math.max(pagination.pages || 1, 1)}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(pagination.pages || 1, current + 1))}
              disabled={loading || page >= (pagination.pages || 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SDMSStudentDirectory;
