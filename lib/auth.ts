import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDB } from '../db/offline-sqlite';

export type UserRole = 'INDEPENDENT_KABADIWALA' | 'AGGREGATOR_HUB' | 'AUTHORIZED_RECYCLER';

export interface AuthSession {
  userId: string;
  role: UserRole;
  token: string;
  aliasCode?: string;
  lastLogin: string;
}

/**
 * Persists the active session locally for offline-first capabilities.
 */
export const saveSessionLocally = async (session: AuthSession) => {
  // 1. Save to AsyncStorage for persistent global auth state (fast access)
  await AsyncStorage.setItem('auth_session', JSON.stringify(session));

  // 2. Keep a record in SQLite for deeper offline validation & query joins
  try {
    const db = getDB();
    db.execSync(`
      CREATE TABLE IF NOT EXISTS active_sessions (
          userId TEXT PRIMARY KEY,
          role TEXT,
          token TEXT,
          aliasCode TEXT,
          lastLogin TEXT
      );
    `);
    
    const statement = db.prepareSync(
      `INSERT OR REPLACE INTO active_sessions (userId, role, token, aliasCode, lastLogin) 
       VALUES ($userId, $role, $token, $aliasCode, $lastLogin)`
    );
    
    statement.executeSync({
      $userId: session.userId,
      $role: session.role,
      $token: session.token,
      $aliasCode: session.aliasCode || null,
      $lastLogin: session.lastLogin
    });
  } catch (error) {
    console.error("SQLite session save error:", error);
  }
};

/**
 * Retrieves the current session securely, falling back to offline DB if needed.
 */
export const getCurrentSession = async (): Promise<AuthSession | null> => {
  try {
    const stored = await AsyncStorage.getItem('auth_session');
    if (stored) {
      return JSON.parse(stored) as AuthSession;
    }
    
    // Fallback to SQLite if AsyncStorage was wiped but db persists
    const db = getDB();
    const result = db.getFirstSync('SELECT * FROM active_sessions LIMIT 1');
    if (result) {
      return result as AuthSession;
    }
  } catch (error) {
    console.error("Error retrieving session:", error);
  }
  return null;
};

export const logout = async () => {
  await AsyncStorage.removeItem('auth_session');
  try {
    const db = getDB();
    db.execSync('DELETE FROM active_sessions');
  } catch (error) {
    console.error("SQLite logout error", error);
  }
};
