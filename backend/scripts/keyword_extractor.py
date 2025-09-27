import os
import json
import pandas as pd
from sqlalchemy import create_engine, text
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
from dotenv import load_dotenv

# 📌 1. .env 로드
load_dotenv()

# 📌 2. 환경 변수 로딩 확인
DATABASE_URL = os.getenv("DATABASE_URL")
assert DATABASE_URL, "❗ DATABASE_URL이 .env에 설정되어 있지 않습니다."
print("📦 ENV_DATABASE_URL =", DATABASE_URL)

# 📌 3. SQLAlchemy 엔진 생성
engine = create_engine(
    DATABASE_URL,
    connect_args={"client_encoding": "utf8"}
)


# ✅ 리뷰 + 레스토랑 JOIN 조회
def fetch_reviews():
    query = """
        SELECT r.id AS restaurant_id, r.name, r.keywords, rv.text
        FROM restaurant r
        LEFT JOIN review rv ON r.id = rv.restaurant_id
    """
    df = pd.read_sql_query(query, engine)
    return df

# ✅ 키워드 추출 함수 (TF-IDF + Okt)
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

# ✅ 전체 키워드 추출 루프
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

# ✅ DB에 키워드 저장
def save_keywords_to_db(results):
    with engine.begin() as conn:
        for r in results:
            kw_json = json.dumps(r['keywords'], ensure_ascii=False)
            conn.execute(
                text("UPDATE restaurant SET keywords = :kw WHERE id = :id"),
                {"kw": kw_json, "id": r['restaurant_id']}
            )

# ✅ 특정 restaurant_id만 재추출
def rebuild_keywords_for_restaurant(restaurant_id: int):
    query = """
        SELECT r.id AS restaurant_id, r.name, r.keywords, rv.text
        FROM restaurant r
        LEFT JOIN review rv ON r.id = rv.restaurant_id
        WHERE r.id = :restaurant_id
    """
    df = pd.read_sql_query(query, engine, params={"restaurant_id": restaurant_id})

    if df.empty:
        print(f"❗ No restaurant found with id {restaurant_id}")
        return

    all_texts = list(df['text'].dropna())
    if not all_texts:
        print(f"⚠️ No reviews found for restaurant id {restaurant_id}")
        return

    top_keywords = extract_keywords([" ".join(all_texts)])
    kw_json = json.dumps(top_keywords[0], ensure_ascii=False)

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE restaurant SET keywords = :kw WHERE id = :id"),
            {"kw": kw_json, "id": restaurant_id}
        )

    print(f"✅ 키워드 재추출 완료 for restaurant_id={restaurant_id}")

# ✅ 진입점
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
