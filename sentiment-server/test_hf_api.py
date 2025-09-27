import os
import requests

HF_TOKEN = os.getenv("HF_TOKEN")  # 환경변수에서 읽기
MODEL_NAME = "nlp04/korean_sentiment_analysis_kcelectra"

url = f"https://api-inference.huggingface.co/models/{MODEL_NAME}"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}
payload = {"inputs": "이 식당은 정말 맛있어요!"}

response = requests.post(url, headers=headers, json=payload)

print("Status Code:", response.status_code)
print("Response:", response.json())
