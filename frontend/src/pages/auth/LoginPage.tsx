import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { isAuthLoading, isLoggedIn, login } = useAppContext();

  if (isAuthLoading) {
    return null;
  }

  if (isLoggedIn) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1>Bienvenido a Fulbo</h1>
        <p>Inicia sesion para ver tus torneos.</p>
        <button className={buttonStyles.primary} onClick={() => void login()} type="button">
          Continuar con Auth0
        </button>
      </div>
    </section>
  );
}
