import requests
import psycopg2
import time

DB_URL = "postgresql://meokkitlist_db_user:ah99u2U0rPaGaKt8Pg1PRY2r76JP3EwR@dpg-d374hrur433s73ede0s0-a.oregon-postgres.render.com:5432/meokkitlist_db"
SENTIMENT_URL = "https://meokkitlist-sentiment.onrender.com/analyze"

BATCH_SIZE = 50
RETRY_LIMIT = 3

def connect_db():
    return psycopg2.connect(DB_URL)

def main():
    conn = connect_db()
    cur = conn.cursor()

    cur.execute("SELECT id, text, restaurant_id, source, user_id FROM review WHERE sentiment='error';")
    rows = cur.fetchall()
    total = len(rows)
    print(f"🎯 재분석 대상 리뷰: {total}건")

    processed = 0
    for i, (rid, text, restaurant_id, source, user_id) in enumerate(rows, start=1):
        success = False

        payload = {
            "text": text,
            "restaurant_id": str(restaurant_id) if restaurant_id else "",
            "source": source if source else "crawl",
            "user_id": str(user_id) if user_id else "",
        }

        for attempt in range(1, RETRY_LIMIT + 1):
            try:
                resp = requests.post(SENTIMENT_URL, json=payload, timeout=15)
                if resp.ok:
                    data = resp.json()

                    # ✅ 응답 변환
                    sentiment = data.get("top_label", "Unknown")
                    score = int(round(data.get("top_prob", 0) * 100))
                    emoji = data.get("ui", {}).get("emoji", "❓")
                    percent = data.get("ui", {}).get("percent", 0)

                    cur.execute(
                        """
                        UPDATE review
                        SET sentiment=%s, score=%s, emoji=%s, percent=%s
                        WHERE id=%s
                        """,
                        (sentiment, score, emoji, percent, rid),
                    )
                    success = True
                    break
                else:
                    print(f"⚠️ 리뷰 {rid} 분석 실패 (status {resp.status_code}) {resp.text}")
            except Exception as e:
                print(f"⚠️ 리뷰 {rid} 분석 중 오류 (시도 {attempt}/{RETRY_LIMIT}): {e}")
                time.sleep(2)

        if not success:
            print(f"❌ 리뷰 {rid} 최종 실패 (건너뜀)")
            continue

        processed += 1
        if i % BATCH_SIZE == 0:
            conn.commit()
            print(f"✅ {i}개까지 커밋 완료")

    conn.commit()
    print(f"🎉 재분석 완료! 총 {processed}건 업데이트됨")

    cur.close()
    conn.close()

if __name__ == "__main__":
    main()
