'use client';

import { create } from 'zustand';
import type { User, UserRole, Scope } from '@/types/api';
import { clearAuthCookie } from '@/lib/auth-cookie';
import { AUTH_USER_KEY } from '@/lib/constants';

// ─── localStorage helpers (called outside React — safe in both client and SSR) ─

export function readStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // localStorage quota exceeded — non-fatal
  }
}

function clearStoredUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_USER_KEY);
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  // Promoted from user for direct typed access (Authentication.md §3).
  role: UserRole | null;
  scope: Scope | null;
  companyId: string | null;
  companyKey: string | null;
  mustChangePassword: boolean;
  isEmailVerified: boolean;

  setAuth: (user: User, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  role: null,
  scope: null,
  companyId: null,
  companyKey: null,
  mustChangePassword: false,
  isEmailVerified: false,

  setAuth: (user, accessToken) => {
    writeStoredUser(user);
    set({
      user,
      accessToken,
      isAuthenticated: true,
      role: user.role,
      scope: user.scope,
      companyId: user.companyId,
      companyKey: user.companyKey,
      mustChangePassword: user.mustChangePassword ?? false,
      isEmailVerified: user.isEmailVerified,
    });
  },

  setAccessToken: (accessToken) =>
    set({ accessToken, isAuthenticated: true }),

  clearAuth: () => {
    clearStoredUser();
    clearAuthCookie();
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      role: null,
      scope: null,
      companyId: null,
      companyKey: null,
      mustChangePassword: false,
      isEmailVerified: false,
    });
  },
}));
