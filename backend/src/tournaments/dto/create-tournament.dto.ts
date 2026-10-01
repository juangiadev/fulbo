import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import {
  TournamentFormat,
  TournamentType,
  TournamentVisibility,
} from '../../../../shared/src/enums';

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

  @IsOptional()
  @IsEnum(TournamentType)
  type?: TournamentType;

  @ValidateIf(
    (dto: CreateTournamentDto) =>
      dto.type === TournamentType.TEAMS || dto.format !== undefined,
  )
  @IsEnum(TournamentFormat, {
    message: 'format must be one of the following values: LIGA, COPA',
  })
  format?: TournamentFormat;
}
