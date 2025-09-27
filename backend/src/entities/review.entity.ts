// src/entities/review.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Restaurant } from './restaurant.entity';

@Entity('review')
@Index('idx_review_restaurant_id', ['restaurant_id'])
@Index('idx_review_source', ['source'])
export class Review {
  @PrimaryGeneratedColumn()
  id: number;

  // 리뷰 본문
  @Column({ type: 'text' })
  text: string;

  // FK: restaurant.id (nullable 허용)
  @Column({ type: 'integer', nullable: true })
  restaurant_id: number | null;

  // 관계 설정 (식당 삭제 시 review는 남기되 FK를 null 처리)
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.reviews, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant | null;

  // 작성자 (선택)
  @Column({ type: 'text', nullable: true })
  user_id: string | null;

  // 데이터 출처
  @Column({ type: 'text' })
  source: 'user' | 'crawl';

  // 감성 분석 결과들
  @Column({ type: 'text', nullable: true })
  sentiment: string | null;

  @Column('int', { nullable: true })
  score: number | null;

  @Column({ type: 'text', nullable: true })
  emoji: string | null;

  @Column('int', { nullable: true })
  percent: number | null;

  @Column('simple-json', { nullable: true })
  raw: any;
}
