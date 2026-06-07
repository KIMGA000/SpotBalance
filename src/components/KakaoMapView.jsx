import React, { useEffect, useRef } from "react";

export const KakaoMapView = ({ startOrigin, targetSpot }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!window.kakao || !window.kakao.maps || !mapContainer.current) return;

    window.kakao.maps.load(() => {
      const startPos = new window.kakao.maps.LatLng(
        Number(startOrigin.lat),
        Number(startOrigin.lng),
      );

      if (!mapRef.current) {
        const options = {
          center: startPos,
          level: 7,
        };
        mapRef.current = new window.kakao.maps.Map(
          mapContainer.current,
          options,
        );
      }

      const map = mapRef.current;

      // 지도가 화면에 뜬 직후, 레이아웃 크기를 강제로 리프레시합니다.
      map.relayout();

      // 기존 리소스 청소
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }

      if (!targetSpot) {
        map.setCenter(startPos);
        return;
      }

      const destPos = new window.kakao.maps.LatLng(
        Number(targetSpot.lat),
        Number(targetSpot.lng),
      );

      const startMarker = new window.kakao.maps.Marker({
        position: startPos,
        map: map,
      });
      const destMarker = new window.kakao.maps.Marker({
        position: destPos,
        map: map,
      });
      markersRef.current = [startMarker, destMarker];

      // 브라우저 렌더링 스택(0.1초) 뒤에 안전하게 바운즈를 잡아서
      // 처음 진입했을 때 대한민국 전체가 나오는 버그를 완벽하게 가드합니다!
      setTimeout(() => {
        map.relayout(); // 화면 배율 리사이징 동기화 확인

        if (targetSpot.pathVertexes && targetSpot.pathVertexes.length > 0) {
          const linePath = [];
          const vertexes = targetSpot.pathVertexes;

          for (let i = 0; i < vertexes.length; i += 2) {
            linePath.push(
              new window.kakao.maps.LatLng(vertexes[i + 1], vertexes[i]),
            );
          }

          const polyline = new window.kakao.maps.Polyline({
            path: linePath,
            strokeWeight: 6,
            strokeColor: "#6B5FD8",
            strokeOpacity: 0.85,
            strokeStyle: "solid",
          });

          polyline.setMap(map);
          polylineRef.current = polyline;
        }

        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(startPos);
        bounds.extend(destPos);
        map.setBounds(bounds);
      }, 150); // 0.15초의 안전 여유 버퍼를 둡니다.
    });
  }, [startOrigin, targetSpot]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-full relative"
      style={{ minHeight: "100%", height: "100%" }}
    />
  );
};
