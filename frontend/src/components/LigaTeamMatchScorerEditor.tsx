import type { PlayerContract, PlayerTeamContract, TeamContract, TournamentTeamContract } from '@shared/contracts';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { sileo } from 'sileo';
import { apiClient } from '../api/client';
import { ContentSpinner } from './ContentSpinner';
import type { TeamMatchResultEditorRef } from './TeamMatchResultEditor';
import styles from './LigaTeamMatchScorerEditor.module.css';

interface TeamMatchResultSummary {
  teamAName: string;
  teamBName: string;
  teamAGoals: number;
  teamBGoals: number;
}

interface LigaTeamMatchScorerEditorProps {
  canEdit: boolean;
  matchId: string;
  tournamentTeams: TournamentTeamContract[];
  onSummaryChange?: (summary: TeamMatchResultSummary) => void;
}

interface PlayerGoalDraft {
  selected: boolean;
  goals: string;
}

type Side = 'teamA' | 'teamB';
type DraftByPlayerId = Record<string, PlayerGoalDraft>;

function splitTeams(teams: TeamContract[]) {
  const linkedTeams = teams.filter((team) => team.tournamentTeamId);
  return {
    teamA: linkedTeams[0] ?? teams[0] ?? null,
    teamB: linkedTeams[1] ?? teams.find((team) => team.id !== teams[0]?.id) ?? null,
  };
}

function parseGoals(value: string): number | null {
  if (!value.trim()) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function getPlayerName(player: PlayerContract): string {
  return player.nickname?.trim() || player.name;
}

function buildDraft(roster: PlayerContract[], savedRows: PlayerTeamContract[]): DraftByPlayerId {
  const rowsByPlayerId = new Map(savedRows.map((row) => [row.playerId, row]));

  return roster.reduce<DraftByPlayerId>((draft, player) => {
    const savedRow = rowsByPlayerId.get(player.id);
    draft[player.id] = {
      selected: Boolean(savedRow),
      goals: String(savedRow?.goals ?? 0),
    };
    return draft;
  }, {});
}

function getSelectedRows(roster: PlayerContract[], draft: DraftByPlayerId) {
  return roster
    .filter((player) => draft[player.id]?.selected)
    .map((player) => ({ playerId: player.id, goals: parseGoals(draft[player.id]?.goals ?? '0') ?? 0 }));
}

function getGoalTotal(roster: PlayerContract[], draft: DraftByPlayerId): number {
  return getSelectedRows(roster, draft).reduce((total, row) => total + row.goals, 0);
}

export const LigaTeamMatchScorerEditor = forwardRef<TeamMatchResultEditorRef, LigaTeamMatchScorerEditorProps>(
  function LigaTeamMatchScorerEditor({ canEdit, matchId, tournamentTeams, onSummaryChange }, ref) {
    const [teamAId, setTeamAId] = useState(tournamentTeams[0]?.id ?? '');
    const [teamBId, setTeamBId] = useState(tournamentTeams[1]?.id ?? '');
    const [matchTeamA, setMatchTeamA] = useState<TeamContract | null>(null);
    const [matchTeamB, setMatchTeamB] = useState<TeamContract | null>(null);
    const [teamARoster, setTeamARoster] = useState<PlayerContract[]>([]);
    const [teamBRoster, setTeamBRoster] = useState<PlayerContract[]>([]);
    const [teamADraft, setTeamADraft] = useState<DraftByPlayerId>({});
    const [teamBDraft, setTeamBDraft] = useState<DraftByPlayerId>({});
    const [isLoadingMatch, setIsLoadingMatch] = useState(true);
    const [isLoadingRosters, setIsLoadingRosters] = useState(false);
    const [hasRosterError, setHasRosterError] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const lastEmittedSummaryRef = useRef<TeamMatchResultSummary | null>(null);

    useEffect(() => {
      let isActive = true;
      setIsLoadingMatch(true);

      void apiClient
        .getTeamsByMatch(matchId)
        .then((teams) => {
          if (!isActive) {
            return;
          }

          const { teamA, teamB } = splitTeams(teams);
          setMatchTeamA(teamA);
          setMatchTeamB(teamB);
          setTeamAId(teamA?.tournamentTeamId ?? tournamentTeams[0]?.id ?? '');
          setTeamBId(teamB?.tournamentTeamId ?? tournamentTeams[1]?.id ?? '');
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setMatchTeamA(null);
          setMatchTeamB(null);
        })
        .finally(() => {
          if (isActive) {
            setIsLoadingMatch(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [matchId, tournamentTeams]);

    useEffect(() => {
      if (!teamAId || !teamBId || teamAId === teamBId) {
        setTeamARoster([]);
        setTeamBRoster([]);
        setTeamADraft({});
        setTeamBDraft({});
        return;
      }

      let isActive = true;
      setIsLoadingRosters(true);
      setHasRosterError(false);

      void Promise.all([apiClient.getTournamentTeamRoster(teamAId), apiClient.getTournamentTeamRoster(teamBId)])
        .then(([nextTeamARoster, nextTeamBRoster]) => {
          if (!isActive) {
            return;
          }

          const savedTeamARows =
            teamAId === matchTeamA?.tournamentTeamId
              ? ((matchTeamA.playerTeams as PlayerTeamContract[] | undefined) ?? [])
              : [];
          const savedTeamBRows =
            teamBId === matchTeamB?.tournamentTeamId
              ? ((matchTeamB.playerTeams as PlayerTeamContract[] | undefined) ?? [])
              : [];

          setTeamARoster(nextTeamARoster);
          setTeamBRoster(nextTeamBRoster);
          setTeamADraft(buildDraft(nextTeamARoster, savedTeamARows));
          setTeamBDraft(buildDraft(nextTeamBRoster, savedTeamBRows));
        })
        .catch(() => {
          if (!isActive) {
            return;
          }

          setTeamARoster([]);
          setTeamBRoster([]);
          setTeamADraft({});
          setTeamBDraft({});
          setHasRosterError(true);
        })
        .finally(() => {
          if (isActive) {
            setIsLoadingRosters(false);
          }
        });

      return () => {
        isActive = false;
      };
    }, [matchTeamA, matchTeamB, teamAId, teamBId]);

    const teamA = useMemo(() => tournamentTeams.find((team) => team.id === teamAId) ?? null, [teamAId, tournamentTeams]);
    const teamB = useMemo(() => tournamentTeams.find((team) => team.id === teamBId) ?? null, [teamBId, tournamentTeams]);
    const hasDuplicateTeams = Boolean(teamAId && teamBId && teamAId === teamBId);
    const teamAGoals = useMemo(() => getGoalTotal(teamARoster, teamADraft), [teamADraft, teamARoster]);
    const teamBGoals = useMemo(() => getGoalTotal(teamBRoster, teamBDraft), [teamBDraft, teamBRoster]);
    const selectedTeamACount = useMemo(
      () => teamARoster.filter((player) => teamADraft[player.id]?.selected).length,
      [teamADraft, teamARoster],
    );
    const selectedTeamBCount = useMemo(
      () => teamBRoster.filter((player) => teamBDraft[player.id]?.selected).length,
      [teamBDraft, teamBRoster],
    );

    useEffect(() => {
      const nextSummary = {
        teamAName: teamA?.name ?? 'Equipo A',
        teamBName: teamB?.name ?? 'Equipo B',
        teamAGoals,
        teamBGoals,
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
    }, [onSummaryChange, teamA?.name, teamAGoals, teamB?.name, teamBGoals]);

    const updateDraft = (side: Side, playerId: string, nextDraft: PlayerGoalDraft) => {
      const setter = side === 'teamA' ? setTeamADraft : setTeamBDraft;
      setter((current) => ({ ...current, [playerId]: nextDraft }));
    };

    const validateResult = useCallback(() => {
      if (!teamAId || !teamBId || teamAId === teamBId) {
        sileo.warning({ title: 'Elegí dos equipos distintos' });
        return false;
      }

      if (hasRosterError) {
        sileo.warning({ title: 'No pudimos cargar los planteles' });
        return false;
      }

      if (selectedTeamACount === 0 || selectedTeamBCount === 0) {
        sileo.warning({ title: 'Elegí al menos un jugador por equipo' });
        return false;
      }

      const hasInvalidGoals = [
        ...teamARoster.map((player) => teamADraft[player.id]),
        ...teamBRoster.map((player) => teamBDraft[player.id]),
      ].some((draft) => draft?.selected && parseGoals(draft.goals) === null);

      if (hasInvalidGoals) {
        sileo.warning({ title: 'Los goles deben ser números enteros iguales o mayores a 0' });
        return false;
      }

      return true;
    }, [hasRosterError, selectedTeamACount, selectedTeamBCount, teamADraft, teamAId, teamARoster, teamBDraft, teamBId, teamBRoster]);

    const saveResult = useCallback(
      async (targetMatchId?: string) => {
        const effectiveMatchId = targetMatchId ?? matchId;
        if (!validateResult()) {
          throw new Error('Invalid Liga scorer result');
        }

        setIsSaving(true);
        try {
          await apiClient.upsertMatchLineup(effectiveMatchId, {
            teamATournamentTeamId: teamAId,
            teamBTournamentTeamId: teamBId,
            teamAGoals,
            teamBGoals,
            teamA: getSelectedRows(teamARoster, teamADraft),
            teamB: getSelectedRows(teamBRoster, teamBDraft),
          });
        } finally {
          setIsSaving(false);
        }
      },
      [matchId, teamADraft, teamAGoals, teamAId, teamARoster, teamBDraft, teamBGoals, teamBId, teamBRoster, validateResult],
    );

    useImperativeHandle(
      ref,
      () => ({
        saveResult: () => saveResult(),
        saveResultForMatch: (targetMatchId: string) => saveResult(targetMatchId),
        validateResult,
      }),
      [saveResult, validateResult],
    );

    const renderRoster = (side: Side, roster: PlayerContract[], draft: DraftByPlayerId) => {
      const teamLabel = side === 'teamA' ? 'Equipo A' : 'Equipo B';
      const disabled = !canEdit || isSaving || isLoadingMatch || isLoadingRosters;

      if (isLoadingRosters) {
        return (
          <div className={styles.loadingRoster} role="status">
            <ContentSpinner />
            <span>Cargando plantel...</span>
          </div>
        );
      }

      if (roster.length === 0) {
        return <p className={styles.emptyRoster}>Este equipo todavía no tiene jugadores en el plantel.</p>;
      }

      return (
        <div className={styles.rosterList}>
          {roster.map((player) => {
            const playerDraft = draft[player.id] ?? { selected: false, goals: '0' };
            const checkboxId = `${side}-${player.id}-selected`;
            const goalsId = `${side}-${player.id}-goals`;

            return (
              <div className={styles.playerRow} key={player.id}>
                <label className={styles.playerCheck} htmlFor={checkboxId}>
                  <input
                    checked={playerDraft.selected}
                    disabled={disabled}
                    id={checkboxId}
                    onChange={(event) =>
                      updateDraft(side, player.id, {
                        ...playerDraft,
                        selected: event.target.checked,
                      })
                    }
                    type="checkbox"
                  />
                  <span>{getPlayerName(player)}</span>
                </label>
                <label className={styles.goalsField} htmlFor={goalsId}>
                  <span>Goles</span>
                  <input
                    disabled={disabled || !playerDraft.selected}
                    id={goalsId}
                    inputMode="numeric"
                    min={0}
                    onChange={(event) =>
                      updateDraft(side, player.id, {
                        ...playerDraft,
                        goals: event.target.value,
                      })
                    }
                    type="number"
                    value={playerDraft.goals}
                  />
                </label>
              </div>
            );
          })}
          <p className={styles.rosterHint}>{teamLabel}: seleccioná titulares, suplentes o cualquier jugador que haya participado.</p>
        </div>
      );
    };

    if (tournamentTeams.length < 2) {
      return (
        <div className={styles.emptyState} role="status">
          <strong>Agregá equipos para cargar el resultado.</strong>
          <p>Necesitás al menos dos equipos registrados antes de editar partidos de Liga.</p>
        </div>
      );
    }

    return (
      <div className={styles.editor}>
        {isLoadingMatch ? <ContentSpinner /> : null}
        {hasRosterError ? (
          <p className={styles.validationMessage} role="alert">
            No pudimos cargar los planteles. Reintentá antes de guardar el resultado.
          </p>
        ) : null}
        <div className={styles.grid}>
          <section aria-labelledby="liga-team-a-result-title" className={styles.teamCard}>
            <div className={styles.teamHeader}>
              <h3 id="liga-team-a-result-title">Equipo A</h3>
              <strong>{teamAGoals} goles</strong>
            </div>
            <label className={styles.teamSelect}>
              <span>Equipo</span>
              <select disabled={!canEdit || isSaving || isLoadingMatch} onChange={(event) => setTeamAId(event.target.value)} value={teamAId}>
                {tournamentTeams.map((team) => (
                  <option disabled={team.id === teamBId} key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            {renderRoster('teamA', teamARoster, teamADraft)}
          </section>

          <section aria-labelledby="liga-team-b-result-title" className={styles.teamCard}>
            <div className={styles.teamHeader}>
              <h3 id="liga-team-b-result-title">Equipo B</h3>
              <strong>{teamBGoals} goles</strong>
            </div>
            <label className={styles.teamSelect}>
              <span>Equipo</span>
              <select disabled={!canEdit || isSaving || isLoadingMatch} onChange={(event) => setTeamBId(event.target.value)} value={teamBId}>
                {tournamentTeams.map((team) => (
                  <option disabled={team.id === teamAId} key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </label>
            {renderRoster('teamB', teamBRoster, teamBDraft)}
          </section>
        </div>
        {hasDuplicateTeams ? <p className={styles.validationMessage}>Elegí dos equipos distintos para guardar el partido.</p> : null}
        {selectedTeamACount === 0 || selectedTeamBCount === 0 ? (
          <p className={styles.validationMessage}>Cada equipo necesita al menos un jugador seleccionado.</p>
        ) : null}
      </div>
    );
  },
);
