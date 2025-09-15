import React, { useEffect, useState } from 'react';
import axios from 'axios';

declare global {
  interface Window {
    kakao: any;
  }
}

interface Place {
  name: string;
  address: string;
  x: string;
  y: string;
  category: string;
  phone: string;
  url: string;
}

const KakaoMap = () => {
  const [map, setMap] = useState<any>(null);
  const [keyword, setKeyword] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [review, setReview] = useState('');
  const [analysisResult, setAnalysisResult] = useState<null | {
    sentiment: string;
    score: number;
  }>(null);

  useEffect(() => {
    const scriptId = 'kakao-map-sdk';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src =
      'https://dapi.kakao.com/v2/maps/sdk.js?appkey=8f4f69bfafdb1980ba9b75e225d06193&autoload=false&libraries=services';
    script.async = true;

    script.onload = () => {
      if (!window.kakao || !window.kakao.maps) {
        console.error('❌ Kakao maps not loaded');
        return;
      }

      window.kakao.maps.load(() => {
        const container = document.getElementById('map');
        if (!container) return;

        const mapInstance = new window.kakao.maps.Map(container, {
          center: new window.kakao.maps.LatLng(37.5665, 126.978),
          level: 3,
        });

        setMap(mapInstance);

        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const lat = position.coords.latitude;
              const lng = position.coords.longitude;
              setCoords({ lat, lng });

              const userPosition = new window.kakao.maps.LatLng(lat, lng);
              mapInstance.setCenter(userPosition);

              new window.kakao.maps.Marker({
                position: userPosition,
                map: mapInstance,
              });
            },
            (err) => {
              console.warn('❌ 위치 정보를 가져올 수 없음', err);
            }
          );
        }
      });
    };

    document.head.appendChild(script);
  }, []);

  const handleSearch = async () => {
    if (!coords || !keyword) return;

    try {
      const res = await axios.get('http://localhost:5000/search', {
        params: {
          query: keyword,
          lat: coords.lat,
          lng: coords.lng,
          radius: 1000,
        },
      });

      const result: Place[] = res.data;
      setPlaces(result);

      if (!map) return;

      const bounds = new window.kakao.maps.LatLngBounds();

      result.forEach((place) => {
        const latLng = new window.kakao.maps.LatLng(place.y, place.x);
        const marker = new window.kakao.maps.Marker({
          map,
          position: latLng,
          title: place.name,
        });

        const infowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px; font-size:14px;">${place.name}</div>`,
        });

        window.kakao.maps.event.addListener(marker, 'mouseover', () => {
          infowindow.open(map, marker);
        });

        window.kakao.maps.event.addListener(marker, 'mouseout', () => {
          infowindow.close();
        });

        bounds.extend(latLng);
      });

      map.setBounds(bounds);
    } catch (err) {
      console.error('❌ 검색 실패:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!review.trim()) return;

    try {
      const res = await axios.post('http://localhost:5000/search/analyze-review', {
        text: review,
      });

      setAnalysisResult(res.data);
    } catch (err) {
      console.error('❌ 감성 분석 요청 실패:', err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center px-4">
      {/* 검색 UI */}
      <div className="mt-6 mb-4 flex gap-2">
        <input
          type="text"
          placeholder="검색어 입력 (예: 삼겹살)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="border px-4 py-2 rounded-md w-80 shadow"
        />
        <button
          onClick={handleSearch}
          className="bg-yellow-500 text-white px-4 py-2 rounded-md shadow"
        >
          검색
        </button>
      </div>

      {/* 지도 영역 */}
      <div
        id="map"
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '10px',
          backgroundColor: '#f0f0f0',
        }}
      />

      {/* 감성 분석 UI */}
      <div className="w-full max-w-2xl mt-8 p-4 bg-gray-100 rounded shadow">
        <h2 className="text-lg font-semibold mb-2">📝 후기 작성 및 감성 분석</h2>
        <textarea
          placeholder="후기를 입력하세요 (예: 고기가 부드럽고 직원도 친절했어요)"
          className="w-full h-28 p-2 border rounded resize-none"
          value={review}
          onChange={(e) => setReview(e.target.value)}
        />
        <button
          onClick={handleAnalyze}
          className="mt-2 bg-green-600 text-white px-4 py-2 rounded"
        >
          분석하기
        </button>

        {analysisResult && (
          <div className="mt-4">
            <p className="font-semibold">📊 분석 결과:</p>
            <p>
              감정:{' '}
              <span className="font-bold">
                {analysisResult.sentiment === 'Very Positive'
                  ? '🥰 매우 긍정적'
                  : analysisResult.sentiment === 'Positive'
                  ? '😊 긍정적'
                  : analysisResult.sentiment === 'Neutral'
                  ? '😐 중립적'
                  : analysisResult.sentiment === 'Negative'
                  ? '😕 부정적'
                  : analysisResult.sentiment === 'Very Negative'
                  ? '😡 매우 부정적'
                  : analysisResult.sentiment}
              </span>
            </p>
            <p>
              점수: <span className="font-bold">{analysisResult.score}점</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KakaoMap;
