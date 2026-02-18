import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { TournamentVisibility } from '../../../../shared/src/enums';

export class CreateTournamentDto {
  @IsString()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsEnum(TournamentVisibility)
  visibility?: TournamentVisibility;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsUrl()
  leaderBannerImageUrl?: string;

  @IsOptional()
  @IsUrl()
  scorerBannerImageUrl?: string;
}
