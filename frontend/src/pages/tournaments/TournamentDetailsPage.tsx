import type { PlayerContract, StandingRowContract, TournamentSummaryContract } from '@shared/contracts';
import { DisplayPreference } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  LayoutGrid,
  LoaderCircle,
  Pencil,
  Table2,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { ConfirmModal } from '../../components/ConfirmModal';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentDetailsPage.module.css';

const TOURNAMENT_NAME_MAX_LENGTH = 150;

interface BannerProps {
  title: string;
  statText: string;
  player: StandingRowContract | undefined;
  imageUrl: string | null | undefined;
}

function Banner({ title, statText, player, imageUrl }: BannerProps) {
  const playerInitial = player?.displayName.slice(0, 1).toUpperCase() ?? '–';

  return (
    <article className={styles.banner}>
      <div className={styles.bannerCopy}>
        <div className={styles.bannerTopRow}>
          <p className={styles.bannerTitle}>{title}</p>
          {player ? <span className={styles.bannerChip}>#{player.position}</span> : null}
        </div>

        <div className={styles.bannerMain}>
          <p className={styles.bannerKicker}>Figura del torneo</p>
          <h3 className={styles.bannerName}>{player?.displayName ?? 'Todavía sin datos'}</h3>
          <p className={styles.bannerSubtitle}>
            {player ? 'Rendimiento destacado en la competencia' : 'Completá partidos para descubrir las figuras'}
          </p>
        </div>

        <span className={styles.bannerStat}>{player ? statText : 'Sin actividad registrada'}</span>
      </div>

      <div className={styles.bannerVisual}>
        {imageUrl ? (
          <img alt="" src={imageUrl} />
        ) : (
          <>
            <span aria-hidden="true" className={styles.visualPitch} />
            <span aria-hidden="true" className={styles.playerInitial}>
              {playerInitial}
            </span>
          </>
        )}
      </div>
    </article>
  );
}

export function TournamentDetailsPage() {
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const { data, deleteTournament, updateTournament } = useAppContext();
  const [summary, setSummary] = useState<TournamentSummaryContract | null>(null);
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoadingBanners, setIsLoadingBanners] = useState(true);
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [isSavingTournament, setIsSavingTournament] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingTournament, setIsDeletingTournament] = useState(false);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [leaderBannerImageUrlDraft, setLeaderBannerImageUrlDraft] = useState<string | null>(null);
  const [scorerBannerImageUrlDraft, setScorerBannerImageUrlDraft] = useState<string | null>(null);

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
  const trimmedName = name.trim();
  const leaderBannerImageUrl = leaderBannerImageUrlDraft ?? tournament?.leaderBannerImageUrl ?? '';
  const scorerBannerImageUrl = scorerBannerImageUrlDraft ?? tournament?.scorerBannerImageUrl ?? '';
  const leader = summary?.standings.find((row) => row.playerId === summary.leaderPlayerId);
  const topScorer = summary?.standings.find((row) => row.playerId === summary.topScorerPlayerId);
  const roleLabel = permissions.isOwner ? 'Organizador' : permissions.isAdmin ? 'Administrador' : 'Jugador';

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

  const closeEditor = () => {
    setNameDraft(null);
    setLeaderBannerImageUrlDraft(null);
    setScorerBannerImageUrlDraft(null);
    setIsEditingTournament(false);
  };

  const leaderAutoImage = resolvePlayerBannerImage(summary?.leaderPlayerId);
  const scorerAutoImage = resolvePlayerBannerImage(summary?.topScorerPlayerId);

  if (!tournamentId) {
    return <Navigate replace to="/tournaments" />;
  }

  if (!tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <button className={styles.backButton} onClick={() => navigate('/tournaments')} type="button">
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a torneos
      </button>

      <header className={`${styles.hero} ${tournament.imageUrl ? styles.heroWithImage : ''}`}>
        {tournament.imageUrl ? <img alt="" className={styles.heroImage} src={tournament.imageUrl} /> : null}
        <div className={styles.heroContent}>
          <div className={styles.heroTopline}>
            <p className={styles.eyebrow}>Centro del torneo</p>
            <div className={styles.managementActions}>
              {permissions.canEditTournament ? (
                <button
                  aria-controls="tournament-editor"
                  aria-expanded={isEditingTournament}
                  className={styles.managementButton}
                  onClick={() => {
                    if (isEditingTournament) {
                      closeEditor();
                      return;
                    }
                    setIsEditingTournament(true);
                  }}
                  type="button"
                >
                  <Pencil aria-hidden="true" size={17} />
                  <span>{isEditingTournament ? 'Cerrar edición' : 'Editar'}</span>
                </button>
              ) : null}
              {permissions.isOwner ? (
                <button
                  className={`${styles.managementButton} ${styles.dangerButton}`}
                  disabled={isDeletingTournament}
                  onClick={() => setIsDeleteModalOpen(true)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" size={17} />
                  <span>Eliminar</span>
                </button>
              ) : null}
            </div>
          </div>

          <div className={styles.heroMain}>
            <div>
              <div className={styles.heroMeta}>
                <span>{roleLabel}</span>
                <span>
                  <CalendarDays aria-hidden="true" size={15} />
                  Creado el{' '}
                  <time dateTime={tournament.createdAt}>
                    {new Date(tournament.createdAt).toLocaleDateString('es-AR')}
                  </time>
                </span>
              </div>
              <h1>{tournament.name}</h1>
              <p>Todo lo que pasa en tu competencia, en un solo lugar.</p>
            </div>

            <div className={styles.heroStamp}>
              <Trophy aria-hidden="true" size={27} strokeWidth={1.6} />
              <span>{tournament.finishedAt ? 'Competencia finalizada' : 'Competencia en juego'}</span>
            </div>
          </div>
        </div>
      </header>

      {permissions.canEditTournament && isEditingTournament ? (
        <section aria-labelledby="editor-title" className={styles.editPanel} id="tournament-editor">
          <div className={styles.editHeading}>
            <div>
              <p className={styles.eyebrow}>Configuración</p>
              <h2 id="editor-title">Editar presentación</h2>
            </div>
            <span>Los banners personalizados reemplazan la imagen del jugador.</span>
          </div>

          <form
            className={styles.editForm}
            onSubmit={async (event) => {
              event.preventDefault();

              if (!trimmedName) {
                return;
              }

              setIsSavingTournament(true);
              try {
                await sileo.promise(
                  updateTournament(tournament.id, {
                    name: trimmedName,
                    leaderBannerImageUrl: leaderBannerImageUrl || null,
                    scorerBannerImageUrl: scorerBannerImageUrl || null,
                  }),
                  {
                    loading: { title: 'Actualizando torneo...' },
                    success: { title: 'Torneo actualizado' },
                    error: { title: 'No se pudo actualizar el torneo' },
                  },
                );
                closeEditor();
              } finally {
                setIsSavingTournament(false);
              }
            }}
          >
            <label className={styles.nameField}>
              Nombre del torneo
              <input
                disabled={isSavingTournament}
                maxLength={TOURNAMENT_NAME_MAX_LENGTH}
                onChange={(event) => setNameDraft(event.target.value)}
                required
                value={name}
              />
            </label>
            <label>
              Banner del puntero
              <input
                disabled={isSavingTournament}
                onChange={(event) => setLeaderBannerImageUrlDraft(event.target.value)}
                placeholder="https://..."
                type="url"
                value={leaderBannerImageUrl}
              />
            </label>
            <label>
              Banner del pichichi
              <input
                disabled={isSavingTournament}
                onChange={(event) => setScorerBannerImageUrlDraft(event.target.value)}
                placeholder="https://..."
                type="url"
                value={scorerBannerImageUrl}
              />
            </label>
            <div className={styles.editActions}>
              <button
                className={styles.cancelButton}
                disabled={isSavingTournament}
                onClick={closeEditor}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={styles.saveButton}
                disabled={isSavingTournament || !trimmedName}
                type="submit"
              >
                <span>{isSavingTournament ? 'Guardando...' : 'Guardar cambios'}</span>
                {isSavingTournament ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={19} />
                ) : (
                  <ArrowUpRight aria-hidden="true" size={19} />
                )}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <nav aria-label="Secciones del torneo" className={styles.quickNav}>
        <Link className={styles.navCard} to={`/tournaments/${tournament.id}/tabla`}>
          <span aria-hidden="true" className={styles.navIcon}>
            <Table2 size={23} />
          </span>
          <span className={styles.navCopy}>
            <strong>Tabla</strong>
            <small>Posiciones y rendimiento</small>
          </span>
          <ArrowUpRight aria-hidden="true" className={styles.navArrow} size={19} />
        </Link>
        <Link className={styles.navCard} to={`/tournaments/${tournament.id}/partidos`}>
          <span aria-hidden="true" className={styles.navIcon}>
            <CalendarDays size={23} />
          </span>
          <span className={styles.navCopy}>
            <strong>Partidos</strong>
            <small>Fechas, equipos y resultados</small>
          </span>
          <ArrowUpRight aria-hidden="true" className={styles.navArrow} size={19} />
        </Link>
        <Link className={styles.navCard} to={`/tournaments/${tournament.id}/players`}>
          <span aria-hidden="true" className={styles.navIcon}>
            <Users size={23} />
          </span>
          <span className={styles.navCopy}>
            <strong>Jugadores</strong>
            <small>Plantel y perfiles</small>
          </span>
          <ArrowUpRight aria-hidden="true" className={styles.navArrow} size={19} />
        </Link>
        {permissions.canViewTierlist ? (
          <Link className={styles.navCard} to={`/tournaments/${tournament.id}/tierlist`}>
            <span aria-hidden="true" className={styles.navIcon}>
              <LayoutGrid size={23} />
            </span>
            <span className={styles.navCopy}>
              <strong>Tierlist</strong>
              <small>Ranking del torneo</small>
            </span>
            <ArrowUpRight aria-hidden="true" className={styles.navArrow} size={19} />
          </Link>
        ) : null}
      </nav>

      <section aria-labelledby="highlights-title" className={styles.highlightsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Figuras</p>
            <h2 id="highlights-title">Los que marcan la diferencia</h2>
          </div>
          <p>El presente de la tabla y el gol.</p>
        </div>

        <div aria-busy={isLoadingBanners} className={styles.bannerGrid}>
          {isLoadingBanners ? (
            <>
              <article className={`${styles.banner} ${styles.bannerLoading}`}>
                <span aria-hidden="true" className={styles.bannerSpinner} />
              </article>
              <article className={`${styles.banner} ${styles.bannerLoading}`}>
                <span aria-hidden="true" className={styles.bannerSpinner} />
              </article>
              <span className={styles.srOnly} role="status">
                Cargando figuras del torneo...
              </span>
            </>
          ) : (
            <>
              <Banner
                imageUrl={tournament.leaderBannerImageUrl || leaderAutoImage}
                player={leader}
                statText={leader ? `${leader.points} puntos` : 'Sin actividad registrada'}
                title="Puntero"
              />
              <Banner
                imageUrl={tournament.scorerBannerImageUrl || scorerAutoImage}
                player={topScorer}
                statText={topScorer ? `${topScorer.goals} goles` : 'Sin actividad registrada'}
                title="Pichichi"
              />
            </>
          )}
        </div>
      </section>

      {isDeleteModalOpen ? (
        <ConfirmModal
          confirmText="Eliminar"
          isConfirming={isDeletingTournament}
          message="Esta acción elimina el torneo de forma permanente."
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
          title="Confirmar eliminación"
        />
      ) : null}
    </section>
  );
}
