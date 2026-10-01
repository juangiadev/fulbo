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
import { TournamentTeam } from './tournament-team.entity';

@Entity({ name: 'teams' })
export class Team {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  matchId: string;

  @Column('uuid', { nullable: true })
  tournamentTeamId: string | null;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  imageUrl: string | null;

  @Column({ type: 'int', nullable: true })
  goals: number | null;

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

  @ManyToOne(() => TournamentTeam, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'tournamentTeamId' })
  tournamentTeam: TournamentTeam | null;

  @OneToMany(() => PlayerTeam, (playerTeam) => playerTeam.team)
  playerTeams: PlayerTeam[];
}
