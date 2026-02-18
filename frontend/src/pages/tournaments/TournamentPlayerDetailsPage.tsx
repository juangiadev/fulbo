import { PlayerRole } from '@shared/enums';
import type { PlayerContract } from '@shared/contracts';
import { DisplayPreference } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentPlayerDetailsPage.module.css';

const codeStorageKey = (playerId: string) => `fulbo:last-claim-code:${playerId}`;

export function TournamentPlayerDetailsPage() {
  const { tournamentId, playerId } = useParams();
  const { data, getMyRole } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimCodeExpiresAt, setClaimCodeExpiresAt] = useState<string | null>(null);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const role = tournamentId ? getMyRole(tournamentId) : null;
  const canManageCodes = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(role ?? PlayerRole.USER);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    void apiClient.getPlayers(tournamentId).then(setPlayers);
  }, [tournamentId]);

  const player = useMemo(
    () => players.find((item) => item.id === playerId),
    [playerId, players],
  );

  const favoriteTeamName =
    FAVORITE_TEAMS.find((team) => team.slug === player?.favoriteTeamSlug)?.name ??
    'Sin equipo favorito';
  const displayPreferenceLabel =
    player?.displayPreference === DisplayPreference.FAVORITE_TEAM
      ? 'Equipo favorito'
      : 'Imagen';

  useEffect(() => {
    if (!tournamentId || !playerId || !canManageCodes || !player || player.userId) {
      return;
    }

    const cachedCode = window.localStorage.getItem(codeStorageKey(playerId));
    if (cachedCode) {
      setClaimCode(cachedCode);
    }

    void apiClient
      .getPlayerClaimCodeMeta(tournamentId, playerId)
      .then((response) => setClaimCodeExpiresAt(response.expiresAt));
  }, [canManageCodes, player, playerId, tournamentId]);

  if (!tournamentId || !playerId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  if (!player) {
    return null;
  }

  const codeStatus =
    !claimCodeExpiresAt ? 'Sin codigo activo' : new Date(claimCodeExpiresAt) < new Date() ? 'Expirado' : 'Activo';

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Informacion del jugador</h2>
        <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players`}>
          Volver
        </Link>
      </div>

      <article className={styles.card}>
        <h3>{player.nickname ?? player.name}</h3>
        <p className={styles.meta}>Nombre: {player.name}</p>
        <p className={styles.meta}>Apodo: {player.nickname ?? 'Sin apodo'}</p>
        <p className={styles.meta}>Equipo favorito: {favoriteTeamName}</p>
        <p className={styles.meta}>Preferencia: {displayPreferenceLabel}</p>
        <p className={styles.meta}>Rol: {player.role}</p>
        <p className={styles.meta}>Vinculado: {player.userId ? 'Si' : 'No'}</p>
      </article>

      {canManageCodes && !player.userId ? (
        <article className={styles.card}>
          <h3>Codigo del jugador</h3>
          <p className={styles.meta}>Estado: {codeStatus}</p>
          <p className={styles.meta}>
            Expira: {claimCodeExpiresAt ? new Date(claimCodeExpiresAt).toLocaleString('es-AR') : 'Sin codigo'}
          </p>

          <button
            className={buttonStyles.primary}
            disabled={isGeneratingCode}
            onClick={async () => {
              setIsGeneratingCode(true);
              try {
                const result = await sileo.promise(
                  apiClient.regeneratePlayerClaimCode(tournamentId, playerId),
                  {
                    loading: { title: 'Generando codigo...' },
                    success: { title: 'Codigo generado' },
                    error: { title: 'No se pudo generar el codigo' },
                  },
                );
                setClaimCode(result.claimCode);
                setClaimCodeExpiresAt(result.expiresAt);
                window.localStorage.setItem(codeStorageKey(playerId), result.claimCode);
              } finally {
                setIsGeneratingCode(false);
              }
            }}
            type="button"
          >
            Generar / Regenerar codigo
          </button>

          {claimCode ? (
            <div className={styles.codeRow}>
              <p className={styles.codeLabel}>{claimCode}</p>
              <button
                className={buttonStyles.ghost}
                onClick={async () => {
                  await navigator.clipboard.writeText(claimCode);
                  sileo.info({ title: 'Codigo copiado' });
                }}
                type="button"
              >
                Copiar
              </button>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
