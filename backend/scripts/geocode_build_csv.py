# backend/scripts/geocode_build_csv.py
import os, csv, time, json, hashlib, re
import requests
from collections import OrderedDict, Counter

KAKAO_REST_KEY = os.getenv("KAKAO_REST_KEY") or "7345d9c77568465c1959dbad1dcdbfc3"
HEADERS = {"Authorization": f"KakaoAK {KAKAO_REST_KEY}"}

ENV_DIRS = os.getenv("CSV_DIRS", "")
INPUT_DIRS = [p for p in [d.strip() for d in ENV_DIRS.split(";")] if p] or [
    "./utf8", "./csv", "./data", "../dataList/utf8"
]

REGION_HINTS = ["부산", "Busan"]
SLEEP_MS = 200

NAME_HINTS = [
    "상호", "업소", "업체", "가게", "식당", "매장", "명칭", "점포",
    "지점", "브랜드", "store", "restaurant", "place", "title", "name"
]
ADDR_HINTS = [
    "주소", "도로명", "지번", "address", "road_address", "jibun"
]
LAT_HINTS = ["lat", "위도", "y", "latitude"]
LON_HINTS = ["lon", "경도", "x", "longitude"]

def norm(s):
    if not isinstance(s, str):
        s = str(s)
    return re.sub(r"\s+", "", s.strip().lower())

def choose_field(keys, hints):
    nk = [ (k, norm(k)) for k in keys ]
    for hint in hints:
        h = norm(hint)
        for raw, kn in nk:
            if h in kn:
                return raw
    return None

def detect_columns(header):
    name_col = choose_field(header, NAME_HINTS)
    addr_col = choose_field(header, ADDR_HINTS)
    lat_col  = choose_field(header, LAT_HINTS)
    lon_col  = choose_field(header, LON_HINTS)
    return name_col, addr_col, lat_col, lon_col

def norm_float(x):
    try:
        if isinstance(x, str) and x.strip().lower() in ("nan",""):
            return None
        return float(x)
    except:
        return None

def cache_key(txt):
    import hashlib
    return hashlib.sha1(txt.encode("utf-8")).hexdigest()

_cache = {}

def _req_with_retry(url, params, retries=3):
    last = None
    for i in range(retries):
        try:
            r = requests.get(url, headers=HEADERS, params=params, timeout=10)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            last = e
            time.sleep(0.5 * (i + 1))
    raise last

def kakao_search_address(q):
    return _req_with_retry("https://dapi.kakao.com/v2/local/search/address.json", {"query": q})

def kakao_search_keyword(q):
    return _req_with_retry("https://dapi.kakao.com/v2/local/search/keyword.json", {"query": q})

def geocode(name, address, region_hints=REGION_HINTS):
    key = cache_key(f"{name}|{address}|{'|'.join(region_hints)}")
    if key in _cache:
        return _cache[key]
    lon = lat = None
    cand = []

    if address:
        try:
            data = kakao_search_address(address)
            cand.extend(data.get("documents", []))
        except Exception:
            pass
        time.sleep(SLEEP_MS / 1000.0)

    if not cand and name:
        q = f"{name} {region_hints[0]}" if region_hints else name
        try:
            data = kakao_search_keyword(q)
            cand.extend(data.get("documents", []))
        except Exception:
            pass
        time.sleep(SLEEP_MS / 1000.0)

    best = None
    if cand:
        preferred = [
            c for c in cand
            if any(
                (h in (c.get("road_address_name") or "")) or (h in (c.get("address_name") or ""))
                for h in region_hints
            )
        ]
        best = (preferred or cand)[0]

    if best:
        try:
            lon = float(best.get("x"))
            lat = float(best.get("y"))
        except:
            lon = lat = None

    _cache[key] = (lat, lon, best)
    return _cache[key]

def iter_csv_files():
    seen = set()
    for d in INPUT_DIRS:
        if not d:
            continue
        base = os.path.abspath(d)
        if not os.path.isdir(base):
            continue
        for root, dirs, files in os.walk(base):
            for fn in files:
                if fn.lower().endswith(".csv"):
                    full = os.path.join(root, fn)
                    if full not in seen:
                        seen.add(full)
                        yield full

def gather_rows():
    bag = OrderedDict()
    matched_files = 0
    skipped_files = 0

    for path in iter_csv_files():
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            header = reader.fieldnames or []
            name_col, addr_col, lat_col, lon_col = detect_columns(header)

            if not name_col and not addr_col and not (lat_col and lon_col):
                skipped_files += 1
                continue
            matched_files += 1

            for row in reader:
                name = str(row.get(name_col, "")).strip() if name_col else ""
                address = str(row.get(addr_col, "")).strip() if addr_col else ""
                lat_raw = row.get(lat_col, "") if lat_col else ""
                lon_raw = row.get(lon_col, "") if lon_col else ""

                if not name:
                    continue

                key = (name, address)
                if key not in bag:
                    bag[key] = {
                        "name": name,
                        "address": address,
                        "preview": row.get("preview", ""),
                        "url": row.get("url", "") or row.get("place_url",""),
                        "review_count": row.get("review_count", "") or row.get("reviews",""),
                        "naver_score": row.get("naver_score", "") or row.get("rating",""),
                        "keywords": row.get("keywords", ""),
                        "lat": str(lat_raw or ""),
                        "lon": str(lon_raw or ""),
                    }
                else:
                    for k in ["preview", "url", "review_count", "naver_score", "keywords", "lat", "lon"]:
                        if (not bag[key].get(k)) and row.get(k):
                            bag[key][k] = row.get(k)

    print(f"파일 매칭 결과: 사용 {matched_files}개, 스킵 {skipped_files}개")
    return bag

def main():
    assert KAKAO_REST_KEY, "환경변수 KAKAO_REST_KEY를 설정하세요."
    print("📂 CSV 파일 스캔 시작")
    bag = gather_rows()
    print(f"총 후보 레코드: {len(bag)}")

    out_fn = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "restaurant_ready.csv"))
    success = fail = 0
    with open(out_fn, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["name","address","lat","lon","preview","url","review_count","naver_score","keywords"])
        for (name, address), extra in bag.items():
            lat = norm_float(extra.get("lat"))
            lon = norm_float(extra.get("lon"))

            lat_out = lon_out = ""
            kakao_address = address

            if lat is None or lon is None or not address:
                lat, lon, best = geocode(name, address, REGION_HINTS)
                if best and not address:
                    kakao_address = best.get("road_address_name") or best.get("address_name") or address

            if lat is not None and lon is not None:
                success += 1
                lat_out = f"{lat:.8f}"
                lon_out = f"{lon:.8f}"
            else:
                fail += 1

            w.writerow([
                name,
                kakao_address or address or "",
                lat_out,
                lon_out,
                extra.get("preview",""),
                extra.get("url",""),
                extra.get("review_count",""),
                extra.get("naver_score",""),
                extra.get("keywords",""),
            ])

    print(f"완료 → {out_fn}  (성공 {success}, 실패 {fail})")

if __name__ == "__main__":
    main()
