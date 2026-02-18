import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DisplayPreference, PlayerRole } from '../../../../shared/src/enums';

export class CreatePlayerDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nickname?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  favoriteTeamSlug?: string;

  @IsOptional()
  @IsEnum(DisplayPreference)
  displayPreference?: DisplayPreference;

  @IsOptional()
  @IsEnum(PlayerRole)
  role?: PlayerRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  ability?: number;

  @IsOptional()
  @IsString()
  injury?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  misses?: number;
}
