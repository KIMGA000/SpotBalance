import React, { useEffect, useRef } from "react";

export const KakaoMapView = ({ startOrigin, targetSpot }) => {
  const mapContainer = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    // 카카오 객체 검증
    if (!window.kakao || !window.kakao.maps || !mapContainer.current) return;

    // 1. 지도 초기화 (기본 중심: 출발지 좌표)
    const startPos = new window.kakao.maps.LatLng(
      Number(startOrigin.lat),
      Number(startOrigin.lng),
    );
    const options = {
      center: startPos,
      level: 7,
    };
    const map = new window.kakao.maps.Map(mapContainer.current, options);

    // 2. 마커 및 경로 갱신 함수
    const updateMapRoute = () => {
      // 기존 마커 및 선 초기화
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      if (!targetSpot) return;

      const destPos = new window.kakao.maps.LatLng(
        Number(targetSpot.lat),
        Number(targetSpot.lng),
      );

      // [출발지 마커 생성]
      const startMarker = new window.kakao.maps.Marker({
        position: startPos,
        map: map,
      });
      // [목적지 마커 생성]
      const destMarker = new window.kakao.maps.Marker({
        position: destPos,
        map: map,
      });

      markersRef.current = [startMarker, destMarker];

      // 🌟 [핵심] 카카오가 준 pathVertexes 데이터를 가져와 지도에 도로 실선 그리기
      if (targetSpot.pathVertexes && targetSpot.pathVertexes.length > 0) {
        const linePath = [];
        const vertexes = targetSpot.pathVertexes;

        for (let i = 0; i < vertexes.length; i += 2) {
          const lng = vertexes[i];
          const lat = vertexes[i + 1];
          linePath.push(new window.kakao.maps.LatLng(lat, lng));
        }

        // SpotBalance 시그니처 보라색 테마 경로선 설정
        const polyline = new window.kakao.maps.Polyline({
          path: linePath,
          strokeWeight: 6,
          strokeColor: "#6B5FD8",
          strokeOpacity: 0.85,
          strokeStyle: "solid",
        });

        polyline.setMap(map);
        polylineRef.current = polyline;

        // 화면 줌 레벨 조정: 출발지와 목적지가 한눈에 꽉 차도록 세팅!
        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(startPos);
        bounds.extend(destPos);
        map.setBounds(bounds);
      }
    };

    updateMapRoute();
  }, [startOrigin, targetSpot]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full"
      style={{ minHeight: "500px" }}
    />
  );
};
