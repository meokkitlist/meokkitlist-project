from transformers import AutoTokenizer, AutoModelForSequenceClassification

# ✅ 경량 모델 (다국어 지원)
MODEL_NAME = "distilbert-base-multilingual-cased"
SAVE_PATH = "./model/distilbert_model"

print("📦 모델 다운로드 중...")
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

print("💾 모델 저장 중...")
tokenizer.save_pretrained(SAVE_PATH)
model.save_pretrained(SAVE_PATH)

print(f"✅ 완료! 모델이 {SAVE_PATH} 경로에 저장되었습니다.")
