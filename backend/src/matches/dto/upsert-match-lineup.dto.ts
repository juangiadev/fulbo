import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class LineupEntryDto {
  @IsString()
  playerId: string;

  @IsInt()
  @Min(0)
  goals: number;
}

export class UpsertMatchLineupDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamAName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  teamBName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  teamAColor?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/)
  teamBColor?: string;

  @IsArray()
  @ArrayUnique((entry: LineupEntryDto) => entry.playerId)
  @ValidateNested({ each: true })
  @Type(() => LineupEntryDto)
  teamA: LineupEntryDto[];

  @IsArray()
  @ArrayUnique((entry: LineupEntryDto) => entry.playerId)
  @ValidateNested({ each: true })
  @Type(() => LineupEntryDto)
  teamB: LineupEntryDto[];
}
