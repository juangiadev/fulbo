import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { TeamResult } from '../../../../shared/src/enums';

export class CreateTeamDto {
  @IsString()
  @MaxLength(120)
  name: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsEnum(TeamResult)
  result?: TeamResult;

  @IsOptional()
  @IsString()
  color?: string;
}
