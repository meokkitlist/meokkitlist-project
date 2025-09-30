// backend/scripts/reanalyze-errors.js
import dotenv from "dotenv";
import pg from "pg";
import axios from "axios";

// 1. .env 로드 (backend/.env 기준)
dotenv.config({ path: "./.env" });

const { Pool } = pg;

// 2. DB 연결
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL 환경변수가 없습니다. .env 확인하세요.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Render PostgreSQL 대응
});

// 3. Sentiment API URL
const API_URL =
  (process.env.SENTIMENT_API_URL || "https://meokkitlist-sentiment.onrender.com") +
  "/analyze";

// 4. 라벨별 base 점수 매핑
const baseMap = {
  "매우부정": 10,
  "부정": 30,
  "중립": 50,
  "긍정": 70,
  "매우긍정": 90,
  "기쁨(행복한)": 70,
  "즐거운(신나는)": 70,
  "슬픔(우울한)": 30,
  "짜증남": 30,
  "고마운": 70,
  "생각이 많은": 50,
  "일상적인": 50,
};

async function main() {
  const client = await pool.connect();
  try {
    // error 리뷰만 가져오기
    const { rows } = await client.query(
      `SELECT id, text, restaurant_id, source
       FROM review
       WHERE sentiment = 'error'
       ORDER BY id`
    );

    console.log(`📂 총 ${rows.length}건 error 리뷰 재분석 시작`);

    for (const row of rows) {
      try {
        // 감성분석 API 호출
        const res = await axios.post(API_URL, {
          text: row.text,
          restaurant_id: row.restaurant_id,
          source: row.source,
        });

        console.log(`리뷰 ${row.id} 응답:`, res.data);

        const { top_label, top_prob, ui } = res.data;

        // 점수 계산 (라벨별 base × 확률)
        const base = baseMap[top_label] ?? 50; // 기본값 50
        const score = Math.round(base * top_prob);

        const emoji = ui?.emoji ?? "❓";
        const percent = ui?.percent ?? 0;
        const raw = JSON.stringify(res.data);

        // DB 업데이트
        await client.query(
          `UPDATE review
           SET sentiment=$1, score=$2, emoji=$3, percent=$4, raw=$5
           WHERE id=$6`,
          [top_label, score, emoji, percent, raw, row.id]
        );

        console.log(`✅ 리뷰 ${row.id} 갱신 완료 → ${top_label} (${score})`);
      } catch (err) {
        console.error(`❌ 리뷰 ${row.id} 실패:`, err.message);
      }

      // 서버 과부하 방지 (0.2초 딜레이)
      await new Promise((r) => setTimeout(r, 200));
    }
  } finally {
    client.release();
  }
  await pool.end();
}

main().catch((err) => {
  console.error("스크립트 실행 오류:", err);
  process.exit(1);
});
