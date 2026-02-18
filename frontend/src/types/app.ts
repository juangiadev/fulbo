import type { TournamentContract, UserProfile } from '@shared/contracts';

export interface AppData {
  users: UserProfile[];
  tournaments: TournamentContract[];
}
