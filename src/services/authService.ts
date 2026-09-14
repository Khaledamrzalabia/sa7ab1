import { UserSession } from '../types';
import { getSupabase } from '../lib/supabase';

const SESSION_STORAGE_KEY = 'smart_forge_active_session';
const LOGGED_IN_KEY = 'smart_forge_is_logged_in';

export interface AuthResult {
  success: boolean;
  message?: string;
  user?: UserSession;
  token?: string;
}

/**
 * Production Authentication Service
 * Authenticates against Supabase Auth and Supabase PostgreSQL Database.
 * No hardcoded credentials in the frontend bundle.
 */
class AuthService {
  /**
   * Log in user via Supabase / Server API
   */
  public async login(identifier: string, password: string): Promise<AuthResult> {
    const trimmedId = identifier.trim();
    const trimmedPass = password.trim();

    if (!trimmedId || !trimmedPass) {
      return { success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور.' };
    }

    // 1. If identifier is an email and client Supabase SDK is connected, try Supabase Auth first
    if (trimmedId.includes('@')) {
      const supabase = getSupabase();
      if (supabase) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: trimmedId,
            password: trimmedPass,
          });

          if (!error && data?.user) {
            const u = data.user;
            const isGM =
              u.email?.includes('admin') ||
              u.user_metadata?.role === 'owner' ||
              u.user_metadata?.is_general_manager;

            const session: UserSession = {
              type: isGM ? 'owner' : 'assistant',
              id: u.id,
              name: u.user_metadata?.name || u.user_metadata?.full_name || 'محمد صلاح',
              username: u.email?.split('@')[0] || 'admin',
              phone: u.user_metadata?.phone,
              email: u.email,
              token: data.session?.access_token,
              roleTitle: isGM ? 'المدير العام (General Manager)' : (u.user_metadata?.role_title || 'مشرف وردية'),
              permissions: u.user_metadata?.permissions || {
                canCheckIn: true,
                canCheckOut: true,
                canRecordPermissions: true,
                canAddManualPenalties: true,
                canViewDailySummary: true,
                canPrintCards: true,
              },
            };

            this.saveSession(session);
            return { success: true, user: session, token: session.token };
          } else if (error) {
            console.warn('Supabase client auth error, attempting backend server verification:', error.message);
          }
        } catch (err: any) {
          console.warn('Direct Supabase sign in exception:', err);
        }
      }
    }

    // 2. Authenticate through Server API (verifies with Supabase PostgreSQL and handles all login formats)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: trimmedId,
          password: trimmedPass,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        this.saveSession(data.user);
        return {
          success: true,
          user: data.user,
          token: data.token,
          message: data.message,
        };
      } else {
        return {
          success: false,
          message: data.message || 'اسم المستخدم أو كلمة المرور غير صحيحة.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        message: 'تعذر الاتصال بخادم المصادقة السحابي: ' + (err.message || 'خطأ في الشبكة'),
      };
    }
  }

  /**
   * Save session to persistent storage
   */
  public saveSession(session: UserSession): void {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      localStorage.setItem(LOGGED_IN_KEY, 'true');
    } catch (e) {
      console.warn('Could not save session to localStorage:', e);
    }
  }

  /**
   * Get active user session
   */
  public getSession(): UserSession | null {
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not parse session:', e);
    }
    return null;
  }

  /**
   * Log out user
   */
  public async logout(): Promise<void> {
    try {
      const supabase = getSupabase();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.setItem(LOGGED_IN_KEY, 'false');
    }
  }
}

export const authService = new AuthService();
