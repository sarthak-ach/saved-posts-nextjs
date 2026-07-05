'use client';

import React, { createContext, useContext, useState } from 'react';

export type UserCredentials = {
  id: string;
  name: string;
  role: 'student' | 'moderator';
};

export const MOCK_USERS: UserCredentials[] = [
  { id: 'alice', name: 'Alice (Student A - Courses 1 & 3)', role: 'student' },
  { id: 'bob', name: 'Bob (Student B - Courses 1, 2 & 4)', role: 'student' },
  { id: 'charlie', name: 'Charlie (Moderator - All Courses)', role: 'moderator' },
];

type AuthContextType = {
  currentUser: UserCredentials;
  setCurrentUser: (user: UserCredentials) => void;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getInitialUser() {
  if (typeof window === 'undefined') return MOCK_USERS[0];

  const saved = localStorage.getItem('mock_user_id');
  return MOCK_USERS.find((user) => user.id === saved) ?? MOCK_USERS[0];
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserCredentials>(getInitialUser);

  const handleSetUser = (user: UserCredentials) => {
    setCurrentUser(user);
    localStorage.setItem('mock_user_id', user.id);
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser: handleSetUser, isLoading: false }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useMockAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useMockAuth must be used within an AuthProvider');
  }
  return context;
};