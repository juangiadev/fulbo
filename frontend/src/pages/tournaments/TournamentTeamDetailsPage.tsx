import type { PlayerContract, TournamentTeamContract } from '@shared/contracts';
import { TournamentFormat, TournamentType } from '@shared/enums';
import { ArrowLeft, CalendarDays, Shield, ShieldAlert, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { apiClient } from '../../api/client';
import { PlayerAvatar, type PlayerAvatarPlayer } from '../../components/PlayerAvatar';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentTeamDetailsPage.module.css';

const ROSTER_AVATAR_CLASS_NAMES = {
  avatar: styles.playerImage,
  avatarFallback: styles.playerFallback,
  avatarTeam: styles.playerImage,
};

function getTeamInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'E';
}

export function TournamentTeamDetailsPage() {
  const { tournamentId, teamId } = useParams();
  const { currentUser, data } = useAppContext();
  const [teams, setTeams] = useState<TournamentTeamContract[]>([]);
  const [roster, setRoster] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);
  const isLigaTeamTournament =
    tournament?.type === TournamentType.TEAMS && tournament.format === TournamentFormat.LIGA;

  useEffect(() => {
    if (!tournamentId || !teamId || tournament?.type !== TournamentType.TEAMS) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoading(true);
        setHasLoadError(false);
      }
    });

    void Promise.all([
      apiClient.getTournamentTeams(tournamentId),
      isLigaTeamTournament ? apiClient.getTournamentTeamRoster(teamId) : Promise.resolve([]),
    ])
      .then(([nextTeams, nextRoster]) => {
        if (!cancelled) {
          setTeams(nextTeams);
          setRoster(nextRoster);
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
  }, [isLigaTeamTournament, reloadKey, teamId, tournament?.type, tournamentId]);

  const team = teams.find((item) => item.id === teamId);
  const actorRosterPlayer = roster.find((player) => player.userId === currentUser.id) ?? null;
  const canOpenTeam =
    permissions.canManagePlayers ||
    (isLigaTeamTournament && actorRosterPlayer?.tournamentTeamId === teamId);

  if (!tournamentId || !teamId || !tournament || tournament.type !== TournamentType.TEAMS || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'} />;
  }

  if (!isLoading && !canOpenTeam) {
    return <Navigate replace to={`/tournaments/${tournamentId}/teams`} />;
  }

  if (isLoading) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver a equipos
        </Link>
        <div aria-live="polite" className={styles.loadingState} role="status">
          <span aria-hidden="true" className={styles.loadingBadge} />
          <span>Cargando equipo...</span>
        </div>
      </section>
    );
  }

  if (hasLoadError) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver a equipos
        </Link>
        <div className={styles.stateCard}>
          <ShieldAlert aria-hidden="true" size={31} strokeWidth={1.6} />
          <h1>No pudimos cargar el equipo</h1>
          <p>Revisá tu conexión e intentá nuevamente.</p>
          <button onClick={() => setReloadKey((value) => value + 1)} type="button">
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (!team) {
    return <Navigate replace to={`/tournaments/${tournamentId}/teams`} />;
  }

  return (
    <section className={styles.page}>
      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a equipos
      </Link>

      <header className={styles.hero}>
        <div className={styles.teamBadgeWrap}>
          {team.imageUrl ? (
            <img alt="" className={styles.teamImage} src={team.imageUrl} />
          ) : (
            <span className={styles.teamFallback}>{getTeamInitial(team.name)}</span>
          )}
        </div>
        <div>
          <p className={styles.eyebrow}>Detalle del equipo</p>
          <h1>{team.name}</h1>
          <p>{tournament.name}</p>
        </div>
      </header>

      <section aria-labelledby="team-identity-title" className={styles.detailsCard}>
        <div className={styles.cardHeading}>
          <span aria-hidden="true" className={styles.cardIcon}>
            <Shield size={22} />
          </span>
          <div>
            <p className={styles.eyebrow}>Identidad</p>
            <h2 id="team-identity-title">Datos del equipo</h2>
          </div>
        </div>

        <dl className={styles.detailsList}>
          <div>
            <dt>Nombre</dt>
            <dd>{team.name}</dd>
          </div>
          <div>
            <dt>Creado</dt>
            <dd>
              <CalendarDays aria-hidden="true" size={17} />
              {new Date(team.createdAt).toLocaleDateString('es-AR')}
            </dd>
          </div>
        </dl>
      </section>

      {isLigaTeamTournament ? (
        <section aria-labelledby="team-roster-title" className={styles.detailsCard}>
          <div className={styles.cardHeading}>
            <span aria-hidden="true" className={styles.cardIcon}>
              <Users size={22} />
            </span>
            <div>
              <p className={styles.eyebrow}>Plantel de Liga</p>
              <h2 id="team-roster-title">Jugadores de {team.name}</h2>
              <p>Vista de solo lectura del plantel.</p>
            </div>
          </div>

          {roster.length === 0 ? (
            <div className={styles.emptyRoster}>
              <Users aria-hidden="true" size={31} strokeWidth={1.6} />
              <h3>Este equipo todavía no tiene jugadores</h3>
            </div>
          ) : (
            <div className={styles.rosterGrid}>
              {roster.map((player) => {
                const avatarPlayer: PlayerAvatarPlayer = {
                  name: player.name,
                  nickname: player.nickname,
                  imageUrl: player.imageUrl,
                  favoriteTeamSlug: player.favoriteTeamSlug,
                  displayPreference: player.displayPreference,
                };

                return (
                  <article className={styles.playerCard} key={player.id}>
                    <span aria-hidden="true" className={styles.playerAvatarWrap}>
                      <PlayerAvatar classNames={ROSTER_AVATAR_CLASS_NAMES} player={avatarPlayer} />
                    </span>
                    <div>
                      <h3>{player.nickname || player.name}</h3>
                      <p>{player.userId ? 'Cuenta vinculada' : 'Invitado pendiente'}</p>
                      {player.isTeamAdmin ? <span className={styles.playerTag}>Admin del equipo</span> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
