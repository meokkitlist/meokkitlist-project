# Dockerfile

FROM python:3.10-slim

# 시스템 패키지 업데이트 및 필수 툴 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 설치
COPY requirements.txt .
RUN pip install --upgrade pip && pip install --no-cache-dir -r requirements.txt

# 전체 앱 복사
COPY . .

# 포트 열기
EXPOSE 10000

# FastAPI 실행
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]
