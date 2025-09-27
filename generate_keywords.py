import sqlite3
import json
from konlpy.tag import Okt
from sklearn.feature_extraction.text import TfidfVectorizer
import os

okt = Okt()

def tokenize(text):
    return [word for word, pos in okt.pos(text) if pos in ["Noun", "Adjective"] and len(word) > 1]

def extract_keywords(texts, top_n=5):
    tokenized_texts = [" ".join(tokenize(t)) for t in texts]
    vectorizer = TfidfVectorizer()
    tfidf = vectorizer.fit_transform(tokenized_texts)
    scores = tfidf.sum(axis=0).A1
    words = vectorizer.get_feature_names_out()
    sorted_words = sorted(zip(words, scores), key=lambda x: -x[1])
    return [w for w, _ in sorted_words[:top_n]]

def main():
    db_path = "./meokkitlist.sqlite"
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # 음식점 리스트 가져오기
    cur.execute("SELECT id, name FROM restaurant")
    restaurants = cur.fetchall()

    results = []

    for r_id, r_name in restaurants:
        # 🔧 컬럼 이름 수정: content → text / restaurantId → restaurant_id
        cur.execute("SELECT text FROM review WHERE restaurant_id = ?", (r_id,))
        reviews = [row[0] for row in cur.fetchall()]
        if not reviews:
            continue
        keywords = extract_keywords(reviews)
        results.append((r_id, keywords))
        print(f"📌 {r_name} → {keywords}")

    # UPDATE 쿼리 생성
    with open("update_keywords.sql", "w", encoding="utf-8") as f:
        for r_id, keywords in results:
            keyword_str = json.dumps(keywords, ensure_ascii=False)
            f.write(f"UPDATE restaurant SET keywords = '{keyword_str}' WHERE id = {r_id};\n")

    print("✅ 완료: update_keywords.sql 생성됨!")

if __name__ == "__main__":
    main()
