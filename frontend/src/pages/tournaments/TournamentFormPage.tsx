import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { sileo } from 'sileo';
import { useAppContext } from '../../state/AppContext';
import styles from './TournamentFormPage.module.css';

const TOURNAMENT_NAME_MAX_LENGTH = 150;

export function TournamentFormPage() {
  const navigate = useNavigate();
  const { tournamentId } = useParams();
  const { createTournament, data, loadTournaments, updateTournament } = useAppContext();
  const isEdit = Boolean(tournamentId);

  const tournament = data.tournaments.find((item) => item.id === tournamentId);

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    void loadTournaments();
  }, [loadTournaments]);

  const name = nameDraft ?? tournament?.name ?? '';
  const trimmedName = name.trim();

  if (isEdit && data.tournaments.length > 0 && !tournament) {
    return <Navigate replace to="/tournaments" />;
  }

  return (
    <section className={styles.page}>
      <div aria-hidden="true" className={styles.pitchDecoration} />

      <button className={styles.backButton} onClick={() => navigate('/tournaments')} type="button">
        <ArrowLeft aria-hidden="true" size={18} />
        Volver a torneos
      </button>

      <div className={styles.layout}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>{isEdit ? 'Configuración del torneo' : 'Nueva competencia'}</p>
          <h1>{isEdit ? 'Poné el torneo a punto.' : 'Dale nombre a la próxima historia.'}</h1>
          <p className={styles.lead}>
            {isEdit
              ? 'Actualizá cómo se presenta tu competencia para todos los jugadores.'
              : 'Empezá por lo esencial. Después vas a sumar jugadores, partidos y resultados.'}
          </p>

          <ul className={styles.notes}>
            <li>
              <CheckCircle2 aria-hidden="true" size={19} strokeWidth={1.8} />
              Podés cambiar el nombre más adelante.
            </li>
            <li>
              <CheckCircle2 aria-hidden="true" size={19} strokeWidth={1.8} />
              El fixture y los planteles se arman después.
            </li>
          </ul>
        </header>

        <section aria-labelledby="tournament-form-title" className={styles.formCard}>
          <div className={styles.cardTopline}>
            <h2 id="tournament-form-title">Ficha del torneo</h2>
            <span aria-hidden="true">01 / 01</span>
          </div>

          <form
            className={styles.tournamentForm}
            onSubmit={async (event) => {
              event.preventDefault();

              if (!trimmedName) {
                return;
              }

              setIsSubmitting(true);
              try {
                if (isEdit && tournamentId) {
                  await sileo.promise(updateTournament(tournamentId, { name: trimmedName }), {
                    loading: { title: 'Actualizando torneo...' },
                    success: { title: 'Torneo actualizado' },
                    error: { title: 'No se pudo guardar el torneo' },
                  });
                } else {
                  await sileo.promise(createTournament({ name: trimmedName }), {
                    loading: { title: 'Creando torneo...' },
                    success: { title: 'Torneo creado' },
                    error: { title: 'No se pudo guardar el torneo' },
                  });
                }
                navigate('/tournaments', { replace: true });
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className={styles.fieldGroup}>
              <div className={styles.labelRow}>
                <label htmlFor="tournament-name">Nombre del torneo</label>
                <span aria-hidden="true">
                  {name.length}/{TOURNAMENT_NAME_MAX_LENGTH}
                </span>
              </div>
              <input
                aria-describedby="tournament-name-help"
                autoComplete="off"
                autoFocus
                id="tournament-name"
                maxLength={TOURNAMENT_NAME_MAX_LENGTH}
                onChange={(event) => setNameDraft(event.target.value)}
                placeholder="Ej. Copa de los jueves"
                required
                value={name}
              />
              <p id="tournament-name-help">Así lo van a encontrar todos los jugadores.</p>
            </div>

            <div className={styles.preview}>
              <div className={styles.previewTopline}>
                <span>Vista previa</span>
                <span aria-hidden="true">FULBO</span>
              </div>
              <div className={styles.previewBody}>
                <div aria-hidden="true" className={styles.previewIcon}>
                  <Trophy size={27} strokeWidth={1.6} />
                </div>
                <div>
                  <span>Tu competencia</span>
                  <strong>{trimmedName || 'Tu próximo torneo'}</strong>
                  <small>Listo para armar el fixture</small>
                </div>
              </div>
            </div>

            <div className={styles.formActions}>
              <button
                className={styles.cancelButton}
                disabled={isSubmitting}
                onClick={() => navigate('/tournaments')}
                type="button"
              >
                Cancelar
              </button>
              <button
                className={styles.submitButton}
                disabled={isSubmitting || !trimmedName}
                type="submit"
              >
                <span>{isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear torneo'}</span>
                {isSubmitting ? (
                  <LoaderCircle aria-hidden="true" className={styles.spinner} size={20} />
                ) : (
                  <ArrowRight aria-hidden="true" size={20} />
                )}
              </button>
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
