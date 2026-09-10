import { ArrowRight, ShieldCheck, Table2, Trophy, Users } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../state/AppContext';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const { isAuthLoading, isLoggedIn, login } = useAppContext();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [loginError, setLoginError] = useState(false);

  const handleLogin = async () => {
    setIsRedirecting(true);
    setLoginError(false);

    try {
      await login();
    } catch {
      setIsRedirecting(false);
      setLoginError(true);
    }
  };

  if (isAuthLoading) {
    return (
      <main className={styles.loginPage}>
        <div aria-live="polite" className={styles.loadingState} role="status">
          <span aria-hidden="true" className={styles.loadingBall} />
          <span>Cargando tu cancha...</span>
        </div>
      </main>
    );
  }

  if (isLoggedIn) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <main className={styles.loginPage}>
      <div aria-hidden="true" className={styles.pitchGraphic} />

      <div className={styles.pageShell}>
        <header className={styles.brand}>
          <img alt="Fulbo" className={styles.brandLogo} src="/fulbo_logo.png" />
          <span className={styles.brandTagline}>Gestión de torneos</span>
        </header>

        <div className={styles.heroGrid}>
          <section className={styles.heroCopy}>
            <p className={styles.eyebrow}>Tu fútbol, organizado</p>
            <h1>
              La cancha
              <span> empieza acá.</span>
            </h1>
            <p className={styles.lead}>
              Organizá cada fecha, seguí la tabla y mantené a tu equipo conectado dentro y fuera de la cancha.
            </p>

            <ul aria-label="Funcionalidades de Fulbo" className={styles.featureList}>
              <li>
                <Trophy aria-hidden="true" size={19} strokeWidth={1.8} />
                Torneos claros
              </li>
              <li>
                <Table2 aria-hidden="true" size={19} strokeWidth={1.8} />
                Tablas al día
              </li>
              <li>
                <Users aria-hidden="true" size={19} strokeWidth={1.8} />
                Planteles conectados
              </li>
            </ul>
          </section>

          <section aria-labelledby="login-title" className={styles.loginCard}>
            <div className={styles.cardTopline}>
              <span>Acceso al vestuario</span>
              <span aria-hidden="true">01</span>
            </div>

            <div className={styles.cardContent}>
              <div>
                <p className={styles.cardEyebrow}>Todo listo para jugar</p>
                <h2 id="login-title">Volvé a la cancha</h2>
                <p className={styles.cardDescription}>
                  Ingresá para ver tus torneos, próximos partidos y resultados.
                </p>
              </div>

              <button
                className={styles.loginButton}
                disabled={isRedirecting}
                onClick={() => void handleLogin()}
                type="button"
              >
                <span>{isRedirecting ? 'Abriendo acceso...' : 'Ingresar a Fulbo'}</span>
                {isRedirecting ? (
                  <span aria-hidden="true" className={styles.buttonSpinner} />
                ) : (
                  <ArrowRight aria-hidden="true" size={21} strokeWidth={2.2} />
                )}
              </button>

              {loginError ? (
                <p aria-live="polite" className={styles.loginError} role="status">
                  No pudimos abrir el acceso. Intentá nuevamente.
                </p>
              ) : null}

              <p className={styles.securityNote}>
                <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
                Acceso seguro protegido por Auth0
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
