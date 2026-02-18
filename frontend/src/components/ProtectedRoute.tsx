import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../state/AppContext';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthLoading, isLoggedIn } = useAppContext();

  if (isAuthLoading) {
    return null;
  }

  if (!isLoggedIn) {
    return <Navigate replace to="/" />;
  }
  return children;
}
