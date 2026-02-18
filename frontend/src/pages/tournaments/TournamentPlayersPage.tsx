import { PlayerRole } from '@shared/enums';
import type { PlayerContract } from '@shared/contracts';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ContentSpinner } from '../../components/ContentSpinner';
import { apiClient } from '../../api/client';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentPlayersPage.module.css';

export function TournamentPlayersPage() {
  const { tournamentId } = useParams();
  const { currentUser, data, getMyRole } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [search, setSearch] = useState('');
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [confirmingPlayerId, setConfirmingPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const role = tournamentId ? getMyRole(tournamentId) : null;
  const canEdit = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(role ?? PlayerRole.USER);
  const canDelete = role === PlayerRole.OWNER;
  const canManageInvites = [PlayerRole.OWNER, PlayerRole.ADMIN].includes(role ?? PlayerRole.USER);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }
    setIsLoading(true);
    void apiClient
      .getPlayers(tournamentId)
      .then(setPlayers)
      .finally(() => setIsLoading(false));
  }, [tournamentId]);

  const filteredPlayers = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) {
      return players;
    }
    return players.filter((player) =>
      `${player.name} ${player.nickname ?? ''}`.toLowerCase().includes(query),
    );
  }, [players, search]);

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Jugadores</h2>
        <div className={styles.headerActions}>
          {canManageInvites ? (
            <>
              <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/invite-guest`}>
                Agregar invitado
              </Link>
              <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/join-requests`}>
                Solicitudes
              </Link>
            </>
          ) : null}
          <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}`}>
            Volver
          </Link>
        </div>
      </div>

      <input
        className={styles.searchInput}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nombre"
        value={search}
      />

      <div className={styles.playersList}>
        {isLoading ? <ContentSpinner /> : filteredPlayers.map((player) => (
          <article className={styles.playerCard} key={player.id}>
            <div>
              <h3>{player.nickname ?? player.name}</h3>
              <p className={styles.meta}>Rol: {player.role}</p>
              <p className={styles.meta}>Vinculado: {player.userId ? 'Si' : 'No'}</p>
              {!player.userId ? <p className={styles.guestBadge}>Invitado</p> : null}
            </div>

            <div className={styles.actions}>
              <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players/${player.id}`}>
                Info
              </Link>

              {canEdit ? (
                <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players/${player.id}/edit`}>
                  Editar
                </Link>
              ) : player.userId === currentUser.id ? (
                <Link className={buttonStyles.ghost} to={`/tournaments/${tournamentId}/players/${player.id}/edit`}>
                  Editar
                </Link>
              ) : null}

              {canDelete ? (
                <button
                  className={buttonStyles.ghost}
                  disabled={deletingPlayerId === player.id}
                  onClick={() => setConfirmingPlayerId(player.id)}
                  type="button"
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {confirmingPlayerId ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={deletingPlayerId === confirmingPlayerId}
          message="Esta accion elimina el jugador del torneo."
          onCancel={() => setConfirmingPlayerId(null)}
          onConfirm={async () => {
            setDeletingPlayerId(confirmingPlayerId);
            try {
              await sileo.promise(apiClient.removePlayer(tournamentId, confirmingPlayerId), {
                loading: { title: 'Eliminando jugador...' },
                success: { title: 'Jugador eliminado' },
                error: { title: 'No se pudo eliminar el jugador' },
              });
              const fresh = await apiClient.getPlayers(tournamentId);
              setPlayers(fresh);
              setConfirmingPlayerId(null);
            } finally {
              setDeletingPlayerId(null);
            }
          }}
          title="Confirmar eliminacion"
        />
      ) : null}
    </section>
  );
}
