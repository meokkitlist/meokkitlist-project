import fs from "fs";
import path from "path";
import fetch from "node-fetch";
import FormData from "form-data";

const UPLOAD_DIR = path.resolve("./dataList/utf8"); // CSV 폴더 경로
const API_URL = "https://meokkitlist-project.onrender.com/review/upload-csv";

async function uploadCsv(filePath) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      body: form,
    });

    const json = await res.json();
    console.log(`✅ ${path.basename(filePath)} →`, json);
  } catch (err) {
    console.error(`❌ ${path.basename(filePath)} 실패:`, err.message);
  }
}

async function main() {
  const files = fs.readdirSync(UPLOAD_DIR).filter((f) => f.endsWith(".csv"));
  console.log(`📂 총 ${files.length}개 파일 업로드 시작`);

  for (const file of files) {
    const filePath = path.join(UPLOAD_DIR, file);
    await uploadCsv(filePath);
    await new Promise((r) => setTimeout(r, 2000)); // 2초 딜레이 (서버 부하 방지)
  }

  console.log("🚀 모든 업로드 완료");
}

main();
