import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  Index,
} from "typeorm";
import { Review } from "./review.entity";

@Entity("restaurant")
@Index("idx_restaurant_name", ["name"])
@Index("idx_restaurant_review_count", ["review_count"])
export class Restaurant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  name: string;

  @Column("text", { nullable: true })
  address: string | null;

  @Column("float", { nullable: true })
  lat: number | null;

  @Column("float", { nullable: true }) // ✅ 경도도 nullable 허용
  lon: number | null;

  /**
   * ✅ keywords를 jsonb로 정의
   * - DB에서 @> 연산자 사용 가능
   * - 검색/추천 키워드 기반 로직 정상 작동
   */
  @Column("jsonb", { nullable: true })
  keywords: string[] | null;

  @Column("int", { default: 0 })
  review_count: number;

  @Column("float", { default: 0, nullable: false })
  total_score: number;

  @Column("float", { default: 0 })
  naver_score: number;

  @Column("text", { nullable: true })
  preview: string | null;

  @Column("text", { nullable: true })
  url: string | null;

  @Column("text", { nullable: true })
  review: string | null;

  @Column("float", { default: 0, nullable: false })
  sentiment_score: number;

  @OneToMany(() => Review, (review) => review.restaurant, { cascade: false })
  reviews: Review[];
}
