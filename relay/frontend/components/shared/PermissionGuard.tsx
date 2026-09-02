import React from 'react';

interface PermissionGuardProps {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ allowed, children, fallback = null }: PermissionGuardProps) {
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
