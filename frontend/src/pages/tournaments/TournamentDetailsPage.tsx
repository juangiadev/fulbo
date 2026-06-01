import { TournamentVisibility } from '@shared/enums';
import { DisplayPreference } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import type { PlayerContract, StandingRowContract, TournamentSummaryContract } from '@shared/contracts';
import { CalendarDays, LayoutGrid, Pencil, Table2, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { ContentSpinner } from '../../components/ContentSpinner';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import buttonStyles from '../../styles/Button.module.css';
import styles from './TournamentDetailsPage.module.css';

const visibilityLabel: Record<string, string> = {
  PUBLIC: 'Publico',
  PRIVATE: 'Privado',
};

function Banner({
  title,
  statText,
  player,
  imageUrl,
}: {
  title: string;
  statText: string;
  player: StandingRowContract | undefined;
  imageUrl: string | null | undefined;
}) {
  return (
    <article className={`${styles.banner} ${imageUrl ? styles.bannerWithImage : ''}`}>
      <div className={styles.bannerOverlay}>
        <div className={styles.bannerTopRow}>
          <p className={styles.bannerTitle}>{title}</p>
          {player ? <span className={styles.bannerChip}>Pos #{player.position}</span> : null}
        </div>

        <div className={styles.bannerMain}>
          <h3 className={styles.bannerName}>{player?.displayName ?? 'Sin datos todavia'}</h3>
          <p className={styles.bannerSubtitle}>Jugador destacado del torneo</p>
        </div>

        <div className={styles.bannerStats}>
          <span className={styles.bannerStat}>{player ? statText : 'Sin actividad en el torneo'}</span>
        </div>

        {player ? <span className={styles.bannerWatermark}>#{player.position}</span> : null}
      </div>
      {imageUrl ? (
        <div className={styles.bannerVisual}>
          <img alt={player?.displayName ?? title} src={imageUrl} />
        </div>
      ) : null}
    </article>
  );
}

export function TournamentDetailsPage() {
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const { data, deleteTournament, loadTournaments, updateTournament } = useAppContext();
  const [summary, setSummary] = useState<TournamentSummaryContract | null>(null);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoadingTournament, setIsLoadingTournament] = useState(true);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [isSavingTournament, setIsSavingTournament] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [visibilityDraft, setVisibilityDraft] = useState<TournamentVisibility | null>(null);
  const [leaderBannerImageUrlDraft, setLeaderBannerImageUrlDraft] = useState<string | null>(null);
  const [scorerBannerImageUrlDraft, setScorerBannerImageUrlDraft] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingTournament(true);
    void loadTournaments().finally(() => setIsLoadingTournament(false));
  }, [loadTournaments]);

  useEffect(() => {
    if (!tournamentId) {
      return;
    }

    queueMicrotask(() => setIsLoadingBanners(true));
    void Promise.all([apiClient.getTournamentSummary(tournamentId), apiClient.getPlayers(tournamentId)])
      .then(([nextSummary, nextPlayers]) => {
        setSummary(nextSummary);
        setPlayers(nextPlayers);
      })
      .catch(() => {
        setSummary(null);
        setPlayers([]);
      })
      .finally(() => setIsLoadingBanners(false));
  }, [tournamentId]);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);

  const permissions = useTournamentPermissions(tournamentId);

  const name = nameDraft ?? tournament?.name ?? '';
  const visibility = visibilityDraft ?? tournament?.visibility ?? TournamentVisibility.PRIVATE;
  const leaderBannerImageUrl = leaderBannerImageUrlDraft ?? tournament?.leaderBannerImageUrl ?? '';
  const scorerBannerImageUrl = scorerBannerImageUrlDraft ?? tournament?.scorerBannerImageUrl ?? '';

  const leader = summary?.standings.find((row) => row.playerId === summary.leaderPlayerId);
  const topScorer = summary?.standings.find((row) => row.playerId === summary.topScorerPlayerId);

  const resolvePlayerBannerImage = (playerId: string | null | undefined): string | null => {
    if (!playerId) {
      return null;
    }

    const player = players.find((item) => item.id === playerId);
    if (!player) {
      return null;
    }

    if (player.displayPreference === DisplayPreference.FAVORITE_TEAM) {
      const team = FAVORITE_TEAMS.find((item) => item.slug === player.favoriteTeamSlug);
      if (team?.imageUrl) {
        return team.imageUrl;
      }
    }

    return player.imageUrl ?? null;
  };

  const leaderAutoImage = resolvePlayerBannerImage(summary?.leaderPlayerId);
  const scorerAutoImage = resolvePlayerBannerImage(summary?.topScorerPlayerId);

  if (!tournamentId) {
    return <Navigate replace to="/tournaments" />;
  }

  if (isLoadingTournament) {
    return (
      <section className={styles.section}>
        <div className={styles.headerRow}>
          <h2>Detalle del torneo</h2>
          <Link className={buttonStyles.ghost} to="/tournaments">
            Volver
          </Link>
        </div>
        <ContentSpinner />
      </section>
    );
  }

  if (!tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  if (tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.section}>
      <div className={styles.headerRow}>
        <h2>Detalle del torneo</h2>
        <Link className={buttonStyles.ghost} to="/tournaments">
          Volver
        </Link>
      </div>

      <article className={styles.card}>
        <div className={styles.cardHeader}>
          <h3>{tournament.name}</h3>
          <div className={styles.headerActions}>
            {permissions.canEditTournament ? (
              <button
                aria-label="Editar torneo"
                className={styles.iconButton}
                onClick={() => setIsEditingTournament((value) => !value)}
                type="button"
              >
                <Pencil aria-hidden="true" size={18} />
              </button>
            ) : null}
            {permissions.isOwner ? (
              <button
                aria-label="Eliminar torneo"
                className={`${styles.iconButton} ${styles.dangerIconButton}`}
                disabled={isDeletingTournament}
                onClick={() => setIsDeleteModalOpen(true)}
                type="button"
              >
                <Trash2 aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>
        </div>

        <p className={styles.meta}>Visibilidad: {visibilityLabel[tournament.visibility] ?? tournament.visibility}</p>
        <p className={styles.meta}>Creado: {new Date(tournament.createdAt).toLocaleDateString('es-AR')}</p>

        {permissions.canEditTournament && isEditingTournament ? (
          <form
            className={styles.editForm}
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSavingTournament(true);
              try {
                await sileo.promise(
                  updateTournament(tournament.id, {
                    name: name.trim(),
                    visibility,
                    leaderBannerImageUrl: leaderBannerImageUrl || null,
                    scorerBannerImageUrl: scorerBannerImageUrl || null,
                  }),
                  {
                    loading: { title: 'Actualizando torneo...' },
                    success: { title: 'Torneo actualizado' },
                    error: { title: 'No se pudo actualizar el torneo' },
                  },
                );
                setIsEditingTournament(false);
              } finally {
                setIsSavingTournament(false);
              }
            }}
          >
            <label>
              Nombre
              <input onChange={(event) => setNameDraft(event.target.value)} required value={name} />
            </label>
            <label>
              Visibilidad
              <select
                onChange={(event) => setVisibilityDraft(event.target.value as TournamentVisibility)}
                value={visibility}
              >
                <option value={TournamentVisibility.PRIVATE}>Privado</option>
                <option value={TournamentVisibility.PUBLIC}>Publico</option>
              </select>
            </label>
            <label>
              URL banner Puntero
              <input
                onChange={(event) => setLeaderBannerImageUrlDraft(event.target.value)}
                placeholder="https://..."
                value={leaderBannerImageUrl}
              />
            </label>
            <label>
              URL banner Pichichi
              <input
                onChange={(event) => setScorerBannerImageUrlDraft(event.target.value)}
                placeholder="https://..."
                value={scorerBannerImageUrl}
              />
            </label>
            <div className={styles.editActions}>
              <button
                className={buttonStyles.ghost}
                disabled={isSavingTournament}
                onClick={() => {
                  setNameDraft(null);
                  setVisibilityDraft(null);
                  setLeaderBannerImageUrlDraft(null);
                  setScorerBannerImageUrlDraft(null);
                  setIsEditingTournament(false);
                }}
                type="button"
              >
                Cancelar
              </button>
              <button className={buttonStyles.primary} disabled={isSavingTournament} type="submit">
                Guardar
              </button>
            </div>
          </form>
        ) : null}

        <div className={styles.actions}>
          <Link className={styles.actionButton} to={`/tournaments/${tournament.id}/tabla`}>
            <Table2 aria-hidden="true" size={20} />
            <span>Tabla</span>
          </Link>
          <Link className={styles.actionButton} to={`/tournaments/${tournament.id}/partidos`}>
            <CalendarDays aria-hidden="true" size={20} />
            <span>Partidos</span>
          </Link>
          <Link className={styles.actionButton} to={`/tournaments/${tournament.id}/players`}>
            <Users aria-hidden="true" size={20} />
            <span>Jugadores</span>
          </Link>
          {permissions.canViewTierlist ? (
            <Link className={styles.actionButton} to={`/tournaments/${tournament.id}/tierlist`}>
              <LayoutGrid aria-hidden="true" size={20} />
              <span>Tierlist</span>
            </Link>
          ) : null}
        </div>
      </article>

      <div className={styles.bannerGrid}>
        {isLoadingBanners ? (
          <>
            <article className={`${styles.banner} ${styles.bannerLoading}`}>
              <span aria-hidden="true" className={styles.bannerSpinner} />
            </article>
            <article className={`${styles.banner} ${styles.bannerLoading}`}>
              <span aria-hidden="true" className={styles.bannerSpinner} />
            </article>
          </>
        ) : (
          <>
            <Banner
              imageUrl={tournament.leaderBannerImageUrl || leaderAutoImage}
              player={leader}
              statText={leader ? `Puntos: ${leader.points}` : 'Sin actividad en el torneo'}
              title="Puntero"
            />
            <Banner
              imageUrl={tournament.scorerBannerImageUrl || scorerAutoImage}
              player={topScorer}
              statText={topScorer ? `Goles: ${topScorer.goals}` : 'Sin actividad en el torneo'}
              title="Pichichi"
            />
          </>
        )}
      </div>

      {isDeleteModalOpen ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={isDeletingTournament}
          message="Esta accion elimina el torneo de forma permanente."
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={async () => {
            setIsDeletingTournament(true);
            try {
              await sileo.promise(deleteTournament(tournament.id), {
                loading: { title: 'Eliminando torneo...' },
                success: { title: 'Torneo eliminado' },
                error: { title: 'No se pudo eliminar el torneo' },
              });
              setIsDeleteModalOpen(false);
              navigate('/tournaments', { replace: true });
            } finally {
              setIsDeletingTournament(false);
            }
          }}
          title="Confirmar eliminacion"
        />
      ) : null}
    </section>
  );
}
