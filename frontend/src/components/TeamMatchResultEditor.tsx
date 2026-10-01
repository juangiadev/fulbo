import type { TeamContract, TournamentTeamContract } from '@shared/contracts';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { apiClient } from '../api/client';
import { ContentSpinner } from './ContentSpinner';
import styles from './TeamMatchResultEditor.module.css';

export interface TeamMatchResultEditorRef {
  saveResult: () => Promise<void>;
  saveResultForMatch: (targetMatchId: string) => Promise<void>;
  validateResult: () => boolean;
}

interface TeamMatchResultSummary {
  teamAName: string;
  teamBName: string;
  teamAGoals: number;
  teamBGoals: number;
}

interface TeamMatchResultEditorProps {
  canEdit: boolean;
  matchId?: string;
  tournamentTeams: TournamentTeamContract[];
  onSummaryChange?: (summary: TeamMatchResultSummary) => void;
}

function parseGoals(value: string): number | null {
  if (!value.trim()) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function splitTeams(teams: TeamContract[]) {
  const linkedTeams = teams.filter((team) => team.tournamentTeamId);
  return {
    teamA: linkedTeams[0] ?? teams[0] ?? null,
    teamB: linkedTeams[1] ?? teams.find((team) => team.id !== teams[0]?.id) ?? null,
  };
}

export const TeamMatchResultEditor = forwardRef<TeamMatchResultEditorRef, TeamMatchResultEditorProps>(
  function TeamMatchResultEditor({ canEdit, matchId, tournamentTeams, onSummaryChange }, ref) {
    const [teamAId, setTeamAId] = useState('');
    const [teamBId, setTeamBId] = useState('');
    const [teamAGoals, setTeamAGoals] = useState('0');
    const [teamBGoals, setTeamBGoals] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const lastEmittedSummaryRef = useRef<TeamMatchResultSummary | null>(null);

    useEffect(() => {
      if (!matchId) {
        setTeamAId(tournamentTeams[0]?.id ?? '');
        setTeamBId(tournamentTeams[1]?.id ?? '');
        setTeamAGoals('0');
        setTeamBGoals('0');
        return;
      }

      let isActive = true;
      setIsLoading(true);
      void apiClient
        .getTeamsByMatch(matchId)
        .then((teams) => {
          if (!isActive) {
            return;
          }
          const { teamA, teamB } = splitTeams(teams);
          setTeamAId(teamA?.tournamentTeamId ?? tournamentTeams[0]?.id ?? '');
          setTeamBId(teamB?.tournamentTeamId ?? tournamentTeams[1]?.id ?? '');
          setTeamAGoals(String(teamA?.goals ?? 0));
          setTeamBGoals(String(teamB?.goals ?? 0));
        })
        .finally(() => {
          if (isActive) {
            setIsLoading(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [matchId, tournamentTeams]);

    const teamA = useMemo(() => tournamentTeams.find((team) => team.id === teamAId) ?? null, [teamAId, tournamentTeams]);
    const teamB = useMemo(() => tournamentTeams.find((team) => team.id === teamBId) ?? null, [teamBId, tournamentTeams]);
    const hasDuplicateTeams = Boolean(teamAId && teamBId && teamAId === teamBId);
    const parsedTeamAGoals = parseGoals(teamAGoals);
    const parsedTeamBGoals = parseGoals(teamBGoals);

    useEffect(() => {
      const nextSummary = {
        teamAName: teamA?.name ?? 'Equipo A',
        teamBName: teamB?.name ?? 'Equipo B',
        teamAGoals: parsedTeamAGoals ?? 0,
        teamBGoals: parsedTeamBGoals ?? 0,
      };
      const lastSummary = lastEmittedSummaryRef.current;

      if (
        lastSummary &&
        lastSummary.teamAName === nextSummary.teamAName &&
        lastSummary.teamBName === nextSummary.teamBName &&
        lastSummary.teamAGoals === nextSummary.teamAGoals &&
        lastSummary.teamBGoals === nextSummary.teamBGoals
      ) {
        return;
      }

      lastEmittedSummaryRef.current = nextSummary;
      onSummaryChange?.(nextSummary);
    }, [onSummaryChange, parsedTeamAGoals, parsedTeamBGoals, teamA?.name, teamB?.name]);

    const validateResult = useCallback(() => {
      if (!teamAId || !teamBId || teamAId === teamBId) {
        sileo.warning({ title: 'Elegí dos equipos distintos' });
        return false;
      }
      if (parsedTeamAGoals === null || parsedTeamBGoals === null) {
        sileo.warning({ title: 'Los goles deben ser números enteros positivos' });
        return false;
      }

      return true;
    }, [parsedTeamAGoals, parsedTeamBGoals, teamAId, teamBId]);

    const saveResult = useCallback(
      async (targetMatchId?: string) => {
        const effectiveMatchId = targetMatchId ?? matchId;
        if (!effectiveMatchId) {
          sileo.warning({ title: 'Primero creá el partido para guardar el resultado' });
          throw new Error('Match must exist before saving team result');
        }
        if (!validateResult()) {
          throw new Error('Invalid team result');
        }

        const teamAGoalsValue = parsedTeamAGoals;
        const teamBGoalsValue = parsedTeamBGoals;
        if (teamAGoalsValue === null || teamBGoalsValue === null) {
          throw new Error('Invalid team goals');
        }

        setIsSaving(true);
        try {
          await apiClient.upsertMatchLineup(effectiveMatchId, {
            teamATournamentTeamId: teamAId,
            teamBTournamentTeamId: teamBId,
            teamAGoals: teamAGoalsValue,
            teamBGoals: teamBGoalsValue,
            teamA: [],
            teamB: [],
          });
        } finally {
          setIsSaving(false);
        }
      },
      [matchId, parsedTeamAGoals, parsedTeamBGoals, teamAId, teamBId, validateResult],
    );

    useImperativeHandle(ref, () => ({
      saveResult: () => saveResult(),
      saveResultForMatch: (targetMatchId: string) => saveResult(targetMatchId),
      validateResult,
    }), [saveResult, validateResult]);

    if (tournamentTeams.length < 2) {
      return (
        <div className={styles.emptyState} role="status">
          <strong>Agregá equipos para cargar el resultado.</strong>
          <p>Necesitás al menos dos equipos registrados antes de crear o editar partidos de Liga.</p>
        </div>
      );
    }

    return (
      <div className={styles.editor}>
        {isLoading ? <ContentSpinner /> : null}
        <div className={styles.grid}>
          <section aria-labelledby="team-a-result-title" className={styles.teamCard}>
            <h3 id="team-a-result-title">Equipo A</h3>
            <label>
              <span>Equipo</span>
              <select disabled={!canEdit || isSaving || isLoading} onChange={(event) => setTeamAId(event.target.value)} value={teamAId}>
                {tournamentTeams.map((team) => (
                  <option disabled={team.id === teamBId} key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Goles</span>
              <input disabled={!canEdit || isSaving || isLoading} min={0} onChange={(event) => setTeamAGoals(event.target.value)} type="number" value={teamAGoals} />
            </label>
          </section>

          <section aria-labelledby="team-b-result-title" className={styles.teamCard}>
            <h3 id="team-b-result-title">Equipo B</h3>
            <label>
              <span>Equipo</span>
              <select disabled={!canEdit || isSaving || isLoading} onChange={(event) => setTeamBId(event.target.value)} value={teamBId}>
                {tournamentTeams.map((team) => (
                  <option disabled={team.id === teamAId} key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </label>
            <label>
              <span>Goles</span>
              <input disabled={!canEdit || isSaving || isLoading} min={0} onChange={(event) => setTeamBGoals(event.target.value)} type="number" value={teamBGoals} />
            </label>
          </section>
        </div>
        {hasDuplicateTeams ? (
          <p className={styles.validationMessage}>Elegí dos equipos distintos para guardar el partido.</p>
        ) : null}
      </div>
    );
  },
);
