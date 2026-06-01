import { IsString } from 'class-validator';

export class ImportTournamentPlayersDto {
  @IsString()
  sourceTournamentId: string;
}
