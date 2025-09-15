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

  // FK: restaurant.id (정수로 맞춤)
  @Column({ type: 'integer' })
  restaurant_id: number;

  // 관계 설정 (CASCADE 삭제로 식당 삭제 시 리뷰도 삭제)
  @ManyToOne(() => Restaurant, (restaurant) => restaurant.reviews, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  // 작성자 (선택)
  @Column({ type: 'text', nullable: true })
  user_id: string | null;

  // 데이터 출처 (SQLite에서는 enum 대신 TEXT)
  @Column({ type: 'text' })
  source: 'user' | 'crawl';

  // 감성 레이블 (예: 'pos' | 'neg' | 'neu') — 실패 대비 nullable
  @Column({ type: 'text', nullable: true })
  sentiment: string | null;

  // 감성 점수 (정수형, 실패 대비 nullable)
  @Column('int', { nullable: true })
  score: number | null;

  // 이모지 (선택)
  @Column({ type: 'text', nullable: true })
  emoji: string | null;

  // 퍼센트 (0~100, 선택)
  @Column('int', { nullable: true })
  percent: number | null;

  // FastAPI 원본 응답 저장
  @Column('simple-json', { nullable: true })
  raw: any;
}
