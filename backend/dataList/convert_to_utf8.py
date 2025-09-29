# convert_to_utf8.py
import os, sys, csv
from pathlib import Path
from charset_normalizer import from_bytes

BASE = Path(r"C:\Users\choem\OneDrive\바탕 화면\datalist")
SRC = BASE
DST = BASE / "utf8"
DST.mkdir(exist_ok=True)

report_rows = [("file","detected_encoding","confidence","converted_path","notes")]

def detect_encoding(b: bytes):
    r = from_bytes(b).best()
    if not r:
        return None, 0.0
    conf = 0.0
    # 버전에 따라 confidence/quality/ratio 등 이름이 달라지므로 안전하게 처리
    for attr in ("confidence", "quality", "ratio"):
        if hasattr(r, attr):
            try:
                conf = float(getattr(r, attr))
                break
            except Exception:
                pass
    return r.encoding, conf

def convert_one(p: Path):
    raw = p.read_bytes()
    enc, conf = detect_encoding(raw)
    notes = []
    if not enc:
        # 안전한 후보 인코딩들 순차 시도
        for cand in ("utf-8-sig","utf-8","cp949","euc-kr","utf-16","utf-16le","utf-16be","latin1"):
            try:
                txt = raw.decode(cand)
                enc = cand; conf = -1.0; break
            except:
                pass
        if not enc:
            report_rows.append((str(p), "unknown", 0, "", "decode-failed"))
            return

    # 실제 디코딩 시도
    try:
        txt = raw.decode(enc)
    except Exception:
        for cand in ("cp949","euc-kr","utf-16","utf-16le","utf-16be","latin1"):
            try:
                txt = raw.decode(cand)
                notes.append(f"fallback:{cand}")
                enc = cand
                break
            except:
                pass
        else:
            report_rows.append((str(p), enc, conf, "", "decode-failed"))
            return

    # 변환본 저장 (엑셀 호환 위해 BOM 포함 권장)
    out = DST / p.name
    out.write_text(txt, encoding="utf-8-sig", newline="")

    # � (U+FFFD) 치환 문자 개수 점검
    bad = txt.count("\uFFFD")
    if bad:
        notes.append(f"replacement_char:{bad}")

    report_rows.append((str(p), enc, conf, str(out), "|".join(notes)))

def main():
    csvs = sorted([p for p in SRC.glob("*.csv")])
    if not csvs:
        print("⚠️ CSV 파일을 찾지 못했습니다."); sys.exit(1)

    for p in csvs:
        convert_one(p)
        print(f"✅ converted: {p.name}")

    with open(BASE/"conversion_report.csv","w",newline="",encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerows(report_rows)

    print("\n🎉 변환 완료. 'utf8' 폴더와 'conversion_report.csv'를 확인하세요.")

if __name__ == "__main__":
    main()
