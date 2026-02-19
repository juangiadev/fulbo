import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { ContentSpinner } from './ContentSpinner';
import { useAppContext } from '../state/AppContext';
import styles from './ProtectedRoute.module.css';

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { isAuthLoading, isLoggedIn } = useAppContext();

  if (isAuthLoading) {
    return (
      <section className={styles.loadingWrap}>
        <ContentSpinner />
      </section>
    );
  }

  if (!isLoggedIn) {
    return <Navigate replace to="/" />;
  }
  return children;
}
