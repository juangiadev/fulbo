import type {
  CreateTournamentInput as SharedCreateTournamentInput,
  TournamentContract,
} from '@shared/contracts';

export interface AppData {
  tournaments: TournamentContract[];
}

export type CreateTournamentInput = SharedCreateTournamentInput;

export interface UpdateTournamentInput {
  name?: string;
  imageUrl?: string | null;
  leaderBannerImageUrl?: string | null;
  scorerBannerImageUrl?: string | null;
}
