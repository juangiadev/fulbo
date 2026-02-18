import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import buttonStyles from '../../styles/Button.module.css';
import styles from './JoinTournamentPage.module.css';

export function JoinTournamentPage() {
  const navigate = useNavigate();
  const [tournamentCode, setTournamentCode] = useState('');
  const [playerCode, setPlayerCode] = useState('');
  const [isSubmittingTournamentCode, setIsSubmittingTournamentCode] = useState(false);
  const [isSubmittingPlayerCode, setIsSubmittingPlayerCode] = useState(false);

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Unirse a un torneo</h2>
        <Link className={buttonStyles.ghost} to="/tournaments">
          Volver
        </Link>
      </div>

      <article className={styles.card}>
        <h3>Codigo del torneo</h3>
        <form
          className={styles.form}
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmittingTournamentCode(true);
            try {
              await sileo.promise(apiClient.joinTournamentByCode({ code: tournamentCode }), {
                loading: { title: 'Enviando solicitud...' },
                success: { title: 'Solicitud enviada. Estado: Pendiente' },
                error: { title: 'No se pudo unirse al torneo' },
              });
              navigate('/tournaments', { replace: true });
            } finally {
              setIsSubmittingTournamentCode(false);
            }
          }}
        >
          <input
            onChange={(event) => setTournamentCode(event.target.value)}
            placeholder="Ingresa codigo del torneo"
            required
            value={tournamentCode}
          />
          <button className={buttonStyles.primary} disabled={isSubmittingTournamentCode} type="submit">
            Enviar solicitud
          </button>
        </form>
      </article>

      <article className={styles.card}>
        <h3>Codigo del jugador</h3>
        <form
          className={styles.form}
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmittingPlayerCode(true);
            try {
              await sileo.promise(apiClient.claimPlayerByCode({ claimCode: playerCode }), {
                loading: { title: 'Reclamando jugador...' },
                success: { title: 'Jugador vinculado con exito' },
                error: { title: 'Codigo invalido o expirado' },
              });
              navigate('/tournaments', { replace: true });
            } finally {
              setIsSubmittingPlayerCode(false);
            }
          }}
        >
          <input
            onChange={(event) => setPlayerCode(event.target.value)}
            placeholder="Ingresa codigo del jugador"
            required
            value={playerCode}
          />
          <button className={buttonStyles.primary} disabled={isSubmittingPlayerCode} type="submit">
            Unirme al torneo
          </button>
        </form>
      </article>
    </section>
  );
}
