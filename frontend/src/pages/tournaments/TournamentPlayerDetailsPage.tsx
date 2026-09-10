import type { PlayerContract } from '@shared/contracts';
import { DisplayPreference, PlayerRole } from '@shared/enums';
import { FAVORITE_TEAMS } from '@shared/favorite-teams';
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Clock3,
  HeartPulse,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Shirt,
  UserRoundCheck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentPlayerDetailsPage.module.css';

const ROLE_LABELS: Record<PlayerRole, string> = {
  [PlayerRole.OWNER]: 'Organizador',
  [PlayerRole.ADMIN]: 'Administrador',
  [PlayerRole.USER]: 'Jugador',
};

const PLAYER_AVATAR_CLASS_NAMES = {
  avatar: styles.heroAvatar,
  avatarFallback: styles.heroAvatarFallback,
  avatarTeam: styles.heroAvatarTeam,
};

const codeStorageKey = (playerId: string) => `fulbo:last-claim-code:${playerId}`;

export function TournamentPlayerDetailsPage() {
  const { tournamentId, playerId } = useParams();
  const { data } = useAppContext();
  const [players, setPlayers] = useState<PlayerContract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadError, setHasLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [claimCode, setClaimCode] = useState('');
  const [claimCodeExpiresAt, setClaimCodeExpiresAt] = useState<string | null>(null);

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

  const player = players.find((item) => item.id === playerId);
  const favoriteTeam = FAVORITE_TEAMS.find((team) => team.slug === player?.favoriteTeamSlug);
  const favoriteTeamName = favoriteTeam?.name ?? 'Sin equipo favorito';
  const displayPreferenceLabel =
    player?.displayPreference === DisplayPreference.FAVORITE_TEAM ? 'Escudo del equipo' : 'Foto de perfil';
  const hasActiveClaimCode = claimCodeExpiresAt
    ? new Date(claimCodeExpiresAt).getTime() > Date.now()
    : false;

  useEffect(() => {
    if (!playerId || !player) {
      return;
    }

    if (player.userId) {
      window.localStorage.removeItem(codeStorageKey(playerId));
      return;
    }

    if (!tournamentId || !permissions.canManagePlayerCodes) {
      return;
    }

    let cancelled = false;
    const cachedCode = window.localStorage.getItem(codeStorageKey(playerId));

    void apiClient
      .getPlayerClaimCodeMeta(tournamentId, playerId)
      .then((response) => {
        if (cancelled) {
          return;
        }

        const isExpired = response.expiresAt
          ? new Date(response.expiresAt).getTime() <= Date.now()
          : true;
        setClaimCodeExpiresAt(response.expiresAt);

        if (isExpired) {
          setClaimCode('');
          window.localStorage.removeItem(codeStorageKey(playerId));
          return;
        }

        setClaimCode(cachedCode ?? '');
      })
      .catch(() => {
        if (!cancelled) {
          sileo.error({ title: 'No se pudo consultar el código del jugador' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [permissions.canManagePlayerCodes, player, playerId, tournamentId]);

  if (!tournamentId || !playerId || !tournament || tournament.membershipStatus === 'PENDING') {
    return <Navigate replace to="/tournaments" />;
  }

  if (isLoading) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver al plantel
        </Link>
        <div aria-live="polite" className={styles.loadingState} role="status">
          <span aria-hidden="true" className={styles.loadingAvatar} />
          <span>Cargando información del jugador...</span>
        </div>
      </section>
    );
  }

  if (hasLoadError) {
    return (
      <section className={styles.page}>
        <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
          <ArrowLeft aria-hidden="true" size={18} />
          Volver al plantel
        </Link>
        <div className={styles.stateCard}>
          <Users aria-hidden="true" size={31} strokeWidth={1.6} />
          <h1>No pudimos cargar el jugador</h1>
          <p>Revisá tu conexión e intentá nuevamente.</p>
          <button onClick={() => setReloadKey((value) => value + 1)} type="button">
            Reintentar
          </button>
        </div>
      </section>
    );
  }

  if (!player) {
    return <Navigate replace to={`/tournaments/${tournamentId}/players`} />;
  }

  const displayName = player.nickname || player.name;
  const roleClassName =
    player.role === PlayerRole.OWNER
      ? styles.ownerRole
      : player.role === PlayerRole.ADMIN
        ? styles.adminRole
        : styles.playerRole;

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al plantel
      </Link>

      <header className={styles.hero}>
        <span className={styles.heroAvatarWrap}>
          <PlayerAvatar classNames={PLAYER_AVATAR_CLASS_NAMES} player={player} />
        </span>
        <div className={styles.heroIdentity}>
          <div className={styles.heroBadges}>
            <span className={`${styles.roleBadge} ${roleClassName}`}>{ROLE_LABELS[player.role]}</span>
            <span className={player.userId ? styles.linkedBadge : styles.guestBadge}>
              {player.userId ? (
                <CheckCircle2 aria-hidden="true" size={14} />
              ) : (
                <Clock3 aria-hidden="true" size={14} />
              )}
              {player.userId ? 'Cuenta vinculada' : 'Jugador invitado'}
            </span>
          </div>
          <p className={styles.eyebrow}>Ficha del jugador</p>
          <h1>{displayName}</h1>
          {player.nickname ? <p className={styles.fullName}>{player.name}</p> : null}
          <p className={styles.tournamentName}>{tournament.name}</p>
        </div>
      </header>

      <section aria-labelledby="public-profile-title" className={styles.profileSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Perfil público</p>
            <h2 id="public-profile-title">Identidad en la cancha</h2>
          </div>
          <p>Información visible en las pantallas del torneo.</p>
        </div>

        <div className={styles.factsGrid}>
          <article className={styles.factCard}>
            <span aria-hidden="true" className={styles.factIcon}>
              <UserRoundCheck size={22} />
            </span>
            <span>Nombre completo</span>
            <strong>{player.name}</strong>
          </article>
          <article className={styles.factCard}>
            <span aria-hidden="true" className={styles.factIcon}>
              <Shirt size={22} />
            </span>
            <span>Equipo favorito</span>
            <strong>{favoriteTeamName}</strong>
          </article>
          <article className={styles.factCard}>
            <span aria-hidden="true" className={styles.factIcon}>
              <Activity size={22} />
            </span>
            <span>Presentación elegida</span>
            <strong>{displayPreferenceLabel}</strong>
          </article>
        </div>
      </section>

      {permissions.canViewPlayerPrivateDetails ? (
        <section aria-labelledby="private-profile-title" className={styles.privateSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.privateEyebrow}>
                <ShieldCheck aria-hidden="true" size={15} />
                Solo gestión
              </p>
              <h2 id="private-profile-title">Información interna</h2>
            </div>
            <p>Estos datos solo son visibles para administradores y organizadores.</p>
          </div>

          <div className={styles.privateGrid}>
            <article>
              <Activity aria-hidden="true" size={21} />
              <span>Habilidad</span>
              <strong>{player.ability ?? 'Sin definir'}</strong>
            </article>
            <article>
              <HeartPulse aria-hidden="true" size={21} />
              <span>Lesión</span>
              <strong>{player.injury || 'Sin lesión'}</strong>
            </article>
            <article>
              <Clock3 aria-hidden="true" size={21} />
              <span>Faltas</span>
              <strong>{player.misses}</strong>
            </article>
          </div>
        </section>
      ) : null}

      {permissions.canManagePlayerCodes && !player.userId ? (
        <section aria-labelledby="claim-code-title" className={styles.codePanel}>
          <div className={styles.codeHeading}>
            <span aria-hidden="true" className={styles.codeIcon}>
              <KeyRound size={23} />
            </span>
            <div>
              <p className={styles.eyebrow}>Acceso personal</p>
              <h2 id="claim-code-title">Código del jugador</h2>
              <p>Compartilo para que el invitado reclame este perfil.</p>
            </div>
            <span className={hasActiveClaimCode ? styles.activeCodeBadge : styles.expiredCodeBadge}>
              {hasActiveClaimCode ? 'Activo' : claimCodeExpiresAt ? 'Expirado' : 'Sin código'}
            </span>
          </div>

          <div className={styles.codeContent}>
            {claimCode ? (
              <div className={styles.codeReveal}>
                <div>
                  <span>Código personal</span>
                  <strong>{claimCode}</strong>
                </div>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(claimCode);
                    sileo.info({ title: 'Código copiado' });
                  }}
                  type="button"
                >
                  <Clipboard aria-hidden="true" size={18} />
                  Copiar
                </button>
              </div>
            ) : (
              <div className={styles.codePlaceholder}>
                <KeyRound aria-hidden="true" size={21} />
                <span>
                  {hasActiveClaimCode
                    ? 'Hay un código activo. Regeneralo para obtener uno nuevo.'
                    : 'Generá un código para vincular este perfil.'}
                </span>
              </div>
            )}

            <div className={styles.codeActions}>
              <p>
                {claimCodeExpiresAt
                  ? `Vence el ${new Date(claimCodeExpiresAt).toLocaleString('es-AR')}`
                  : 'Los códigos tienen una vigencia de siete días.'}
              </p>
              <button
                className={styles.generateButton}
                disabled={isGeneratingCode}
                onClick={async () => {
                  setIsGeneratingCode(true);
                  try {
                    const result = await sileo.promise(
                      apiClient.regeneratePlayerClaimCode(tournamentId, playerId),
                      {
                        loading: { title: 'Generando código...' },
                        success: { title: 'Código generado' },
                        error: { title: 'No se pudo generar el código' },
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
                <span>{hasActiveClaimCode ? 'Regenerar código' : 'Generar código'}</span>
                {isGeneratingCode ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={19} />
                ) : (
                  <RefreshCw aria-hidden="true" size={18} />
                )}
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </section>
  );
}
