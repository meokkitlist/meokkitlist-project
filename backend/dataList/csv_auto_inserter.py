import os
import glob
import requests
import time
import pandas as pd

UPLOAD_URL = "https://meokkitlist-project.onrender.com/review/upload-csv"
CSV_DIRECTORY = "./utf8"
LOG_FILE = "uploaded.log"

# 업로드 성공 파일 기록
def mark_uploaded(filename):
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(filename + "\n")

# 이미 업로드한 파일 목록 읽기
def load_uploaded():
    if not os.path.exists(LOG_FILE):
        return set()
    with open(LOG_FILE, "r", encoding="utf-8") as f:
        return set(line.strip() for line in f.readlines())

def preprocess_csv(filepath):
    try:
        df = pd.read_csv(filepath, encoding="utf-8-sig")
        for col in ["review", "리뷰"]:
            if col in df.columns:
                df.rename(columns={col: "text"}, inplace=True)
        if "source" not in df.columns:
            df["source"] = "crawl"
        temp_path = filepath + ".tmp.csv"
        df.to_csv(temp_path, index=False, encoding="utf-8-sig")
        return temp_path
    except Exception as e:
        print(f"⚠️ 전처리 실패: {filepath} | {e}")
        return None

def upload_csv(filepath):
    files = {"file": open(filepath, "rb")}
    try:
        resp = requests.post(UPLOAD_URL, files=files, timeout=300)
        return resp.ok
    except Exception as e:
        print(f"❌ 업로드 오류: {filepath} | {e}")
        return False

if __name__ == "__main__":
    print("🚀 CSV 파일 자동 업로더 시작")
    uploaded = load_uploaded()
    csv_files = glob.glob(os.path.join(CSV_DIRECTORY, "*.csv"))

    for filepath in csv_files:
        filename = os.path.basename(filepath)
        if filename in uploaded:
            print(f"⏩ 건너뜀 (이미 업로드됨): {filename}")
            continue

        print(f"--- 📤 '{filename}' 업로드 시도 ---")
        processed = preprocess_csv(filepath)
        if not processed:
            continue

        if upload_csv(processed):
            print(f"✅ '{filename}' 업로드 성공!")
            mark_uploaded(filename)
        else:
            print(f"❌ '{filename}' 업로드 실패")
        time.sleep(2)
