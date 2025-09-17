import { Inject, Injectable, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager"; // ✅ 올바른 위치에서 import
import { Cache } from "cache-manager";
import OpenAI from "openai";
import * as dotenv from "dotenv";
import { KeywordMapService } from "../services/keyword-map.service";

dotenv.config();

@Injectable()
export class GptService {
  private readonly logger = new Logger(GptService.name);
  private readonly openai: OpenAI;

  private readonly MODEL = process.env.GPT_MODEL?.trim() || "gpt-3.5-turbo";
  private readonly MAX_RETURN = Number(process.env.GPT_KEYWORD_MAX_RETURN ?? 5);
  private readonly CACHE_TTL_SEC = Number(
    process.env.GPT_KEYWORD_CACHE_TTL_SEC ?? 3600,
  ); // 기본 1시간

  constructor(
    private readonly keywordmapService: KeywordMapService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async extractKeywords(sentence: string): Promise<string[]> {
    const normalized = sentence.trim();
    const cacheKey = `gpt:keywords:${normalized}`;

    // ✅ 1. 캐시 확인
    try {
      const cached = await this.cacheManager.get<string[]>(cacheKey);
      if (cached) {
        this.logger.log(`🧠 [HIT] Cache 사용: "${cacheKey}"`);
        return cached;
      }
    } catch (err) {
      this.logger.warn(`⚠️ Cache 조회 실패: ${err}`);
    }

    // ✅ 2. GPT 프롬프트 구성
    let prompt = "";
    try {
      const keyList = Array.from(this.keywordmapService.getMap().keys());
      this.logger.log(`🔑 KEY목록 갯수: ${keyList.length}`);
      prompt = [
        "KEY목록에서 문장과 연관이 있는 단어들을 뽑아줘.",
        "반드시 JSON 배열 형태로만 응답해.",
        `KEY목록 : ${JSON.stringify(keyList)}`,
        `문장: "${normalized}"`,
        `최소 ${this.MAX_RETURN}개로 제한.`,
      ].join("\n");
    } catch (err) {
      this.logger.error("❌ KEY목록 구성 실패", err as any);
      throw new Error("KEY목록 구성 실패");
    }
    let keywords: string[] = [];

    // ✅ 3. GPT 호출
    try {
      this.logger.log(`🤖 GPT 호출 시작 (model: ${this.MODEL})`);
      const response = await this.openai.chat.completions.create({
        model: this.MODEL,
        messages: [
          {
            role: "system",
            content:
              "반드시 JSON 배열로만 출력해." +
              "사용자가 제시한 KEY목록에서만 골라야한다." +
              "절대 새로운 단어를 만들어내면 안된다.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
      });

      const raw = response.choices[0]?.message?.content?.trim() ?? "[]";
      keywords = this.parseKeywordsFromResponse(raw);

      if (!Array.isArray(keywords) || keywords.length === 0) {
        this.logger.warn(`⚠️ GPT 응답 파싱 실패, fallback 사용. raw="${raw}"`);
        keywords = this.simpleFallbackExtract(normalized);
      }
    } catch (err) {
      this.logger.error("❌ GPT 호출 실패, fallback 사용", err as any);
      keywords = this.simpleFallbackExtract(normalized);
    }

    // ✅ 4. 정규화 + 중복 제거
    keywords = this.normalizeKeywordList(keywords).slice(0, this.MAX_RETURN);

    // ✅ 5. 캐시에 저장 (TTL은 숫자로 직접 전달!)
    try {
      await this.cacheManager.set(cacheKey, keywords, this.CACHE_TTL_SEC);
      this.logger.log(`✅ [SET] Cache 저장 완료: "${cacheKey}"`);
    } catch (err) {
      this.logger.warn(`⚠️ Cache 저장 실패: ${err}`);
    }

    return keywords;
  }

  // -------------------- 내부 유틸 --------------------

  private parseKeywordsFromResponse(raw: string): string[] {
    try {
      const start = raw.indexOf("[");
      const end = raw.lastIndexOf("]");
      if (start !== -1 && end !== -1 && end > start) {
        const json = raw.substring(start, end + 1);
        const arr = JSON.parse(json);
        if (Array.isArray(arr)) return arr.map(String);
      }
    } catch {
      // fallback 아래에서 처리
    }

    // 쉼표 기반 파싱 fallback
    if (raw.includes(",")) {
      return raw
        .split(",")
        .map((s) => s.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }

    // 단일 키워드 fallback
    const only = raw
      .replace(/^\[|\]$/g, "")
      .trim()
      .replace(/^"|"$/g, "");
    return only ? [only] : [];
  }

  private simpleFallbackExtract(sentence: string): string[] {
    const tokens = sentence
      .split(/[\s,.;:"'()\-!?]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    const kor = tokens.filter((w) => /^[가-힣]{2,}$/.test(w));
    const eng = tokens.filter((w) => /^[A-Za-z]{3,}$/.test(w));
    const merged = [...kor, ...eng];

    return this.normalizeKeywordList(merged).slice(0, this.MAX_RETURN);
  }

  private normalizeKeywordList(arr: unknown[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of arr) {
      if (v == null) continue;
      const s = String(v).trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
    return out;
  }
}
