import type { TournamentContract } from '@shared/contracts';

export interface AppData {
  tournaments: TournamentContract[];
}

export interface CreateTournamentInput {
  name: string;
}

export interface UpdateTournamentInput {
  name?: string;
  imageUrl?: string | null;
  leaderBannerImageUrl?: string | null;
  scorerBannerImageUrl?: string | null;
}
