// src/entities/restaurant.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Review } from './review.entity';

@Entity('restaurant')
@Index('idx_restaurant_name', ['name'])
@Index('idx_restaurant_review_count', ['review_count'])
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  name: string;

  @Column('text')
  address: string;

  @Column('float')
  lat: number;

  // DB 컬럼명을 유지(lon) — 위도/경도 쿼리 시 혼동 주의
  @Column('float')
  lon: number;

  // SQLite simple-json 사용 (TEXT로 직렬화/역직렬화)
  // null일 수 있으므로 서비스 레이어에서 기본값 [] 처리 권장
  @Column('simple-json', { nullable: true })
  keywords: string[] | null;

  @Column('int', { default: 0 })
  review_count: number;

  // 누적 점수(총합) — 평균은 서비스에서 total_score / review_count 로 계산
  @Column('float', { default: 0 })
  total_score: number;

  // 네이버 스코어(외부 평점 캐싱용)
  @Column('float', { default: 0 })
  naver_score: number;

  // 미리보기 텍스트
  @Column('text', { nullable: true })
  preview: string | null;

  // 관계: 1:N (restaurant : reviews)
  @OneToMany(() => Review, (review) => review.restaurant, { cascade: false })
  reviews: Review[];
}
