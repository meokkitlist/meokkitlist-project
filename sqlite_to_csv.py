import sqlite3, pandas as pd

conn = sqlite3.connect("meokkitlist.sqlite")

for table in ["restaurant", "review", "users"]:
    try:
        df = pd.read_sql(f"SELECT * FROM {table}", conn)
        df.to_csv(f"{table}.csv", index=False, encoding="utf-8-sig")
        print(f"✅ {table}.csv export 완료 ({len(df)} rows)")
    except Exception as e:
        print(f"⚠️ {table} 추출 실패: {e}")

conn.close()
