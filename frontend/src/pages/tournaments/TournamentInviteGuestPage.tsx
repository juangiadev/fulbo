import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentInviteGuestPage.module.css';

export function TournamentInviteGuestPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const [guestName, setGuestName] = useState('');
  const [guestCode, setGuestCode] = useState('');
  const [tournamentCode, setTournamentCode] = useState('');
  const [tournamentCodeExpiresAt, setTournamentCodeExpiresAt] = useState<string | null>(null);
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [isGeneratingTournamentCode, setIsGeneratingTournamentCode] = useState(false);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    void apiClient
      .getTournamentInviteMeta(tournamentId)
      .then((response) => setTournamentCodeExpiresAt(response.expiresAt));
  }, [tournamentId]);

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Agregar invitado</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players`}>
          Volver
        </Link>
      </div>

      <article className={styles.card}>
        <h3>Codigo del torneo</h3>
        <button
          className={buttonStyles.primary}
          disabled={isGeneratingTournamentCode}
          onClick={async () => {
            setIsGeneratingTournamentCode(true);
            try {
              const response = await sileo.promise(
                apiClient.regenerateTournamentInviteCode(tournamentId),
                {
                  loading: { title: 'Generando codigo del torneo...' },
                  success: { title: 'Codigo generado' },
                  error: { title: 'No se pudo generar codigo' },
                },
              );
              setTournamentCode(response.code);
              setTournamentCodeExpiresAt(response.expiresAt);
            } finally {
              setIsGeneratingTournamentCode(false);
            }
          }}
          type="button"
        >
          Generar / Regenerar codigo
        </button>

        {tournamentCode ? (
          <div className={styles.codeRow}>
            <p className={styles.codeLabel}>Codigo: {tournamentCode}</p>
            <button
              className={buttonStyles.ghost}
              onClick={async () => {
                await navigator.clipboard.writeText(tournamentCode);
                sileo.info({ title: 'Codigo copiado' });
              }}
              type="button"
            >
              Copiar
            </button>
          </div>
        ) : null}

        <p className={styles.meta}>
          Expira: {tournamentCodeExpiresAt ? new Date(tournamentCodeExpiresAt).toLocaleString('es-AR') : 'Sin codigo activo'}
        </p>
      </article>

      <article className={styles.card}>
        <h3>Invitado (codigo de jugador)</h3>
        <form
          className={styles.form}
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmittingGuest(true);
            try {
              const response = await sileo.promise(
                apiClient.createGuestPlayer(tournamentId, { name: guestName.trim() }),
                {
                  loading: { title: 'Creando invitado...' },
                  success: { title: 'Invitado creado' },
                  error: { title: 'No se pudo crear invitado' },
                },
              );
              setGuestCode(response.claimCode);
              setGuestName('');
            } finally {
              setIsSubmittingGuest(false);
            }
          }}
        >
          <input
            onChange={(event) => setGuestName(event.target.value)}
            placeholder="Nombre del invitado"
            required
            value={guestName}
          />
          <button className={buttonStyles.primary} disabled={isSubmittingGuest} type="submit">
            Crear invitado
          </button>
        </form>

        {guestCode ? (
          <div className={styles.codeRow}>
            <p className={styles.codeLabel}>Codigo jugador: {guestCode}</p>
            <button
              className={buttonStyles.ghost}
              onClick={async () => {
                await navigator.clipboard.writeText(guestCode);
                sileo.info({ title: 'Codigo copiado' });
              }}
              type="button"
            >
              Copiar
            </button>
          </div>
        ) : null}
      </article>
    </section>
  );
}
