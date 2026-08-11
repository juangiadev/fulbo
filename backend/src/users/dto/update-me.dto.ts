import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { DisplayPreference } from '../../../../shared/src/enums';
import { FAVORITE_TEAMS } from '../../../../shared/src/favorite-teams';

const favoriteTeamSlugs = FAVORITE_TEAMS.map((team) => team.slug);

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nickname?: string | null;

  @IsOptional()
  @IsUrl()
  imageUrl?: string | null;

  @IsOptional()
  @IsIn(favoriteTeamSlugs)
  favoriteTeamSlug?: string | null;

  @IsOptional()
  @IsEnum(DisplayPreference)
  displayPreference?: DisplayPreference;
}
