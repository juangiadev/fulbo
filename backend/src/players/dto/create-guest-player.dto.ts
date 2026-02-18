import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateGuestPlayerDto {
  @IsString()
  @MaxLength(120)
  name: string;

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
