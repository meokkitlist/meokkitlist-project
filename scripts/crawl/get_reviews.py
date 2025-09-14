import csv
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException, TimeoutException, StaleElementReferenceException


class MapListDTO:
    # DTO to hold store information
    def __init__(self, id, storeName, category, url):
        self.id = id
        self.storeName = storeName
        self.category = category
        self.url = url


class MapCroller:
    def __init__(self):
        self.driver = None
        self._init_driver()

    def _init_driver(self):
        options = Options()
        options.add_argument('--start-maximized')
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36")

        self.driver = webdriver.Chrome(options=options)
        self.driver.execute_cdp_cmd(
            "Page.addScriptToEvaluateOnNewDocument",
            {
                "source": """
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined
                    });
                """
            },
        )

    def map_data_scroll(self, location_name):
        url = f"https://map.naver.com/p/search/{location_name}"
        print(f"[URL] {url}")
        self.driver.get(url)

        try:
            WebDriverWait(self.driver, 10).until(
                EC.frame_to_be_available_and_switch_to_it((By.ID, "searchIframe"))
            )
        except Exception as e:
            print(f"iframe을 찾지 못했습니다: {e}")
            return []

        all_results = []
        current_page = 1

        while True:
            print(f"\n--- 페이지 {current_page} 수집 시작 ---")
            scroll_container = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.ID, "_pcmap_list_scroll_container"))
            )

            last_height = 0
            while True:
                self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", scroll_container)
                time.sleep(1.5)
                new_height = self.driver.execute_script("return arguments[0].scrollHeight", scroll_container)
                if new_height == last_height:
                    print("페이지 내 모든 가게 로딩 완료.")
                    break
                last_height = new_height

            # --- URL 추출을 위한 클릭 및 복귀 로직 시작 ---
            item_count = len(self.driver.find_elements(By.CSS_SELECTOR, "#_pcmap_list_scroll_container > ul > li"))
            print(f"현재 페이지에서 {item_count}개의 가게를 찾았습니다.")

            for i in range(item_count):
                try:
                    # StaleElementReferenceException 방지를 위해 매번 목록을 다시 찾음
                    all_items_in_page = self.driver.find_elements(By.CSS_SELECTOR,
                                                                  "#_pcmap_list_scroll_container > ul > li")

                    if i >= len(all_items_in_page):
                        continue

                    current_item = all_items_in_page[i]

                    # 스크롤하여 요소를 클릭 가능하게 만듦
                    self.driver.execute_script("arguments[0].scrollIntoView({ block: 'center' });", current_item)
                    time.sleep(0.5)

                    # 가게 이름과 카테고리 미리 추출
                    store_name = current_item.find_element(By.CSS_SELECTOR, "span.TYaxT").text
                    category = current_item.find_element(By.CSS_SELECTOR, "span.KCMnt").text

                    # 가게 이름이 포함된 링크 클릭
                    link_to_click = current_item.find_element(By.CSS_SELECTOR, "span.TYaxT")
                    print(f"[{len(all_results) + 1}] 처리 중: {store_name}")
                    self.driver.execute_script("arguments[0].click();", link_to_click)

                    # URL이 변경될 때까지 대기 후 수집
                    place_url = ""
                    self.driver.switch_to.default_content()
                    time.sleep(2)
                    WebDriverWait(self.driver, 100).until(lambda driver: "/place/" in driver.current_url)
                    place_url = self.driver.current_url

                    # 목록으로 돌아가기
                    self.driver.back()

                    # iframe으로 다시 전환
                    WebDriverWait(self.driver, 15).until(
                        EC.frame_to_be_available_and_switch_to_it((By.ID, "searchIframe"))
                    )
                    # 다음 항목 처리를 위해 목록이 다시 로드될 때까지 대기
                    WebDriverWait(self.driver, 10).until(
                        EC.presence_of_element_located((By.ID, "_pcmap_list_scroll_container"))
                    )

                    dto = MapListDTO(id=len(all_results) + 1, storeName=store_name, category=category, url=place_url)
                    all_results.append(dto)

                except StaleElementReferenceException:
                    print(f"  > StaleElement 에러 발생. 다음 항목으로 넘어갑니다.")
                    continue
                except TimeoutException:
                    print(f"  > '{store_name}' 처리 중 시간 초과. 다음 항목으로 넘어갑니다.")
                    self.driver.back()  # 에러 발생 시 목록으로 복귀 시도
                    WebDriverWait(self.driver, 15).until(
                        EC.frame_to_be_available_and_switch_to_it((By.ID, "searchIframe")))
                    continue
                except Exception as e:
                    print(f"  > 알 수 없는 오류 발생: {e}")
                    continue

            # --- 페이지네이션 처리 ---
            try:
                pagination_container = self.driver.find_element(By.CSS_SELECTOR, "div.zRM9F")
                next_page_button = pagination_container.find_element(By.XPATH, ".//a[span[text()='다음페이지']]")
                if next_page_button.get_attribute('aria-disabled') == 'true':
                    print("마지막 페이지입니다. 크롤링을 종료합니다.")
                    break
                else:
                    self.driver.execute_script("arguments[0].click();", next_page_button)
                    current_page += 1
                    time.sleep(2)  # 다음 페이지 로딩 대기
            except NoSuchElementException:
                print("페이지네이션을 찾을 수 없거나 마지막 페이지입니다. 크롤링을 종료합니다.")
                break

        return all_results


if __name__ == "__main__":
    location_name = "부산대 맛집"
    map_croller = MapCroller()

    all_store_data = []
    try:
        all_store_data = map_croller.map_data_scroll(location_name)

        if not all_store_data:
            print("\n수집된 데이터가 없습니다.")
        else:
            file_name = f"{location_name.replace(' ', '_')}_list.csv"
            print(f"\n총 {len(all_store_data)}개의 데이터를 '{file_name}' 파일로 저장합니다.")

            with open(file_name, 'w', newline='', encoding='utf-8-sig') as f:
                csv_writer = csv.writer(f)
                csv_writer.writerow(['id', 'storeName', 'category', 'url'])

                for store_dto in all_store_data:
                    csv_writer.writerow([
                        store_dto.id,
                        store_dto.storeName,
                        store_dto.category,
                        store_dto.url
                    ])
            print("저장 완료!")

    finally:
        if map_croller.driver:
            map_croller.driver.quit()

