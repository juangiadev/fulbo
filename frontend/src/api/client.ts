import type {
  MatchContract,
  PlayerContract,
  PlayerTeamContract,
  TeamContract,
  TournamentContract,
  TournamentSummaryContract,
  UserProfile,
} from '@shared/contracts';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const DEV_AUTH0_ID_STORAGE_KEY = 'fulbo-dev-auth0-id';
const DEV_AUTH_BYPASS_ENABLED = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';

let accessTokenProvider: (() => Promise<string | null>) | null = null;

export function setAccessTokenProvider(provider: (() => Promise<string | null>) | null): void {
  accessTokenProvider = provider;
}

export function getDevAuth0Id(): string {
  return window.localStorage.getItem(DEV_AUTH0_ID_STORAGE_KEY) ?? 'auth0|me';
}

export function setDevAuth0Id(value: string): void {
  window.localStorage.setItem(DEV_AUTH0_ID_STORAGE_KEY, value);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = accessTokenProvider ? await accessTokenProvider().catch(() => null) : null;
  const headers = new Headers(init?.headers ?? {});

  if (!headers.has('Content-Type') && init?.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (DEV_AUTH_BYPASS_ENABLED) {
    headers.set('x-dev-auth0-id', getDevAuth0Id());
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  syncMe: () => request<UserProfile>('/users/me/sync', { method: 'POST' }),
  getMe: () => request<UserProfile>('/users/me'),
  updateMe: (input: Partial<UserProfile>) =>
    request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(input) }),
  getUsers: () => request<UserProfile[]>('/users'),
  getTournaments: () => request<TournamentContract[]>('/tournaments'),
  getTournament: (id: string) => request<TournamentContract>(`/tournaments/${id}`),
  getTournamentSummary: (id: string) => request<TournamentSummaryContract>(`/tournaments/${id}/summary`),
  createTournament: (input: { name: string; visibility: string }) =>
    request<TournamentContract>('/tournaments', { method: 'POST', body: JSON.stringify(input) }),
  joinTournamentByCode: (input: { code: string }) =>
    request<{ tournamentId: string; status: 'PENDING' }>('/tournaments/join', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  regenerateTournamentInviteCode: (tournamentId: string) =>
    request<{ code: string; expiresAt: string }>(`/tournaments/${tournamentId}/invite/regenerate`, {
      method: 'POST',
    }),
  getTournamentInviteMeta: (tournamentId: string) =>
    request<{ expiresAt: string | null }>(`/tournaments/${tournamentId}/invite`),
  getTournamentJoinRequests: (tournamentId: string) =>
    request<Array<{ id: string; userId: string; user: UserProfile; createdAt: string }>>(
      `/tournaments/${tournamentId}/join-requests`,
    ),
  linkJoinRequest: (tournamentId: string, requestId: string, input: { playerId: string }) =>
    request<{ success: true }>(`/tournaments/${tournamentId}/join-requests/${requestId}/link`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getMatches: (tournamentId: string) => request<MatchContract[]>(`/tournaments/${tournamentId}/matches`),
  createMatch: (
    tournamentId: string,
    input: {
      placeName: string;
      placeUrl?: string;
      kickoffAt: string;
      stage: string;
      mvpPlayerId?: string;
    },
  ) =>
    request<MatchContract>(`/tournaments/${tournamentId}/matches`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateMatch: (
    matchId: string,
    input: {
      placeName?: string;
      placeUrl?: string;
      kickoffAt?: string;
      stage?: string;
      mvpPlayerId?: string;
      status?: string;
    },
  ) =>
    request<MatchContract>(`/matches/${matchId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removeMatch: (matchId: string) =>
    request<{ success: true }>(`/matches/${matchId}`, {
      method: 'DELETE',
    }),
  getTeamsByMatch: (matchId: string) => request<TeamContract[]>(`/matches/${matchId}/teams`),
  createTeam: (
    matchId: string,
    input: { name: string; imageUrl?: string; result?: string; color?: string },
  ) =>
    request<TeamContract>(`/matches/${matchId}/teams`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateTeam: (
    teamId: string,
    input: { name?: string; imageUrl?: string; result?: string; color?: string },
  ) =>
    request<TeamContract>(`/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removeTeam: (teamId: string) =>
    request<{ success: true }>(`/teams/${teamId}`, {
      method: 'DELETE',
    }),
  createPlayerTeam: (teamId: string, input: { playerId: string; goals: number; injury?: string }) =>
    request<PlayerTeamContract>(`/teams/${teamId}/players`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updatePlayerTeam: (id: string, input: { goals?: number; injury?: string }) =>
    request<PlayerTeamContract>(`/player-teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removePlayerTeam: (id: string) =>
    request<{ success: true }>(`/player-teams/${id}`, {
      method: 'DELETE',
    }),
  getPlayers: (tournamentId: string) => request<PlayerContract[]>(`/tournaments/${tournamentId}/players`),
  createGuestPlayer: (
    tournamentId: string,
    input: { name: string; nickname?: string },
  ) =>
    request<{ player: PlayerContract; claimCode: string }>(`/tournaments/${tournamentId}/players/guest`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  linkPlayerToUser: (tournamentId: string, playerId: string, input: { userId: string }) =>
    request<PlayerContract>(`/tournaments/${tournamentId}/players/${playerId}/link`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  claimPlayerByCode: (input: { claimCode: string }) =>
    request<PlayerContract>(`/players/claim`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  regeneratePlayerClaimCode: (tournamentId: string, playerId: string) =>
    request<{ claimCode: string; expiresAt: string }>(
      `/tournaments/${tournamentId}/players/${playerId}/claim-code/regenerate`,
      {
        method: 'POST',
      },
    ),
  getPlayerClaimCodeMeta: (tournamentId: string, playerId: string) =>
    request<{ expiresAt: string | null }>(
      `/tournaments/${tournamentId}/players/${playerId}/claim-code/meta`,
    ),
  updatePlayer: (tournamentId: string, playerId: string, input: Partial<PlayerContract>) =>
    request<PlayerContract>(`/tournaments/${tournamentId}/players/${playerId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),
  removePlayer: (tournamentId: string, playerId: string) =>
    request<{ success: true }>(`/tournaments/${tournamentId}/players/${playerId}`, {
      method: 'DELETE',
    }),
  updateTournament: (id: string, input: Partial<TournamentContract>) =>
    request<TournamentContract>(`/tournaments/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteTournament: (id: string) => request<{ success: true }>(`/tournaments/${id}`, { method: 'DELETE' }),
};
