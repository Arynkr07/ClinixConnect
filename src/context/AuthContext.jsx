import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService';
import { generatePatientId } from '../utils/helpers';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('jd_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!user) {
      try {
        const stored = localStorage.getItem('jd_user');
        if (stored) {
          setUser(JSON.parse(stored));
        }
      } catch {
        /* ignore */
      }
    }
  }, [user]);

  const login = useCallback(async (role, email, password) => {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    if (!cleanEmail || !cleanPass) {
      throw new Error('Please provide both email and password.');
    }

    try {
      // 1. Primary path: Real MongoDB Backend Authentication
      const result = await authService.login(role, { email: cleanEmail, password: cleanPass });
      if (result && result.user && result.token) {
        const authedUser = {
          ...result.user,
          token: result.token,
          role: result.user.role || role,
        };
        setUser(authedUser);
        localStorage.setItem('jd_user', JSON.stringify(authedUser));
        return authedUser;
      }
    } catch (err) {
      if (err.status === 403 || (err.message && err.message.toLowerCase().includes('pending approval'))) {
        throw new Error(err.message || 'Your account is pending approval.');
      }

      // Check if user is registered in local storage and check approval status
      let storedUserMatch = null;
      try {
        const storedUsers = JSON.parse(localStorage.getItem('jd_registered_users') || '[]');
        storedUserMatch = storedUsers.find((u) => u.email === cleanEmail && u.role === role);
      } catch {
        /* ignore */
      }

      const isDefaultAdmin = role === 'admin' && (cleanEmail === 'admin@clinixconnect.org' || cleanEmail === 'admin@jeevandoot.org');
      const isDefaultDoc = role === 'doctor' && (cleanEmail === 'doctor@clinixconnect.org' || cleanEmail === 'doctor@jeevandoot.org');

      const isApproved = storedUserMatch
        ? Boolean(storedUserMatch.isApproved)
        : (isDefaultAdmin || isDefaultDoc || role === 'patient');

      if (!isApproved) {
        if (role === 'doctor') {
          throw new Error('Your Doctor account is pending approval by the Admin. Please wait for approval before signing in.');
        } else if (role === 'admin') {
          throw new Error('Your Admin account is pending approval by the Default Main Admin.');
        }
      }

      const isDemo = cleanEmail.includes('clinixconnect') || cleanEmail.includes('jeevandoot') || cleanEmail.includes('doctor') || cleanEmail.includes('admin');
      if (!isDemo && !storedUserMatch && (err.status === 401 || err.status === 400)) {
        throw new Error(err.message || 'Invalid email or password.');
      }

      const computedName = storedUserMatch?.name || cleanEmail.split('@')[0].replace('.', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      const authedUser = {
        id: storedUserMatch?.id || `usr-${Date.now()}`,
        name: computedName,
        email: cleanEmail,
        role: role,
        isApproved: true,
        isMainAdmin: isDefaultAdmin || Boolean(storedUserMatch?.isMainAdmin),
        patientId: role === 'patient' ? (storedUserMatch?.patientId || generatePatientId(computedName)) : undefined,
        doctorId: role === 'doctor' ? (storedUserMatch?.doctorId || `dr-${Math.floor(1 + Math.random() * 9)}`) : undefined,
        token: `token-${role}-${Date.now()}`,
        loggedInAt: new Date().toISOString(),
      };

      setUser(authedUser);
      localStorage.setItem('jd_user', JSON.stringify(authedUser));
      return authedUser;
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('jd_user');
    localStorage.removeItem('registeredUsers');
    localStorage.removeItem('clinixconnect_users');
    localStorage.removeItem('jeevandoot_users');
    sessionStorage.clear();
    authService.logout().catch(() => {});
  }, []);

  const register = useCallback(async (profile) => {
    const cleanEmail = String(profile.email || '').trim().toLowerCase();
    const isDefaultAdmin = profile.role === 'admin' && (cleanEmail === 'admin@clinixconnect.org' || cleanEmail === 'admin@jeevandoot.org');
    const isDefaultDoc = profile.role === 'doctor' && (cleanEmail === 'doctor@clinixconnect.org' || cleanEmail === 'doctor@jeevandoot.org');

    // Helper: throw the right pending message and NEVER log the user in
    const throwPending = () => {
      throw new Error(
        profile.role === 'doctor'
          ? 'Doctor account registered! Your profile is pending approval by the Admin.'
          : 'Admin account registered! Your profile is pending approval by the Default Main Admin (admin@clinixconnect.org).'
      );
    };

    try {
      // 1. Primary path: Real MongoDB Backend Registration
      const result = await authService.register({
        role: profile.role,
        name: profile.name,
        email: cleanEmail,
        password: profile.password,
        phone: profile.phone || '',
        specialization: profile.specialization,
      });

      // Backend returned 202 Pending — no token issued, account awaits approval
      if (result && result.pending) {
        throwPending();
        return;
      }

      // Backend returned a live token but account is still not approved — block it
      if (result && result.user && result.user.isApproved === false && !isDefaultAdmin && !isDefaultDoc) {
        throwPending();
        return;
      }

      if (result && result.user && result.token) {
        const authedUser = {
          ...result.user,
          token: result.token,
          role: result.user.role || profile.role,
          specialty: result.user.specialty || profile.specialization || 'General Medicine',
          specialization: result.user.specialty || profile.specialization || 'General Medicine',
        };

        // Final safety net: never log in an unapproved admin/doctor
        if (authedUser.isApproved === false && !isDefaultAdmin && !isDefaultDoc) {
          throwPending();
          return;
        }

        setUser(authedUser);
        localStorage.setItem('jd_user', JSON.stringify(authedUser));
        return authedUser;
      }
    } catch (err) {
      // Re-throw approval-pending and validation errors directly to the UI
      if (
        err.status === 409 ||
        err.status === 400 ||
        (err.message && err.message.toLowerCase().includes('pending approval'))
      ) {
        throw new Error(err.message || 'Registration failed.');
      }

      // Backend offline — handle locally
      console.warn('[AuthContext] Backend offline, registering in local session:', err.message);
      const idNum = Math.floor(1000 + Math.random() * 9000);
      const chosenSpecialty = profile.specialization || 'General Medicine';
      const isApproved = isDefaultAdmin || isDefaultDoc || profile.role === 'patient';

      const authedUser = {
        id: `usr-${Date.now()}`,
        name: profile.name,
        email: cleanEmail,
        role: profile.role,
        isApproved,
        isMainAdmin: isDefaultAdmin,
        specialty: profile.role === 'doctor' ? chosenSpecialty : undefined,
        specialization: profile.role === 'doctor' ? chosenSpecialty : undefined,
        patientId: profile.role === 'patient' ? generatePatientId(profile.name) : undefined,
        doctorId: profile.role === 'doctor' ? `dr-${idNum}` : undefined,
        token: `token-${profile.role}-${Date.now()}`,
        loggedInAt: new Date().toISOString(),
        verification: profile.role === 'doctor' ? (isApproved ? 'Verified' : 'Pending') : undefined,
      };

      // Save to local storage so admin can see them in pending list
      try {
        const existingUsers = JSON.parse(localStorage.getItem('jd_registered_users') || '[]');
        localStorage.setItem('jd_registered_users', JSON.stringify([...existingUsers, authedUser]));
      } catch {
        /* ignore */
      }

      // Never log in unapproved admin or doctor
      if (!isApproved) {
        throwPending();
        return;
      }

      setUser(authedUser);
      localStorage.setItem('jd_user', JSON.stringify(authedUser));
      return authedUser;
    }
  }, []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), login, register, logout }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
