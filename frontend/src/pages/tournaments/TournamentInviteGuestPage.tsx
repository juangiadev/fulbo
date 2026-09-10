import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Clock3,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Ticket,
  UserRoundPlus,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { apiClient } from '../../api/client';
import { useTournamentPermissions } from '../../hooks/useTournamentPermissions';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentInviteGuestPage.module.css';

const GUEST_NAME_MAX_LENGTH = 120;

export function TournamentInviteGuestPage() {
  const { tournamentId } = useParams();
  const { data } = useAppContext();
  const permissions = useTournamentPermissions(tournamentId);
  const [guestName, setGuestName] = useState('');
  const [guestCode, setGuestCode] = useState('');
  const [tournamentCode, setTournamentCode] = useState('');
  const [tournamentCodeExpiresAt, setTournamentCodeExpiresAt] = useState<string | null>(null);
  const [isLoadingInviteMeta, setIsLoadingInviteMeta] = useState(true);
  const [isSubmittingGuest, setIsSubmittingGuest] = useState(false);
  const [isGeneratingTournamentCode, setIsGeneratingTournamentCode] = useState(false);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);
  const trimmedGuestName = guestName.trim();
  const isBusy = isSubmittingGuest || isGeneratingTournamentCode;
  const hasActiveTournamentCode = tournamentCodeExpiresAt
    ? new Date(tournamentCodeExpiresAt).getTime() > Date.now()
    : false;

  useEffect(() => {
    if (!tournamentId || !permissions.canManageInvites) {
      return;
    }

    let cancelled = false;
    void apiClient
      .getTournamentInviteMeta(tournamentId)
      .then((response) => {
        if (!cancelled) {
          setTournamentCodeExpiresAt(response.expiresAt);
        }
      })
      .catch(() => {
        if (!cancelled) {
          sileo.error({ title: 'No se pudo cargar el estado de la invitación' });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingInviteMeta(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [permissions.canManageInvites, tournamentId]);

  if (!tournamentId || !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  if (!permissions.canManageInvites) {
    return <Navigate replace to={`/tournaments/${tournamentId}/players`} />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <Link className={styles.backLink} to={`/tournaments/${tournamentId}/players`}>
        <ArrowLeft aria-hidden="true" size={18} />
        Volver al plantel
      </Link>

      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Gestión del plantel</p>
          <h1>
            Abrí las puertas de
            <span>{tournament.name}.</span>
          </h1>
          <p>Elegí cómo querés sumar a la próxima persona al torneo.</p>
        </div>

        <div className={styles.heroBadge}>
          <UserRoundPlus aria-hidden="true" size={27} strokeWidth={1.6} />
          <span>Dos formas de invitar</span>
        </div>
      </header>

      <div className={styles.toolsGrid}>
        <article className={styles.toolCard}>
          <div className={styles.cardTopline}>
            <span>Invitación general</span>
            <span aria-hidden="true">01</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.toolHeading}>
              <span aria-hidden="true" className={styles.toolIcon}>
                <Ticket size={23} strokeWidth={1.8} />
              </span>
              <div>
                <p className={styles.eyebrow}>Código del torneo</p>
                <h2>Compartí una invitación</h2>
              </div>
            </div>
            <p className={styles.description}>
              Quien use este código enviará una solicitud que después vas a poder revisar y vincular.
            </p>

            <div className={styles.statusBox}>
              <div>
                {isLoadingInviteMeta ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={19} />
                ) : hasActiveTournamentCode ? (
                  <CheckCircle2 aria-hidden="true" size={19} />
                ) : (
                  <Clock3 aria-hidden="true" size={19} />
                )}
                <span>
                  {isLoadingInviteMeta
                    ? 'Consultando invitación...'
                    : hasActiveTournamentCode
                      ? 'Hay una invitación activa'
                      : tournamentCodeExpiresAt
                        ? 'La invitación anterior venció'
                      : 'Todavía no hay una invitación activa'}
                </span>
              </div>
              <small>
                {tournamentCodeExpiresAt
                  ? `Vence el ${new Date(tournamentCodeExpiresAt).toLocaleString('es-AR')}`
                  : 'Generá un código para empezar a recibir solicitudes.'}
              </small>
            </div>

            {tournamentCode ? (
              <div className={styles.codeReveal}>
                <div>
                  <span>Nuevo código</span>
                  <strong>{tournamentCode}</strong>
                </div>
                <button
                  aria-label="Copiar código del torneo"
                  onClick={async () => {
                    await navigator.clipboard.writeText(tournamentCode);
                    sileo.info({ title: 'Código copiado' });
                  }}
                  type="button"
                >
                  <Clipboard aria-hidden="true" size={18} />
                  Copiar
                </button>
              </div>
            ) : null}

            <button
              className={styles.primaryButton}
              disabled={isBusy || isLoadingInviteMeta}
              onClick={async () => {
                setIsGeneratingTournamentCode(true);
                try {
                  const response = await sileo.promise(
                    apiClient.regenerateTournamentInviteCode(tournamentId),
                    {
                      loading: { title: 'Generando código del torneo...' },
                      success: { title: 'Código generado' },
                      error: { title: 'No se pudo generar el código' },
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
              <span>{hasActiveTournamentCode ? 'Regenerar código' : 'Generar código'}</span>
              {isGeneratingTournamentCode ? (
                <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
              ) : (
                <RefreshCw aria-hidden="true" size={19} />
              )}
            </button>
          </div>
        </article>

        <article className={styles.toolCard}>
          <div className={styles.cardTopline}>
            <span>Jugador invitado</span>
            <span aria-hidden="true">02</span>
          </div>
          <div className={styles.cardContent}>
            <div className={styles.toolHeading}>
              <span aria-hidden="true" className={`${styles.toolIcon} ${styles.guestIcon}`}>
                <UserRoundPlus size={23} strokeWidth={1.8} />
              </span>
              <div>
                <p className={styles.eyebrow}>Perfil anticipado</p>
                <h2>Creá un jugador invitado</h2>
              </div>
            </div>
            <p className={styles.description}>
              Sumalo ahora al plantel y compartile su código personal para que reclame el perfil.
            </p>

            <form
              className={styles.guestForm}
              onSubmit={async (event) => {
                event.preventDefault();

                if (!trimmedGuestName) {
                  return;
                }

                setIsSubmittingGuest(true);
                try {
                  const response = await sileo.promise(
                    apiClient.createGuestPlayer(tournamentId, { name: trimmedGuestName }),
                    {
                      loading: { title: 'Creando invitado...' },
                      success: { title: 'Invitado creado' },
                      error: { title: 'No se pudo crear el invitado' },
                    },
                  );
                  setGuestCode(response.claimCode);
                  setGuestName('');
                } finally {
                  setIsSubmittingGuest(false);
                }
              }}
            >
              <div className={styles.fieldGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="guest-name">Nombre del jugador</label>
                  <span aria-hidden="true">
                    {guestName.length}/{GUEST_NAME_MAX_LENGTH}
                  </span>
                </div>
                <input
                  disabled={isBusy}
                  id="guest-name"
                  maxLength={GUEST_NAME_MAX_LENGTH}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Ej. Martín López"
                  required
                  value={guestName}
                />
              </div>

              {guestCode ? (
                <div className={styles.codeReveal}>
                  <div>
                    <span>Código personal</span>
                    <strong>{guestCode}</strong>
                  </div>
                  <button
                    aria-label="Copiar código del jugador"
                    onClick={async () => {
                      await navigator.clipboard.writeText(guestCode);
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
                  El código personal aparecerá acá.
                </div>
              )}

              <button
                className={styles.secondaryButton}
                disabled={isBusy || !trimmedGuestName}
                type="submit"
              >
                <span>{isSubmittingGuest ? 'Creando jugador...' : 'Crear invitado'}</span>
                {isSubmittingGuest ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
                ) : (
                  <ArrowRight aria-hidden="true" size={20} />
                )}
              </button>
            </form>
          </div>
        </article>
      </div>

      <p className={styles.securityNote}>
        <ShieldCheck aria-hidden="true" size={17} strokeWidth={1.8} />
        Los códigos vencen y pueden regenerarse para mantener seguro el acceso al torneo.
      </p>
    </section>
  );
}
