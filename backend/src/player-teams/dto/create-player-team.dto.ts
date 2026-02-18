import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePlayerTeamDto {
  @IsString()
  playerId: string;

  @IsInt()
  @Min(0)
  goals: number;

  @IsOptional()
  @IsString()
  injury?: string;
}
