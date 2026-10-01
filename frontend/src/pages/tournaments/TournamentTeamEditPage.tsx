import type { TournamentTeamContract } from '@shared/contracts';
import { TournamentType } from '@shared/enums';
import { ArrowLeft, ArrowRight, Eye, Image, LoaderCircle, Shield, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentTeamEditPage.module.css';

const TEAM_NAME_MAX_LENGTH = 120;

function getTeamInitial(name: string): string {
  return name.trim().slice(0, 1).toUpperCase() || 'E';
}

export function TournamentTeamEditPage() {
  const navigate = useNavigate();
  const { tournamentId, teamId } = useParams();
  const { data } = useAppContext();
  const [teams, setTeams] = useState<TournamentTeamContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const permissions = useTournamentPermissions(tournamentId);

  useEffect(() => {
    if (!tournamentId || tournament?.type !== TournamentType.TEAMS) {
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
      .getTournamentTeams(tournamentId)
      .then((nextTeams) => {
        if (!cancelled) {
          setTeams(nextTeams);
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
  }, [reloadKey, tournament?.type, tournamentId]);

  const team = teams.find((item) => item.id === teamId);

  useEffect(() => {
    if (!team) {
      return;
    }

    setName(team.name);
    setImageUrl(team.imageUrl ?? '');
  }, [team]);

  if (
    !tournamentId ||
    !teamId ||
    !tournament ||
    tournament.type !== TournamentType.TEAMS ||
    tournament.membershipStatus === 'PENDING' ||
    !permissions.canManagePlayers
  ) {
    return <Navigate replace to={tournamentId ? `/tournaments/${tournamentId}` : '/tournaments'} />;
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
          <span>Cargando editor del equipo...</span>
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
          <Users aria-hidden="true" size={31} strokeWidth={1.6} />
          <h1>No pudimos cargar el editor</h1>
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

  const trimmedName = name.trim();
  const trimmedImageUrl = imageUrl.trim();
  const previewName = trimmedName || 'Equipo';

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/teams`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a equipos
      </Link>

      <header className={styles.hero}>
        <p className={styles.eyebrow}>Edición de equipo</p>
        <h1>
          Definí cómo se ve
          <span>{team.name}.</span>
        </h1>
        <p>{tournament.name}</p>
      </header>

      <form
        className={styles.formLayout}
        onSubmit={async (event) => {
          event.preventDefault();

          if (!trimmedName) {
            return;
          }

          setIsSubmitting(true);
          try {
            await sileo.promise(
              apiClient.updateTournamentTeam(team.id, {
                name: trimmedName,
                imageUrl: trimmedImageUrl || null,
              }),
              {
                loading: { title: 'Guardando equipo...' },
                success: { title: 'Equipo actualizado' },
                error: { title: 'No se pudo actualizar el equipo' },
              },
            );

            navigate(`/tournaments/${tournamentId}/teams`, { replace: true });
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        <div className={styles.formSections}>
          <section aria-labelledby="team-identity-title" className={styles.formCard}>
            <div className={styles.cardHeading}>
              <span aria-hidden="true" className={styles.cardIcon}>
                <Shield size={22} />
              </span>
              <div>
                <p className={styles.eyebrow}>Datos públicos</p>
                <h2 id="team-identity-title">Identidad del equipo</h2>
                <p>Estos datos aparecen en partidos, tablas y tarjetas del torneo.</p>
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <label>
                Nombre
                <input
                  disabled={isSubmitting}
                  maxLength={TEAM_NAME_MAX_LENGTH}
                  onChange={(event) => setName(event.target.value)}
                  required
                  value={name}
                />
              </label>
            </div>
          </section>

          <section aria-labelledby="team-image-title" className={styles.formCard}>
            <div className={styles.cardHeading}>
              <span aria-hidden="true" className={styles.cardIcon}>
                <Image size={22} />
              </span>
              <div>
                <p className={styles.eyebrow}>Presentación visual</p>
                <h2 id="team-image-title">Escudo o imagen</h2>
                <p>Usá una URL para identificar al equipo. Si no carga, mostramos la inicial.</p>
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <label className={styles.fullField}>
                URL de imagen
                <input
                  aria-describedby="team-image-help"
                  disabled={isSubmitting}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  type="url"
                  value={imageUrl}
                />
                <span className={styles.fieldHint} id="team-image-help">
                  Campo opcional. Pegá un enlace público al escudo o foto del equipo.
                </span>
              </label>
            </div>
          </section>
        </div>

        <aside className={styles.previewColumn}>
          <div className={styles.previewCard}>
            <div className={styles.previewTopline}>
              <span>Vista previa</span>
              <Eye aria-hidden="true" size={17} />
            </div>
            <div className={styles.previewBody}>
              <span className={styles.previewBadgeWrap}>
                {trimmedImageUrl ? (
                  <img alt="" className={styles.previewImage} src={trimmedImageUrl} />
                ) : (
                  <span className={styles.previewFallback}>{getTeamInitial(previewName)}</span>
                )}
              </span>
              <p>Equipo de Liga</p>
              <h2>{previewName}</h2>
              <small>{trimmedImageUrl ? 'Imagen personalizada' : 'Inicial automática'}</small>
            </div>
          </div>

          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              disabled={isSubmitting}
              onClick={() => navigate(`/tournaments/${tournamentId}/teams`)}
              type="button"
            >
              Cancelar
            </button>
            <button className={styles.saveButton} disabled={isSubmitting || !trimmedName} type="submit">
              <span>{isSubmitting ? 'Guardando...' : 'Guardar cambios'}</span>
              {isSubmitting ? (
                <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
              ) : (
                <ArrowRight aria-hidden="true" size={20} />
              )}
            </button>
          </div>
        </aside>
      </form>
    </section>
  );
}
