import React from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { DashboardProvider } from './contexts/DashboardContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { FeatureProvider } from './contexts/FeatureContext'
import { PermissionProvider } from './contexts/PermissionContext'

// Auth Pages
import Login from './pages/auth/Login'
import GetStarted from './pages/auth/GetStarted'
import SSOLogin from './pages/auth/SSOLogin'

// Super Admin Pages
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard'
import TestManagement from './pages/superadmin/TestManagement'
import StudentManagement from './pages/superadmin/StudentManagement'
import ResultsManagement from './pages/superadmin/ResultsManagement'
import QuestionBankUpload from './pages/superadmin/QuestionBankUpload'
import CRTUpload from './pages/superadmin/CRTUpload'
import ProgressTracking from './pages/superadmin/ProgressTracking'

// Campus Admin Pages
import CampusAdminDashboard from './pages/campus-admin/CampusAdminDashboard'
import CampusStudentManagement from './pages/campus-admin/CampusStudentManagement'
import CampusReports from './pages/campus-admin/CampusReports'

// Course Admin Pages
import CourseAdminDashboard from './pages/course-admin/CourseAdminDashboard'
import CourseStudentManagement from './pages/course-admin/CourseStudentManagement'
import StudentProgress from './pages/course-admin/StudentProgress'
import CourseReports from './pages/course-admin/CourseReports'

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard'
import PracticeModules from './pages/student/PracticeModules'
import CRTModules from './pages/student/CRTModules'
import OnlineExams from './pages/student/OnlineExams'
import TestHistory from './pages/student/TestHistory'

// Test Pages
import ProgressTracker from './pages/student/ProgressTracker'
import StudentProfile from './pages/student/Profile'
import SuperAdminProfile from './pages/superadmin/Profile'
import OnlineExamTaking from './pages/student/OnlineExamTaking'
import TestResult from './pages/student/TestResult'
import PracticeModuleTaking from './pages/student/PracticeModuleTaking'
import TechnicalTestTaking from './pages/student/TechnicalTestTaking'
import WritingTestTaking from './pages/student/WritingTestTaking'

// Components
import ProtectedRoute from './components/common/ProtectedRoute'
import LoadingSpinner from './components/common/LoadingSpinner'
import ErrorBoundary from './components/common/ErrorBoundary'
import NotificationToast from './components/common/NotificationToast'

// Admin Components
import SuperAdminSidebar from './components/common/SuperAdminSidebar'
import CampusAdminSidebar from './components/common/CampusAdminSidebar'
import CourseAdminSidebar from './components/common/CourseAdminSidebar'
import StudentSidebar from './pages/student/StudentSidebar'

function AppContent() {
  const location = useLocation()
  const isPublicRoute = location.pathname === '/' || location.pathname === '/login'
  
  return (
    <div className={isPublicRoute ? "min-h-screen bg-gray-50 overflow-y-auto" : "h-screen bg-gray-50 overflow-hidden"}>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#4ade80',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <NotificationToast />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<GetStarted />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sso-login" element={<SSOLogin />} />

        {/* Admin Routes */}
        {/* Super Admin Routes */}
        <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['superadmin', 'campus_admin', 'course_admin']}><SuperAdminSidebar /></ProtectedRoute>}>
          <Route index element={<SuperAdminDashboard />} />
          <Route path="dashboard" element={<SuperAdminDashboard />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="results" element={<ResultsManagement />} />
          <Route path="progress-tracking" element={<ProgressTracking />} />
          <Route path="tests" element={<TestManagement />} />
          <Route path="tests/create" element={<TestManagement />} />
          <Route path="question-bank-upload" element={<QuestionBankUpload />} />
          <Route path="crt-upload" element={<CRTUpload />} />
          <Route path="profile" element={<SuperAdminProfile />} />
        </Route>

        {/* Campus Admin Routes */}
        <Route path="/campus-admin" element={<ProtectedRoute allowedRoles={['campus_admin']}><CampusAdminSidebar /></ProtectedRoute>}>
          <Route index element={<CampusAdminDashboard />} />
          <Route path="dashboard" element={<CampusAdminDashboard />} />
          <Route path="students" element={<CampusStudentManagement />} />
          <Route path="tests" element={<TestManagement />} />
          <Route path="results" element={<ResultsManagement />} />
          <Route path="reports" element={<CampusReports />} />
          <Route path="profile" element={<SuperAdminProfile />} />
        </Route>

        {/* Course Admin Routes */}
        <Route path="/course-admin" element={<ProtectedRoute allowedRoles={['course_admin']}><CourseAdminSidebar /></ProtectedRoute>}>
          <Route index element={<CourseAdminDashboard />} />
          <Route path="dashboard" element={<CourseAdminDashboard />} />
          <Route path="students" element={<CourseStudentManagement />} />
          <Route path="tests" element={<TestManagement />} />
          <Route path="results" element={<ResultsManagement />} />
          <Route path="reports" element={<CourseReports />} />
          <Route path="progress" element={<StudentProgress />} />
          <Route path="profile" element={<SuperAdminProfile />} />
        </Route>

        {/* Student Routes */}
        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentSidebar /></ProtectedRoute>}>
          <Route index element={<StudentDashboard />} />
          <Route path="practice" element={<PracticeModules />} />
          <Route path="crt" element={<CRTModules />} />
          <Route path="exams" element={<OnlineExams />} />
          <Route path="history" element={<TestHistory />} />
          <Route path="progress" element={<ProgressTracker />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="test-result/:resultId" element={<TestResult />} />
          <Route path="practice-modules/:testId" element={<PracticeModuleTaking />} />
          <Route path="technical-test/:testId" element={<TechnicalTestTaking />} />
          <Route path="writing-test/:testId" element={<WritingTestTaking />} />
        </Route>

        {/* Exam Taking Routes - No Sidebar */}
        <Route path="/student/exam" element={<ProtectedRoute allowedRoles={['student']}><OnlineExamTaking /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PermissionProvider>
          <DashboardProvider>
            <NotificationProvider>
              <FeatureProvider>
                <AppContent />
              </FeatureProvider>
            </NotificationProvider>
          </DashboardProvider>
        </PermissionProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
