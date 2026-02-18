import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TeamResult } from '../../../../shared/src/enums';
import { Match } from './match.entity';
import { PlayerTeam } from './player-team.entity';

@Entity({ name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  matchId: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({
    type: 'enum',
    enum: TeamResult,
    default: TeamResult.PENDING,
  })
  result: TeamResult;

  @Column({ type: 'varchar', nullable: true })
  color: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Match, (match) => match.teams, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @OneToMany(() => PlayerTeam, (playerTeam) => playerTeam.team)
  playerTeams: PlayerTeam[];
}
