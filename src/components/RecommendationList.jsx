import React, { useState, useEffect } from "react";
import { getSpotRecommendations } from "./spotRecommender";

export default function RecommendationList({
  userInput,
  allSpots,
  weatherGuardResult,
}) {
  const [recommendations, setRecommendations] = useState([]);
  const [sortByDistance, setSortByDistance] = useState(false); // 거리 토글 스위치

  useEffect(() => {
    // 1. 알고리즘 가동하여 점수 리스트 확보
    const result = getSpotRecommendations(
      userInput,
      allSpots,
      weatherGuardResult,
    );

    // 2. 가영님 핵심 오더: 추천 결과는 최소 3개에서 최대 10개로 컷팅!
    const slicedResult = result.slice(0, 10);
    setRecommendations(slicedResult);
  }, [userInput, allSpots, weatherGuardResult]);

  // 3. 거리순 / 추천점수순 토글에 따른 데이터 실시간 정렬 제어
  const sortedDisplayList = [...recommendations].sort((a, b) => {
    if (sortByDistance) {
      return a.calculatedRoadDist - b.calculatedRoadDist; // 가까운 도로 거리 순
    }
    return b.spotScore - a.spotScore; // 추천 최종 점수 순
  });

  if (sortedDisplayList.length < 3) {
    return (
      <p>
        ⚠️ 조건에 맞는 관광지가 최소 3개 미만입니다. 희망 이동 시간이나
        카테고리를 넓혀보세요!
      </p>
    );
  }

  return (
    <div className="recommendation-container">
      {/* 🌟 상단 가까운 순 보기 변환 토글 */}
      <div className="toggle-bar">
        <label>
          <input
            type="checkbox"
            checked={sortByDistance}
            onChange={(e) => setSortByDistance(e.target.checked)}
          />
          📍 가까운 거리 순으로 보기
        </label>
      </div>

      {/* 추천 리스트 출력 */}
      <div className="card-grid">
        {sortedDisplayList.map((spot, index) => (
          <div key={spot.id} className="spot-card">
            <h3>
              [{index + 1}위] {spot.title}
            </h3>
            <p>🏆 최종 매칭 점수: {spot.spotScore}점</p>
            <p>
              🚗 예상 도로 소요 시간: 약 {Math.round(spot.calculatedTime)}분
            </p>
            <p>🛣️ 예상 실도로 거리: {spot.calculatedRoadDist.toFixed(1)} km</p>
            <p>👥 현재 혼잡 추이율: {spot.congestion_rate}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
