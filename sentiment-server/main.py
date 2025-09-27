from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from starlette.middleware.cors import CORSMiddleware
import os, requests, time, logging

app = FastAPI(title="Meokkitlist Sentiment API")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 환경변수
HF_MODEL_ID = os.getenv("MODEL_NAME", "beomi/KcELECTRA-base-v2022")
HF_API_URL = f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}"
HF_HEADERS = {"Authorization": f"Bearer {os.getenv('HF_TOKEN','')}"}

# 입력 스키마
class ReviewInput(BaseModel):
    text: str
    restaurant_id: str
    source: str
    user_id: str | None = None

class KeywordInput(BaseModel):
    keyword: str

# 키워드 확장 맵핑
keyword_mapping = {
    "날씨는 맑음": ["날씨", "맑음", "더움", "시원함"],
    "매콤한 맛": ["매운맛", "고추", "얼큰", "불맛"],
    "눈 오는 날": ["눈", "추움", "국물", "따뜻함"],
    "바다 보면서 먹기 좋은": ["바다", "뷰맛집", "해산물", "광안리"],
}

@app.on_event("startup")
def log_routes():
    routes = [f"{','.join(sorted(r.methods))} {r.path}" for r in app.routes if hasattr(r, "methods")]
    logging.warning("🔎 Registered routes:\n" + "\n".join(routes))

@app.get("/")
def root():
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "OK"}

@app.post("/analyze")
def analyze(input: ReviewInput):
    payload = {"inputs": input.text}

    for attempt in range(3):
        try:
            r = requests.post(HF_API_URL, headers=HF_HEADERS, json=payload, timeout=30)

            if r.status_code == 503 and attempt < 2:
                time.sleep(2); continue
            if r.status_code == 429 and attempt < 2:
                time.sleep(5); continue
            if r.status_code != 200:
                raise HTTPException(status_code=r.status_code, detail=r.text)

            data = r.json()
            first = data[0]
            if isinstance(first, list):
                first = first[0]
            label = str(first.get("label", "UNKNOWN"))
            score = float(first.get("score", 0.0))
            emoji = "😊" if label.lower().startswith("pos") else "🙁"

            # ✅ NestJS가 기대하는 필드 구조로 응답
            return {
                "top_label": label,
                "top_prob": score,
                "ui": {
                    "emoji": emoji,
                    "percent": round(score * 100)
                }
            }

        except Exception as e:
            logging.error(f"Sentiment analysis error (attempt {attempt+1}): {e}")
            time.sleep(1)

    raise HTTPException(status_code=500, detail="Failed after 3 retries")

@app.post("/expand_keywords")
def expand_keywords(req: KeywordInput):
    kw = req.keyword.strip()
    return {"keywords": keyword_mapping.get(kw, [kw])}
