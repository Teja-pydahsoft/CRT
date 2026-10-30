import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';

const PermissionContext = createContext({
  permissions: {},
  hasPermission: () => true,
  canRead: () => true,
  canWrite: () => true,
  isSuperAdmin: true,
  loading: false,
});

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const { user, loading } = useAuth();

  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'super_admin';

  const userPermissions = useMemo(() => {
    return user?.permissions || {};
  }, [user]);

  /**
   * Check if the current user has permission for a specific page
   * @param {string} page - Page identifier (e.g., 'dashboard', 'students', 'tests', 'user_management')
   * @param {string} access - 'read' or 'write' (defaults to 'read')
   */
  const hasPermission = (page, access = 'read') => {
    if (!user) return false;
    if (isSuperAdmin) return true;

    const pagePerm = userPermissions[page];
    if (!pagePerm) return false;

    if (typeof pagePerm === 'string') {
      if (access === 'read') return pagePerm === 'read' || pagePerm === 'write';
      return pagePerm === 'write';
    }

    if (typeof pagePerm === 'object') {
      if (access === 'read') return Boolean(pagePerm.read || pagePerm.write);
      return Boolean(pagePerm.write);
    }

    return false;
  };

  const canRead = (page) => hasPermission(page, 'read');
  const canWrite = (page) => hasPermission(page, 'write');

  const value = {
    permissions: userPermissions,
    hasPermission,
    canRead,
    canWrite,
    isSuperAdmin,
    isSubSuperadmin: false,
    loading
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;
