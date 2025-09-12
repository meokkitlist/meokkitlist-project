import pandas as pd
from datetime import datetime
import time
import csv
import re
import os
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, ElementNotInteractableException


def clean_review_text(text):
    """
    리뷰 텍스트에서 줄바꿈, '접기' 단어, 불필요한 공백을 제거합니다.
    """
    cleaned_text = text.replace('\n', ' ').replace('접기', '')
    return " ".join(cleaned_text.split())


def clean_filename(filename):
    """
    파일 이름으로 사용할 수 없는 특수문자를 제거합니다.
    """
    return re.sub(r'[\\/*?:"<>|]', "", filename)


def get_naver_place_reviews(url):
    """
    주어진 네이버 지도 URL에서 리뷰 텍스트를 추출합니다.
    """
    print(f"URL 수집을 시작합니다: {url}")

    options = Options()
    options.add_argument("window-size=1920,1080")
    options.add_argument("--headless")  # 백그라운드에서 실행
    options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--log-level=3")  # 콘솔 로그 억제

    service = Service()
    driver = webdriver.Chrome(service=service, options=options)

    final_result = {"reviews": []}

    try:
        driver.get(url)

        # entryIframe으로 전환
        WebDriverWait(driver, 20).until(
            EC.frame_to_be_available_and_switch_to_it((By.ID, "entryIframe"))
        )

        # 리뷰 탭 클릭
        review_tab = WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.XPATH, "//a[@role='tab'][.//span[contains(text(), '리뷰')]]"))
        )
        driver.execute_script("arguments[0].click();", review_tab)
        time.sleep(2)

        # '더보기' 버튼을 눌러 모든 리뷰 로드
        for _ in range(10):  # 최대 10번 시도
            try:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1.5)
                more_button = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, 'a.fvwqf'))
                )
                driver.execute_script("arguments[0].click();", more_button)
            except TimeoutException:
                print("더 이상 '더보기' 버튼이 없습니다.")
                break

        # 개별 리뷰 '더보기' 펼치기
        try:
            expand_buttons = driver.find_elements(By.CSS_SELECTOR, 'a.pui__wFzIYl')
            if expand_buttons:
                print(f"{len(expand_buttons)}개의 긴 리뷰를 펼칩니다.")
                for button in expand_buttons:
                    try:
                        driver.execute_script("arguments[0].click();", button)
                        time.sleep(0.1)
                    except ElementNotInteractableException:
                        pass
        except Exception:
            pass

        time.sleep(2)

        # 최종 리뷰 텍스트 수집
        review_containers = driver.find_elements(By.CSS_SELECTOR, 'div.pui__vn15t2')
        review_texts = [
            container.text for container in review_containers
            if container.text and "거리뷰" not in container.text
        ]

        final_result["reviews"] = review_texts
        return final_result

    except TimeoutException:
        print("오류: 페이지의 특정 요소를 로드하는 데 시간이 너무 오래 걸렸습니다.")
        return final_result
    except Exception as e:
        print(f"알 수 없는 오류가 발생했습니다: {e}")
        return final_result
    finally:
        driver.quit()


# --- 메인 실행 로직 ---
if __name__ == "__main__":
    input_csv_path = "부산대_맛집_list.csv"

    if not os.path.exists(input_csv_path):
        print(f"오류: '{input_csv_path}' 파일을 찾을 수 없습니다. 스크립트와 같은 폴더에 있는지 확인해주세요.")
    else:
        df = pd.read_csv(input_csv_path)
        for index, row in df.iterrows():
            store_name = row['storeName']
            target_url = row['url']

            print(f"\n{'=' * 50}\n[{store_name}] 가게의 리뷰 수집을 시작합니다...\n{'=' * 50}")

            review_data = get_naver_place_reviews(target_url)
            reviews_list = review_data.get("reviews", [])

            if not reviews_list:
                print(f"\n[{store_name}] 가게에서 수집된 리뷰가 없습니다.")
                continue

            today_date = datetime.now().strftime("%Y-%m-%d")
            cleaned_store_name = clean_filename(store_name)
            file_name = f"리뷰_{cleaned_store_name}_{today_date}.csv"

            print(f"\n총 {len(reviews_list)}개의 리뷰를 찾았습니다. '{file_name}' 파일로 저장합니다...")

            with open(file_name, 'w', newline='', encoding='utf-8-sig') as f:
                csv_writer = csv.writer(f)
                csv_writer.writerow(['review'])
                for text in reviews_list:
                    cleaned_text = clean_review_text(text)
                    if cleaned_text:
                        csv_writer.writerow([cleaned_text])

            print(f"[{store_name}] 가게의 리뷰를 성공적으로 저장했습니다.")

        print("\n모든 가게의 리뷰 수집 작업이 완료되었습니다.")