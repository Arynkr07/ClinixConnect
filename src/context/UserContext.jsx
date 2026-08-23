import { createContext, useContext, useMemo, useState } from 'react';

export const UserContext = createContext(null);

const DEFAULT_USER = {
  id: 'usr-001',
  name: 'Dr. Sharma',
  role: 'doctor',
  title: 'Senior Practitioner',
  facility: 'Rural Care Hospital',
  location: 'Raipur',
  avatar: '',
};

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(DEFAULT_USER);

  const updateProfile = (patch) =>
    setUserProfile((prev) => ({ ...prev, ...patch }));

  const value = useMemo(
    () => ({ userProfile, updateProfile }),
    [userProfile]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserProfile = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProvider');
  }
  return context;
};
