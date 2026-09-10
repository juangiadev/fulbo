import type { PlayerContract } from '@shared/contracts';
import { PlayerRole } from '@shared/enums';
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRoundPlus,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { canEditTournamentPlayer } from '../../permissions/tournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentPlayersPage.module.css';

const ROLE_LABELS: Record<PlayerRole, string> = {
  [PlayerRole.OWNER]: 'Organizador',
  [PlayerRole.ADMIN]: 'Administrador',
  [PlayerRole.USER]: 'Jugador',
};

const PLAYER_AVATAR_CLASS_NAMES = {
  avatar: styles.avatarImage,
  avatarFallback: styles.avatarFallback,
  avatarTeam: styles.avatarTeam,
};

export function TournamentPlayersPage() {
  const { tournamentId } = useParams();
  const { currentUser, data } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [search, setSearch] = useState('');
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [confirmingPlayerId, setConfirmingPlayerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoading(true);
        setHasLoadError(false);
      }
    });

    void apiClient
      .getPlayers(tournamentId)
      .then((nextPlayers) => {
        if (!cancelled) {
          setPlayers(nextPlayers);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHasLoadError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [reloadKey, tournamentId]);

  const query = search.toLowerCase().trim();
  const filteredPlayers = query
    ? players.filter((player) =>
        `${player.name} ${player.nickname ?? ''}`.toLowerCase().includes(query),
      )
    : players;
  const linkedPlayersCount = players.filter((player) => Boolean(player.userId)).length;
  const guestPlayersCount = players.length - linkedPlayersCount;

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al torneo
      </Link>

      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Plantel del torneo</p>
          <h1>
            El vestuario de
            <span>{tournament.name}</span>
          </h1>
          <p>Conocé a los jugadores que forman parte de esta competencia.</p>
        </div>

        <dl className={styles.rosterStats}>
          <div>
            <dt>Total</dt>
            <dd>{isLoading ? '–' : players.length.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Vinculados</dt>
            <dd>{isLoading ? '–' : linkedPlayersCount.toString().padStart(2, '0')}</dd>
          </div>
          <div>
            <dt>Invitados</dt>
            <dd>{isLoading ? '–' : guestPlayersCount.toString().padStart(2, '0')}</dd>
          </div>
        </dl>
      </header>

      {permissions.canManageInvites ? (
        <section aria-label="Administrar plantel" className={styles.managementPanel}>
          <div>
            <p className={styles.eyebrow}>Gestión del plantel</p>
            <h2>Sumá jugadores a la competencia</h2>
          </div>
          <div className={styles.managementLinks}>
            <Link className={styles.primaryAction} to={`/tournaments/${tournamentId}/invite-guest`}>
              <span>
                <UserRoundPlus aria-hidden="true" size={19} />
                Agregar invitado
              </span>
              <Plus aria-hidden="true" size={19} />
            </Link>
            <Link className={styles.secondaryAction} to={`/tournaments/${tournamentId}/join-requests`}>
              <Clock3 aria-hidden="true" size={19} />
              Ver solicitudes
            </Link>
          </div>
        </section>
      ) : null}

      <section aria-labelledby="players-list-title" className={styles.rosterSection}>
        <div className={styles.rosterToolbar}>
          <div>
            <p className={styles.eyebrow}>Equipo completo</p>
            <h2 id="players-list-title">Lista de jugadores</h2>
          </div>
          <label className={styles.searchField}>
            <Search aria-hidden="true" size={19} />
            <span className={styles.srOnly}>Buscar jugadores</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre o apodo"
              type="search"
              value={search}
            />
          </label>
        </div>

        {isLoading ? (
          <div aria-busy="true" className={styles.playersGrid}>
            {[0, 1, 2].map((item) => (
              <article className={`${styles.playerCard} ${styles.loadingCard}`} key={item}>
                <span aria-hidden="true" className={styles.loadingAvatar} />
                <span aria-hidden="true" className={styles.loadingLine} />
              </article>
            ))}
            <span className={styles.srOnly} role="status">
              Cargando jugadores...
            </span>
          </div>
        ) : hasLoadError ? (
          <div className={styles.stateCard}>
            <Users aria-hidden="true" size={30} strokeWidth={1.6} />
            <h3>No pudimos cargar el plantel</h3>
            <p>Revisá tu conexión e intentá nuevamente.</p>
            <button onClick={() => setReloadKey((value) => value + 1)} type="button">
              Reintentar
            </button>
          </div>
        ) : players.length === 0 ? (
          <div className={styles.stateCard}>
            <Users aria-hidden="true" size={30} strokeWidth={1.6} />
            <h3>El vestuario todavía está vacío</h3>
            <p>Los jugadores aparecerán acá cuando se sumen al torneo.</p>
          </div>
        ) : filteredPlayers.length === 0 ? (
          <div className={styles.stateCard}>
            <Search aria-hidden="true" size={30} strokeWidth={1.6} />
            <h3>No encontramos jugadores</h3>
            <p>Probá con otro nombre o apodo.</p>
            <button onClick={() => setSearch('')} type="button">
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className={styles.playersGrid}>
            {filteredPlayers.map((player) => {
              const displayName = player.nickname || player.name;
              const showFullName = Boolean(player.nickname && player.nickname !== player.name);
              const roleClassName =
                player.role === PlayerRole.OWNER
                  ? styles.ownerRole
                  : player.role === PlayerRole.ADMIN
                    ? styles.adminRole
                    : styles.playerRole;
              const canManageThisPlayer =
                permissions.canManagePlayers &&
                canEditTournamentPlayer({
                  actorRole: permissions.role,
                  actorUserId: currentUser.id,
                  targetRole: player.role,
                  targetUserId: player.userId,
                });

              return (
                <article className={styles.playerCard} key={player.id}>
                  <div className={styles.playerIdentity}>
                    <span className={styles.avatarWrap}>
                      <PlayerAvatar classNames={PLAYER_AVATAR_CLASS_NAMES} player={player} />
                    </span>
                    <div>
                      <span className={`${styles.roleBadge} ${roleClassName}`}>
                        {ROLE_LABELS[player.role]}
                      </span>
                      <h3>{displayName}</h3>
                      {showFullName ? <p>{player.name}</p> : null}
                    </div>
                  </div>

                  <div className={styles.accountStatus}>
                    {player.userId ? (
                      <>
                        <CheckCircle2 aria-hidden="true" size={16} />
                        Cuenta vinculada
                      </>
                    ) : (
                      <>
                        <Clock3 aria-hidden="true" size={16} />
                        Invitado pendiente
                      </>
                    )}
                  </div>

                  <div className={styles.cardActions}>
                    <Link
                      className={styles.infoAction}
                      to={`/tournaments/${tournamentId}/players/${player.id}`}
                    >
                      <span>Ver perfil</span>
                      <ArrowUpRight aria-hidden="true" size={18} />
                    </Link>

                    {canManageThisPlayer ? (
                      <Link
                        aria-label={`Editar a ${displayName}`}
                        className={styles.iconAction}
                        to={`/tournaments/${tournamentId}/players/${player.id}/edit`}
                      >
                        <Pencil aria-hidden="true" size={17} />
                      </Link>
                    ) : null}

                    {permissions.canDeletePlayers ? (
                      <button
                        aria-label={`Eliminar a ${displayName}`}
                        className={`${styles.iconAction} ${styles.deleteAction}`}
                        disabled={deletingPlayerId === player.id}
                        onClick={() => setConfirmingPlayerId(player.id)}
                        type="button"
                      >
                        <Trash2 aria-hidden="true" size={17} />
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {confirmingPlayerId ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={deletingPlayerId === confirmingPlayerId}
          message="Esta acción elimina el jugador del torneo."
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
          title="Confirmar eliminación"
        />
      ) : null}
    </section>
  );
}
