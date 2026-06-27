import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from '../types';
import {
  login as apiLogin,
  signup as apiSignup,
  fetchMe,
  fetchProducts,
  fetchMySubscription,
  getAccessToken,
  getWorkspace,
  clearAuth,
  setWorkspace,
  type BackendUser,
  type ProductSlug,
} from '../lib/api';
import { slugsFromSubscription } from '../lib/entitlements';

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
  country?: string;
  terms_accepted?: boolean;
}

interface SignupResultInfo {
  provisioning: boolean;
  workspace: string;
  requiresEmailVerification: boolean;
  email: string;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string, workspace?: string) => Promise<User>;
  hydrateSession: (workspace?: string | null) => Promise<User>;
  signup: (data: SignupData) => Promise<SignupResultInfo>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshProducts: () => Promise<ProductSlug[]>;
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
    isSuperAdmin: !!be.is_staff,
    tenantId: workspace || '',
    products,
    setupComplete: true,
    emailVerified: !!be.is_verified,
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

  const hydrateSession = async (workspace?: string | null) => {
    const resolvedWs = workspace ?? getWorkspace();
    const [me, products] = await Promise.all([fetchMe(), fetchProducts()]);
    const appUser = toAppUser(me, products ?? [], resolvedWs);
    setUser(appUser);
    setToken(getAccessToken());
    return appUser;
  };

  const login = async (email: string, password: string, workspace?: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin(email, password, workspace);
      if (res.kind === 'mfa') {
        throw new Error('MFA_REQUIRED');
      }
      const resolvedWs = res.workspace ?? workspace ?? getWorkspace();
      return await hydrateSession(resolvedWs);
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (data: SignupData): Promise<SignupResultInfo> => {
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
        country: data.country || 'IN',
        terms_accepted: data.terms_accepted ?? false,
      });
      // Provisioning runs in the background, so products arrive later (via the
      // status poll → refreshProducts). Keep them empty until then.
      setUser(
        toAppUser(
          result.user ?? { id: '', email: data.email, full_name: fullName, is_staff: false, is_verified: false },
          result.products ?? [],
          result.workspace,
        ),
      );
      setToken(result.access);
      return {
        provisioning: !!result.provisioning,
        workspace: result.workspace,
        requiresEmailVerification: !!result.requires_email_verification,
        email: data.email,
      };
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProducts = async (): Promise<ProductSlug[]> => {
    try {
      const sub = await fetchMySubscription();
      const slugs = slugsFromSubscription(sub);
      if (slugs.length > 0) {
        setUser((prev) => (prev ? { ...prev, products: slugs } : prev));
        return slugs;
      }
    } catch {
      /* pending workspace */
    }
    const products = await fetchProducts();
    const slugs = products ?? [];
    if (slugs.length > 0) {
      setUser((prev) => (prev ? { ...prev, products: slugs } : prev));
    }
    return slugs;
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
        hydrateSession,
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
