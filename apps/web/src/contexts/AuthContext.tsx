import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import {
  login as apiLogin,
  signup as apiSignup,
  fetchMe,
  fetchProducts,
  devActivateSubscription,
  getAccessToken,
  getWorkspace,
  clearAuth,
  setWorkspace,
  type BackendUser,
  type ProductSlug,
} from '../lib/api';

/** Map a website plan id → product slugs (mirrors the backend mapping). */
function productsForPlan(planId: string): ProductSlug[] {
  if (planId.includes('complete')) return ['finance', 'hrms'];
  if (planId.includes('hrms')) return ['hrms'];
  if (planId.includes('finance')) return ['finance'];
  return ['finance'];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  planId: string;
  companyName: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, workspace?: string) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshProducts: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Map the FIN backend user (+ derived products) onto the app's User shape. */
function toAppUser(be: BackendUser, products: ProductSlug[], workspace: string | null): User {
  const [firstName, ...rest] = (be.full_name || be.email.split('@')[0]).split(' ');
  return {
    id: String(be.id),
    email: be.email,
    firstName: firstName || be.email.split('@')[0],
    lastName: rest.join(' '),
    role: be.is_staff ? 'admin' : 'owner',
    tenantId: workspace || '',
    products,
    setupComplete: true,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(getAccessToken());
  const [isLoading, setIsLoading] = useState<boolean>(!!getAccessToken());

  // Bootstrap: if we have a stored access token, hydrate the user from the API.
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      if (!getAccessToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const [me, products] = await Promise.all([fetchMe(), fetchProducts()]);
        if (cancelled) return;
        setUser(toAppUser(me, products ?? [], getWorkspace()));
        setToken(getAccessToken());
      } catch {
        if (!cancelled) {
          clearAuth();
          setUser(null);
          setToken(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string, workspace?: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password, workspace);
      const resolvedWs = workspace ?? res.workspace ?? getWorkspace();
      const [me, rawProducts] = await Promise.all([fetchMe(), fetchProducts()]);

      // Dev mode: if no active products (PENDING subscription), auto-activate
      // so testing is always free — no billing page required.
      let products = rawProducts;
      if (import.meta.env.DEV && (!products || products.length === 0)) {
        try {
          await devActivateSubscription();
          products = await fetchProducts();
        } catch { /* no workspace yet — leave products empty */ }
      }

      setUser(toAppUser(me, products ?? [], resolvedWs));
      setToken(res.access);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData) => {
    setIsLoading(true);
    try {
      const fullName = [data.firstName, data.lastName].filter(Boolean).join(' ');
      const result = await apiSignup({
        email: data.email,
        password: data.password,
        full_name: fullName,
        company_name: data.companyName,
        plan_id: data.planId,
        products: productsForPlan(data.planId),
      });
      setUser(
        toAppUser(
          result.user ?? { id: '', email: data.email, full_name: fullName, is_staff: false },
          result.products ?? productsForPlan(data.planId),
          result.workspace,
        ),
      );
      setToken(result.access);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProducts = async () => {
    const products = await fetchProducts();
    if (products && products.length > 0) {
      setUser(prev => prev ? { ...prev, products } : prev);
    }
  };

  const logout = () => {
    clearAuth();
    setWorkspace(null);
    setUser(null);
    setToken(null);
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
        refreshProducts,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
