import React, { createContext, useContext, useState, useEffect } from 'react';

const PermissionContext = createContext({
  permissions: {},
  hasPermission: (page, access) => true,
  isSubSuperadmin: false,
  loading: false,
  error: null
});

export const usePermissionContext = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissionContext must be used within PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isSubSuperadmin = false;

  // Check if user has permission
  const hasPermission = () => true;

  // Check permission via API (always allowed)
  const checkPermission = async () => true;

  // Get permission templates
  const getPermissionTemplates = async () => ({});

  // Refresh permissions
  const refreshPermissions = () => {};

  const value = {
    permissions,
    hasPermission,
    checkPermission,
    isSubSuperadmin,
    loading,
    error,
    refreshPermissions,
    getPermissionTemplates
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export default PermissionContext;
