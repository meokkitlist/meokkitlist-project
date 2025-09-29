import re
import unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent
target_dir = BASE / "utf8"

# 정규식: 리뷰_가게이름_2025-09-01.csv → 리뷰_가게이름_20250901.csv
pattern = re.compile(r"^(리뷰_.+?)_(\d{4})-(\d{2})-(\d{2})\.csv$")

changed = False
for f in target_dir.glob("*.csv"):
    # 파일 이름을 NFC 정규화 (조합형 → 완성형)
    normalized_name = unicodedata.normalize("NFC", f.name)
    m = pattern.match(normalized_name)
    if m:
        new_name = f"{m.group(1)}_{m.group(2)}{m.group(3)}{m.group(4)}.csv"
        print(f"✅ {f.name} → {new_name}")
        f.rename(f.with_name(new_name))
        changed = True
    else:
        print(f"⚠️ 규칙에 안 맞음: {f.name}")

if not changed:
    print("⚠️ 바뀐 파일이 없습니다. (정규화 이후도 매칭 안됨)")
