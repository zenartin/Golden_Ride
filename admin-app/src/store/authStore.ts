import { create } from 'zustand';

interface AuthState {
  token: string | null;
  role: 'super_admin' | 'admin' | null;
  name: string | null;
  setAuth: (token: string, role: 'super_admin' | 'admin', name: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('admin_token'),
  role: localStorage.getItem('admin_role') as 'super_admin' | 'admin' | null,
  name: localStorage.getItem('admin_name'),
  setAuth: (token, role, name) => {
    localStorage.setItem('admin_token', token);
    localStorage.setItem('admin_role', role);
    localStorage.setItem('admin_name', name);
    set({ token, role, name });
  },
  logout: () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_name');
    set({ token: null, role: null, name: null });
  },
}));
