import { config } from "dotenv";
import { Client } from "pg";
import OpenAI from "openai";

config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pgClient = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function generateKeywords(name: string, review: string | null) {
  const prompt = `다음 식당 이름과 리뷰를 기반으로 식당의 특성을 잘 나타내는 한글 키워드 5~10개를 추천해줘.
식당 이름: ${name}
리뷰 내용: ${review ?? "리뷰 없음"}

예시는 ["조용한", "브런치", "커피", "맛집", "친절한"] 이런 형태야. 설명 없이, 키워드 배열만 JSON 형태로 응답해줘.`;

  const res = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const raw = res.choices[0].message.content?.trim();
  let parsed: string[] = [];

  try {
    parsed = JSON.parse(raw!);
    if (!Array.isArray(parsed)) throw new Error("응답이 배열이 아님");
  } catch {
    console.warn(`⚠️ ${name} → 응답 파싱 실패. 빈 배열로 저장`);
    parsed = [];
  }

  return parsed;
}

async function main() {
  await pgClient.connect();
  console.log("📡 PostgreSQL 연결됨");

  const { rows } = await pgClient.query(`
    SELECT id, name, review FROM restaurant
    WHERE keywords IS NULL OR keywords = 'null';
  `);

  console.log(`🎯 키워드 비어있는 식당 수: ${rows.length}`);

  for (const row of rows) {
    const { id, name, review } = row;

    try {
      const keywords = await generateKeywords(name, review);

      // 반드시 JSON.stringify() 해서 넣기
      await pgClient.query(
        `UPDATE restaurant SET keywords = $1::jsonb WHERE id = $2`,
        [JSON.stringify(keywords), id]
      );

      console.log(`✅ ${name} →`, keywords);
      await new Promise((r) => setTimeout(r, 2000)); // 2초 딜레이
    } catch (err: any) {
      console.error(`❌ ${name} 처리 실패:`, err.message);
    }
  }

  await pgClient.end();
  console.log("🚀 키워드 자동 생성 완료");
}

main();
