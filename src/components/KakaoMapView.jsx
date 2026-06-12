import React, { useEffect, useRef } from "react";

export const KakaoMapView = ({ startOrigin, targetSpot, routeLinePath }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const polylineRef = useRef(null);
  const markersRef = useRef([]);

  // 🌟 [유령 타일 현상 종결자] DOM 상자가 진짜 화면에 렌더링되는 시점을 감시하는 콜백 레프
  const mapContainerCallback = (node) => {
    if (node !== null) {
      mapContainerRef.current = node;

      // 상자가 확보되자마자 카카오맵 인프라 체크
      if (!window.kakao || !window.kakao.maps) return;

      const startPos = new window.kakao.maps.LatLng(
        Number(startOrigin?.lat || 37.8853),
        Number(startOrigin?.lng || 127.7298),
      );

      // 1. 지도가 없으면 즉시 생성
      if (!mapRef.current) {
        const options = {
          center: startPos,
          level: 7,
        };
        mapRef.current = new window.kakao.maps.Map(node, options);
      }

      // 2. 상자가 열린 순간 카카오 맵 타일 강제 동기화 리사이징!
      const map = mapRef.current;
      map.relayout();

      // 3. 데이터가 있다면 즉시 출발지 -> 1위 목적지 뷰포트 바운즈 정렬
      if (startOrigin && targetSpot && targetSpot.lat && targetSpot.lng) {
        const destPos = new window.kakao.maps.LatLng(
          Number(targetSpot.lat),
          Number(targetSpot.lng),
        );

        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(startPos);
        bounds.extend(destPos);

        // 렌더링 틱을 나누어 안전하게 스케일 매핑
        setTimeout(() => {
          map.relayout();
          map.setBounds(bounds);
        }, 50);
      } else {
        map.setCenter(startPos);
      }
    }
  };

  // ❷ [데이터가 동적으로 변경될 때 마커와 선을 그려주는 실시간 스트림]
  useEffect(() => {
    if (!mapRef.current || !startOrigin) return;

    const map = mapRef.current;
    map.relayout();

    // 기존 찌꺼기 완벽 플러시(Flush)
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    const startPos = new window.kakao.maps.LatLng(
      Number(startOrigin.lat),
      Number(startOrigin.lng),
    );
    const startMarker = new window.kakao.maps.Marker({
      position: startPos,
      map: map,
    });
    markersRef.current.push(startMarker);

    if (!targetSpot || !targetSpot.lat || !targetSpot.lng) {
      map.setCenter(startPos);
      return;
    }

    const destPos = new window.kakao.maps.LatLng(
      Number(targetSpot.lat),
      Number(targetSpot.lng),
    );
    const destMarker = new window.kakao.maps.Marker({
      position: destPos,
      map: map,
    });
    markersRef.current.push(destMarker);

    // 카카오 실도로 Polyline 패스선 드로잉
    if (routeLinePath && routeLinePath.length > 0) {
      const linePath = routeLinePath.map(
        (pt) => new window.kakao.maps.LatLng(Number(pt.lat), Number(pt.lng)),
      );

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

    // 🎯 [Auto Bounds] 출발지와 1위 목적지를 감싸는 최적의 줌 배율 정렬 보정
    setTimeout(() => {
      map.relayout();
      const bounds = new window.kakao.maps.LatLngBounds();
      bounds.extend(startPos);
      bounds.extend(destPos);
      map.setBounds(bounds);
    }, 100);
  }, [startOrigin, targetSpot, routeLinePath]);

  return (
    <div
      ref={mapContainerCallback} // 🌟 일반 ref 대신 런타임 콜백 레프로 교체하여 0px 버그 원천 봉쇄
      className="w-full h-full relative"
      style={{ minHeight: "100%", height: "100%", minWidth: "100%" }}
    />
  );
};
