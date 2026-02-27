import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Match } from './match.entity';
import { Player } from './player.entity';

@Entity({ name: 'match_mvp_votes' })
@Unique('uq_match_mvp_votes_match_voter', ['matchId', 'voterPlayerId'])
export class MatchMvpVote {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  matchId: string;

  @Column('uuid')
  voterPlayerId: string;

  @Column('uuid')
  votedPlayerId: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Match, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'matchId' })
  match: Match;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'voterPlayerId' })
  voterPlayer: Player;

  @ManyToOne(() => Player, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'votedPlayerId' })
  votedPlayer: Player;
}
