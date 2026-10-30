import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />
  }

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check role-based access
  if (allowedRoles.length > 0 && user) {
    const isAllowed = 
      allowedRoles.includes(user.role) || 
      (allowedRoles.includes('staff') && user.role !== 'student') ||
      (allowedRoles.includes('superadmin') && user.role !== 'student');

    if (!isAllowed) {
      const roleRoutes = {
        superadmin: '/superadmin',
        super_admin: '/superadmin',
        campus_admin: '/campus-admin',
        course_admin: '/course-admin',
        student: '/student',
      }

      const redirectPath = roleRoutes[user.role] || (user.role !== 'student' ? '/superadmin' : '/student')
      return <Navigate to={redirectPath} replace />
    }
  }

  return children
}

export default ProtectedRoute 
