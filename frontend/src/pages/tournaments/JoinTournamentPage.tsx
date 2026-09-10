import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Ticket,
  UserRoundCheck,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import styles from './JoinTournamentPage.module.css';

const ACCESS_CODE_LENGTH = 8;

export function JoinTournamentPage() {
  const navigate = useNavigate();
  const { loadTournaments } = useAppContext();
  const [tournamentCode, setTournamentCode] = useState('');
  const [playerCode, setPlayerCode] = useState('');
  const [isSubmittingTournamentCode, setIsSubmittingTournamentCode] = useState(false);
  const [isSubmittingPlayerCode, setIsSubmittingPlayerCode] = useState(false);
  const trimmedTournamentCode = tournamentCode.trim();
  const trimmedPlayerCode = playerCode.trim();
  const isBusy = isSubmittingTournamentCode || isSubmittingPlayerCode;

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <button className={styles.backButton} onClick={() => navigate('/tournaments')} type="button">
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a torneos
      </button>

      <div className={styles.layout}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Acceso al torneo</p>
          <h1>Tu lugar en la cancha te está esperando.</h1>
          <p className={styles.lead}>
            Usá el código que te compartió el organizador. Elegí el tipo de acceso según cómo te
            invitaron.
          </p>

          <ul className={styles.notes}>
            <li>
              <CheckCircle2 aria-hidden="true" size={19} strokeWidth={1.8} />
              El código del torneo envía una solicitud al organizador.
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={19} strokeWidth={1.8} />
              El código de jugador vincula un perfil que ya existe.
            </li>
          </ul>
        </header>

        <section aria-labelledby="join-access-title" className={styles.accessCard}>
          <div className={styles.cardTopline}>
            <h2 id="join-access-title">Elegí tu acceso</h2>
            <span aria-hidden="true">02 OPCIONES</span>
          </div>

          <article className={styles.accessMethod}>
            <div className={styles.methodHeader}>
              <span aria-hidden="true" className={styles.methodIcon}>
                <Ticket size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className={styles.methodLabel}>Opción 01</span>
                <h3>Código del torneo</h3>
              </div>
              <span className={styles.pendingBadge}>Requiere aprobación</span>
            </div>
            <p className={styles.methodDescription}>
              Enviá una solicitud para que el organizador te sume al plantel.
            </p>

            <form
              className={styles.form}
              onSubmit={async (event) => {
                event.preventDefault();

                if (!trimmedTournamentCode) {
                  return;
                }

                setIsSubmittingTournamentCode(true);
                try {
                  await sileo.promise(
                    apiClient.joinTournamentByCode({ code: trimmedTournamentCode }),
                    {
                      loading: { title: 'Enviando solicitud...' },
                      success: { title: 'Solicitud enviada. Estado: Pendiente' },
                      error: { title: 'No se pudo enviar la solicitud' },
                    },
                  );
                  await loadTournaments().catch(() => undefined);
                  navigate('/tournaments', { replace: true });
                } finally {
                  setIsSubmittingTournamentCode(false);
                }
              }}
            >
              <label htmlFor="tournament-code">Código de invitación</label>
              <div className={styles.inputWrap}>
                <KeyRound aria-hidden="true" size={19} />
                <input
                  autoComplete="one-time-code"
                  disabled={isBusy}
                  id="tournament-code"
                  maxLength={ACCESS_CODE_LENGTH}
                  minLength={ACCESS_CODE_LENGTH}
                  onChange={(event) => setTournamentCode(event.target.value)}
                  placeholder="AB12CD34"
                  required
                  spellCheck={false}
                  value={tournamentCode}
                />
              </div>
              <button
                className={styles.primaryButton}
                disabled={isBusy || !trimmedTournamentCode}
                type="submit"
              >
                <span>{isSubmittingTournamentCode ? 'Enviando...' : 'Enviar solicitud'}</span>
                {isSubmittingTournamentCode ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
                ) : (
                  <ArrowRight aria-hidden="true" size={20} />
                )}
              </button>
            </form>
          </article>

          <div aria-hidden="true" className={styles.divider}>
            <span>o</span>
          </div>

          <article className={styles.accessMethod}>
            <div className={styles.methodHeader}>
              <span aria-hidden="true" className={`${styles.methodIcon} ${styles.playerIcon}`}>
                <UserRoundCheck size={22} strokeWidth={1.8} />
              </span>
              <div>
                <span className={styles.methodLabel}>Opción 02</span>
                <h3>Código de jugador</h3>
              </div>
              <span className={styles.directBadge}>Acceso directo</span>
            </div>
            <p className={styles.methodDescription}>
              Reclamá el perfil que el organizador ya creó para vos.
            </p>

            <form
              className={styles.form}
              onSubmit={async (event) => {
                event.preventDefault();

                if (!trimmedPlayerCode) {
                  return;
                }

                setIsSubmittingPlayerCode(true);
                try {
                  await sileo.promise(apiClient.claimPlayerByCode({ claimCode: trimmedPlayerCode }), {
                    loading: { title: 'Reclamando jugador...' },
                    success: { title: 'Jugador vinculado con éxito' },
                    error: { title: 'Código inválido o expirado' },
                  });
                  await loadTournaments().catch(() => undefined);
                  navigate('/tournaments', { replace: true });
                } finally {
                  setIsSubmittingPlayerCode(false);
                }
              }}
            >
              <label htmlFor="player-code">Código personal</label>
              <div className={styles.inputWrap}>
                <KeyRound aria-hidden="true" size={19} />
                <input
                  autoComplete="one-time-code"
                  disabled={isBusy}
                  id="player-code"
                  maxLength={ACCESS_CODE_LENGTH}
                  minLength={ACCESS_CODE_LENGTH}
                  onChange={(event) => setPlayerCode(event.target.value)}
                  placeholder="AB12CD34"
                  required
                  spellCheck={false}
                  value={playerCode}
                />
              </div>
              <button
                className={styles.secondaryButton}
                disabled={isBusy || !trimmedPlayerCode}
                type="submit"
              >
                <span>{isSubmittingPlayerCode ? 'Vinculando...' : 'Reclamar mi jugador'}</span>
                {isSubmittingPlayerCode ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
                ) : (
                  <ArrowRight aria-hidden="true" size={20} />
                )}
              </button>
            </form>
          </article>

          <p className={styles.securityNote}>
            <ShieldCheck aria-hidden="true" size={16} strokeWidth={1.8} />
            Cada código puede estar limitado o vencer por seguridad.
          </p>
        </section>
      </div>
    </section>
  );
}
