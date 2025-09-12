# backend/scripts/keyword_extractor.py

import sqlite3
import pandas as pd
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
import json
import os

# 📌 너의 SQLite DB 파일 경로
# NestJS에서 TypeORM으로 SQLite 사용 중이면 .env에서 DB 경로 확인
# 예: src/data/dev.sqlite 라면 아래처럼 적절히 수정
DB_PATH = os.path.join(os.path.dirname(__file__), '../meokkitlist.sqlite')  # ← 이거 경로 꼭 확인!

def fetch_reviews():
    conn = sqlite3.connect(DB_PATH)
    df = pd.read_sql_query("""
    SELECT r.id AS restaurant_id, r.name, r.keywords, rv.text
    FROM restaurant r
    LEFT JOIN review rv ON r.id = rv.restaurant_id
""", conn)

    conn.close()
    return df

def extract_keywords(texts, top_n=10):
    okt = Okt()
    docs = [" ".join(okt.nouns(str(t))) for t in texts if t]
    vectorizer = TfidfVectorizer(token_pattern=r"(?u)\b\w+\b", max_features=1000)
    X = vectorizer.fit_transform(docs)
    keywords = []
    for i in range(X.shape[0]):
        row = X[i].toarray().flatten()
        top_indices = row.argsort()[::-1][:top_n]
        words = [vectorizer.get_feature_names_out()[j] for j in top_indices if row[j] > 0]
        keywords.append(words)
    return keywords

def run():
    df = fetch_reviews()
    grouped = df.groupby('restaurant_id')
    results = []

    for rest_id, group in grouped:
        all_texts = list(group['text'].dropna())

        if not all_texts:
            continue
        top_keywords = extract_keywords([" ".join(all_texts)])
        results.append({
            "restaurant_id": rest_id,
            "keywords": top_keywords[0] if top_keywords else []
        })

    return results

def save_keywords_to_db(results):
    conn = sqlite3.connect(DB_PATH)
    for r in results:
        kw_json = json.dumps(r['keywords'], ensure_ascii=False)
        conn.execute(
            "UPDATE restaurant SET keywords = ? WHERE id = ?",
            (kw_json, r['restaurant_id'])
        )
    conn.commit()
    conn.close()

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        # ex) python keyword_extractor.py 3
        rest_id = int(sys.argv[1])
        rebuild_keywords_for_restaurant(rest_id)
    else:
        print("🔍 전체 키워드 추출 시작")
        results = run()
        save_keywords_to_db(results)
        print("✅ 전체 키워드 추출 및 DB 저장 완료")

def rebuild_keywords_for_restaurant(restaurant_id: int):
    conn = sqlite3.connect(DB_PATH)

    df = pd.read_sql_query(f"""
        SELECT r.id AS restaurant_id, r.name, r.keywords, rv.text
        FROM restaurant r
        LEFT JOIN review rv ON r.id = rv.restaurant_id
        WHERE r.id = {restaurant_id}
    """, conn)

    if df.empty:
        print(f"❗ No restaurant found with id {restaurant_id}")
        return

    all_texts = list(df['text'].dropna())
    if not all_texts:
        print(f"⚠️ No reviews found for restaurant id {restaurant_id}")
        return

    top_keywords = extract_keywords([" ".join(all_texts)])
    kw_json = json.dumps(top_keywords[0], ensure_ascii=False)

    conn.execute(
        "UPDATE restaurant SET keywords = ? WHERE id = ?",
        (kw_json, restaurant_id)
    )
    conn.commit()
    conn.close()
    print(f"✅ 키워드 재추출 완료 for restaurant_id={restaurant_id}")
