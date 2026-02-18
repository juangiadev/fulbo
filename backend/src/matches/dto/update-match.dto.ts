import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional } from 'class-validator';
import { MatchStatus } from '../../../../shared/src/enums';
import { CreateMatchDto } from './create-match.dto';

export class UpdateMatchDto extends PartialType(CreateMatchDto) {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;
}
