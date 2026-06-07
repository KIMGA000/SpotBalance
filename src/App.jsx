import React, { useState, useMemo, useEffect, useRef } from "react";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Snowflake,
  Info,
  RefreshCw,
  Plus,
  Minus,
  Map,
  ArrowLeft,
  List,
  Sparkles,
} from "lucide-react";

import {
  MountainSilhouette,
  SailboatSilhouette,
  NatureSilhouette,
  TwinklingStars,
} from "./components/VisualElements";

import {
  CalendarPicker,
  SelectItem,
  OriginSearchPicker,
  MultiTastePicker,
} from "./components/FormControls";
import { RecommendationCard } from "./components/RecommendationCard";
import { ServiceIntro } from "./components/ServiceIntro";
import { getVilageFcstBaseTime } from "./utils/weatherTimeCalculator";
import { KakaoMapView } from "./components/KakaoMapView";
// ==========================================
// 1. Supabase 초기화 설정
// ==========================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 데이터베이스 실제 라벨 규칙 명세 완전 동기화
const MAIN_LABEL_MAP = {
  nature: "자연관광",
  history: "역사관광",
  culture: "문화관광",
  activity: "체험관광",
};

const TASTE_DATA_CONFIG = {
  nature: ["바다", "산", "계곡", "자연휴양림", "생태관광", "자연공원"],
  history: ["종교성지", "역사유적지", "문화재"],
  culture: ["관광단지", "전시시설", "문화공원", "자연명소"],
  activity: ["레저", "웰니스", "생태", "동물원", "만들기"],
};

// ==========================================
// 🌤️ 실시간 날씨 전광판 컴포넌트
// ==========================================
function HeaderWeather({ weather }) {
  if (!weather || !weather.text) return null;

  const renderWeatherIcon = () => {
    const text = weather.text;
    if (text.includes("맑음"))
      return <Sun size={22} strokeWidth={2.5} className="text-[#F4C84A]" />;
    if (text.includes("구름"))
      return (
        <CloudSun size={22} strokeWidth={2.5} className="text-[#F4C84A]" />
      );
    if (text.includes("흐림"))
      return <Cloud size={22} strokeWidth={2.5} className="text-[#A5CDEC]" />;
    if (text.includes("비"))
      return (
        <CloudRain size={22} strokeWidth={2.5} className="text-[#6B5FD8]" />
      );
    if (text.includes("눈"))
      return (
        <Snowflake size={22} strokeWidth={2.5} className="text-[#7FB5E8]" />
      );
    return <Sun size={22} strokeWidth={2.5} className="text-[#F4C84A]" />;
  };

  return (
    <div className="hidden sm:flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-[#6B5FD8]/10 px-4 py-2 rounded-full shadow-sm">
      <span className="text-[11px] text-[#8884A8] sb-font-h uppercase tracking-widest border-r border-gray-200 pr-2">
        강원도
      </span>
      <span className="text-[14px] text-[#2D2A4A] sb-font-h whitespace-nowrap font-bold">
        {weather.text} {weather.temp}°
      </span>
      <div className="flex items-center justify-center">
        {renderWeatherIcon()}
      </div>
    </div>
  );
}

// ==========================================
// 🚀 메인 App 컴포넌트 시작
// ==========================================
function App() {
  const [activeScreen, setActiveScreen] = useState("screen-start");
  const [visibleCount, setVisibleCount] = useState(3);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(0);

  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [gangwonWeather, setGangwonWeather] = useState({
    text: "맑음",
    temp: 22,
    icon: "cloud-sun",
  });

  const ageOptions = [
    "10대",
    "20대",
    "30대",
    "40대",
    "50대",
    "60대",
    "70대 이상",
  ];
  const genderOptions = ["여성", "남성"];
  const travelTimeOptions = [
    "1시간 이내",
    "2시간 이내",
    "3시간 이내",
    "5시간 이내",
  ];

  const dateOptions = useMemo(() => {
    const opt = [];
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      opt.push(
        `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, "0")}. ${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`,
      );
    }
    return opt;
  }, []);

  const [origin, setOrigin] = useState("서울 성동구");
  const [selectedOrigin, setSelectedOrigin] = useState({
    name: "서울 성동구",
    address: "서울특별시 성동구",
    lat: 37.5665,
    lng: 126.978,
  });

  const [travelDate, setTravelDate] = useState(dateOptions[0]);
  const [age, setAge] = useState("20대");
  const [gender, setGender] = useState("여성");
  const [travelTime, setTravelTime] = useState("3시간 이내");
  const [selectedStyles, setSelectedStyles] = useState([]);

  // Supabase 실시간 날씨 연동
  useEffect(() => {
    const initializeAppServices = async () => {
      try {
        const { data: weatherData, error: weatherError } = await supabase
          .from("current_weather")
          .select("weather_text, temp")
          .eq("id", 1)
          .single();

        if (!weatherError && weatherData) {
          setGangwonWeather({
            text: weatherData.weather_text || "맑음",
            temp: weatherData.temp || 22,
            icon: "cloud-sun",
          });
        }

        const kakaoMapApiKey = import.meta.env.VITE_KAKAO_MAP_KEY;

        if (kakaoMapApiKey) {
          if (document.getElementById("kakao-map-script")) {
            console.log("🗺️ 카카오맵 스크립트가 이미 로드되어 있습니다.");
            return;
          }

          const script = document.createElement("script");
          script.id = "kakao-map-script";
          script.async = true;
          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapApiKey}&libraries=services&autoload=false`;
          script.onload = () => {
            window.kakao.maps.load(() => {
              console.log("🗺️ 카카오맵 구동 완료! (.env 로드 성공)");
            });
          };
          document.head.appendChild(script);
        } else {
          console.warn(
            "⚠️ VITE_KAKAO_MAP_KEY가 .env 파일에 정의되지 않았습니다.",
          );
        }
      } catch (error) {
        console.error("인프라 초기화 실패:", error);
      }
    };
    initializeAppServices();
  }, []);

  // 대분류 배열(text[]) 검사 후 중분류 정밀 매칭
  const handleGetRecommendations = async () => {
    console.log("=========================================");
    console.log("🚀 SpotBalance 하버사인 연산 엔진 가동");
    console.log("출발지 좌표:", selectedOrigin?.lat, ",", selectedOrigin?.lng);
    console.log("여행 날짜:", travelDate);
    console.log("선택 시간:", travelTime);
    console.log("=========================================");

    document.body.style.overflow = "unset";
    if (selectedStyles.length === 0) {
      alert(
        "더 정확한 맞춤 추천을 위해 취향 설정을 최소 1개 이상 선택해 주세요! 😉",
      );
      return;
    }

    setIsLoading(true);

    const match = travelDate.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})/);
    const queryDate = match
      ? `${match[1]}-${match[2]}-${match[3]}`
      : new Date().toISOString().split("T")[0];
    const WEEK_DAYS = [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ];

    // 대분류 국문 꼬리표 식별
    const targetMainLabels = [];
    Object.keys(TASTE_DATA_CONFIG).forEach((mainKey) => {
      const subsInMain = TASTE_DATA_CONFIG[mainKey];
      const hasSelectedSub = selectedStyles.some((style) =>
        subsInMain.includes(style),
      );
      if (hasSelectedSub && MAIN_LABEL_MAP[mainKey]) {
        targetMainLabels.push(MAIN_LABEL_MAP[mainKey]);
      }
    });

    try {
      // 🌟 Supabase에서 데이터 호출
      const { data, error } = await supabase.from("spots").select(`
          id, spot_name, spot_description, address, image_url, is_always_open,
          open_time, close_time, last_entry_time, is_no_holiday, rest_weekly_days, 
          category_main, category_mid, category_sub, lat, lng,
          spot_visitor_trends (visitor_count, target_date)
        `);

      if (error) throw error;
      if (!data || data.length === 0) {
        alert("관광지 데이터를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      // 하버사인 공식 계산 함수
      const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371;
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * (Math.PI / 180)) *
            Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      const dateObj = new Date(queryDate);
      const dayOfWeek = dateObj.getDay();
      const formattedTravelDate = queryDate.substring(5, 10);

      const publicHolidays = [
        "01-01",
        "02-16",
        "02-17",
        "02-18",
        "03-01",
        "03-02",
        "05-05",
        "05-06",
        "06-06",
        "08-15",
        "08-17",
        "09-24",
        "09-25",
        "09-26",
        "10-03",
        "10-05",
        "10-09",
        "12-25",
      ];

      const isWeekendOrHoliday =
        dayOfWeek === 0 ||
        dayOfWeek === 5 ||
        dayOfWeek === 6 ||
        publicHolidays.includes(formattedTravelDate);

      const currentSpeed = isWeekendOrHoliday ? 60 : 80;
      const maxHours = parseFloat(travelTime.replace(/[^0-9.]/g, ""));
      const maxAllowedDistance = maxHours * currentSpeed;

      console.log("-----------------------------------------");
      console.log(
        `⏱️ 적용 시속: ${currentSpeed}km/h | 선택 시간: ${maxHours}시간`,
      );
      console.log(
        `🎯 [필터 컷트라인] 출발지로부터 딱 '${maxAllowedDistance.toFixed(1)}km' 이내인 관광지만 합격시킵니다!`,
      );
      console.log("-----------------------------------------");

      const filteredResults = [];

      // 1차전: 대/중분류 매칭 및 하버사인 반경 필터링 수행
      data.forEach((spot) => {
        const trendData = spot.spot_visitor_trends?.find(
          (t) => t.target_date === queryDate,
        );
        const rawVisitorRate = trendData
          ? trendData.visitor_count
          : Math.floor(Math.random() * 30) + 5;
        const congestionScore = Math.min(100, Math.round(rawVisitorRate * 1.5));

        const spotMains = Array.isArray(spot.category_main)
          ? spot.category_main
          : [spot.category_main].filter(Boolean);
        const spotMids = Array.isArray(spot.category_mid)
          ? spot.category_mid
          : [spot.category_mid].filter(Boolean);

        const isMainMatched = spotMains.some((mainVal) =>
          targetMainLabels.includes(mainVal),
        );

        if (isMainMatched) {
          let matchedSubCount = 0;
          selectedStyles.forEach((style) => {
            if (spotMids.includes(style)) matchedSubCount++;
          });

          if (matchedSubCount > 0) {
            if (
              !spot.lat ||
              !spot.lng ||
              !selectedOrigin?.lat ||
              !selectedOrigin?.lng
            )
              return;

            const distanceKm = getHaversineDistance(
              Number(selectedOrigin.lat),
              Number(selectedOrigin.lng),
              Number(spot.lat),
              Number(spot.lng),
            );

            const estimatedTime = distanceKm / currentSpeed;

            // 하버사인 반경 이내에 드는 1차 합격자만 모으기
            if (estimatedTime <= maxHours) {
              const suitabilityScore = 75 + matchedSubCount * 8;
              const finalScore = Math.round(
                (suitabilityScore + (100 - congestionScore)) / 2,
              );

              let formattedHours = "상시 개방";
              if (!spot.is_always_open && spot.open_time && spot.close_time) {
                formattedHours = `${spot.open_time.substring(0, 5)}~${spot.close_time.substring(0, 5)}`;
              }

              let formattedClosed = "연중무휴";
              if (
                !spot.is_no_holiday &&
                spot.rest_weekly_days &&
                spot.rest_weekly_days.length > 0
              ) {
                formattedClosed = `매주 ${spot.rest_weekly_days.map((d) => WEEK_DAYS[d]).join(", ")}`;
              }

              filteredResults.push({
                name: spot.spot_name || "강원도 맞춤 명소",
                subtitle:
                  spot.spot_description ||
                  "낭만과 데이터가 가득한 강원도 추천 플레이스",
                score: Math.min(99, finalScore),
                congestion: congestionScore,
                suitability: Math.min(100, suitabilityScore),
                hours: formattedHours,
                closed: formattedClosed,
                address: spot.address || "강원특별자치도",
                weather: gangwonWeather.text,
                icon: gangwonWeather.icon,
                image: spot.image_url,
                lat: spot.lat,
                lng: spot.lng,
                distance: distanceKm.toFixed(1),
                duration: estimatedTime.toFixed(1),
              });
            }
          }
        }
      });

      // ❌ 예외 처리: 하버사인 반경 내에 아무도 없으면 중단
      if (filteredResults.length === 0) {
        alert(
          "선택하신 반경 조건에 맞는 장소가 너무 멀리 있습니다. 시간을 조금 더 늘려보세요! ☺️",
        );
        setIsLoading(false);
        return;
      }

      // 하버사인 결과 중 소요시간(거리)이 짧은 순으로 상위 20개만 먼저 슬라이스!
      // 이렇게 하면 135개 전체를 호출하지 않고 가장 유력한 20개만 카카오 API에 조회하므로 렉이 전혀 안 걸립니다.
      const top20FilteredResults = filteredResults
        .sort((a, b) => parseFloat(a.duration) - parseFloat(b.duration))
        .slice(0, 20);

      console.log(
        `🚗 하버사인 1차 합격자 ${filteredResults.length}개 중 상위 ${top20FilteredResults.length}개를 추려 카카오 실제 내비망 연산 개시`,
      );

      const startLat = selectedOrigin.lat;
      const startLon = selectedOrigin.lng;

      // 카카오 실제 자동차 길찾기 및 vertexes 수집 (filteredResults 대신 top20FilteredResults로 맵핑합니다)
      const finalKakaoMatchedResults = await Promise.all(
        top20FilteredResults.map(async (spot) => {
          try {
            const originParam = `${startLon},${startLat}`;
            const destinationParam = `${spot.lng},${spot.lat}`;

            const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${originParam}&destination=${destinationParam}&summary=false&priority=TIME`;

            // 🌟 [교정] Supabase 연동 대신 .env에서 직접 따끈따끈한 REST 키를 가져옵니다!
            const apiKey = import.meta.env.VITE_KAKAO_REST_KEY;

            const response = await fetch(url, {
              method: "GET",
              headers: {
                Authorization: `KakaoAK ${apiKey}`, // 401 인증 가드 해제!
                "Content-Type": "application/json",
              },
            });

            const naviData = await response.json();

            if (
              naviData.routes &&
              naviData.routes[0] &&
              naviData.routes[0].result_code === 0
            ) {
              const route = naviData.routes[0];
              const summary = route.summary;

              let allVertexes = [];
              if (route.sections) {
                route.sections.forEach((section) => {
                  if (section.roads) {
                    section.roads.forEach((road) => {
                      if (road.vertexes) {
                        allVertexes = allVertexes.concat(road.vertexes);
                      }
                    });
                  }
                });
              }

              console.log(
                `🎯 [카카오 실시간] ${spot.name} | 실제도로: ${(summary.distance / 1000).toFixed(1)}km | 실제내비: ${(summary.duration / 3600).toFixed(1)}시간`,
              );

              return {
                ...spot,
                distance: (summary.distance / 1000).toFixed(1),
                duration: (summary.duration / 3600).toFixed(1),
                pathVertexes: allVertexes,
              };
            }
          } catch (naviErr) {
            console.error(
              `${spot.name} 카카오 API 연동 실패 (하버사인 데이터 유지):`,
              naviErr,
            );
          }
          return spot;
        }),
      );

      // ====================================================
      // 🌟 카카오 실제 내비 시간 기준 '최단 시간 순' 필터 및 최종 정렬
      // ====================================================
      const finalFilterAndSorted = finalKakaoMatchedResults
        .filter((spot) => parseFloat(spot.duration) <= maxHours)
        .sort((a, b) => parseFloat(a.duration) - parseFloat(b.duration));

      let finalSliceResults = [];

      if (finalFilterAndSorted.length >= 3) {
        // 최종 통과자 중 가장 최단 시간 랭킹 10개 표출
        finalSliceResults = finalFilterAndSorted.slice(0, 10);
      } else {
        console.log(
          "⚠️ 실제 교통 정체로 시간 내 도달 가능한 곳이 3개 미만입니다. 도로망 기준 가장 가까운 3개를 보충합니다.",
        );
        finalSliceResults = finalKakaoMatchedResults
          .sort((a, b) => parseFloat(a.duration) - parseFloat(b.duration))
          .slice(0, 3);
      }

      setRecommendations(finalSliceResults);
      setVisibleCount(3);
      showScreen("screen-result");
    } catch (err) {
      console.error(err);
      alert("취향 매칭 및 이동 시간 연산 도중 예기치 못한 장애가 생겼습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStyleToggle = (subName) => {
    if (selectedStyles.includes(subName)) {
      setSelectedStyles(selectedStyles.filter((item) => item !== subName));
    } else {
      setSelectedStyles([...selectedStyles, subName]);
    }
  };

  const showScreen = (id) => {
    setActiveScreen(id);
    window.scrollTo(0, 0);
  };
  const handleMore = () => setVisibleCount(recommendations.length);

  const mapPositions = [
    [450, 450],
    [600, 300],
    [750, 500],
    [550, 650],
    [400, 250],
    [800, 200],
    [300, 400],
    [650, 150],
    [850, 600],
    [200, 550],
  ];
  const currentMapPos = mapPositions[selectedPlaceIndex];

  return (
    <div className="sb-root relative">
      <TwinklingStars />

      {/* SCREEN 1: START SCREEN */}
      <div
        id="screen-start"
        className={
          activeScreen === "screen-start"
            ? "flex flex-col min-h-screen"
            : "hidden"
        }>
        <header className="w-full px-6 md:px-12 py-6 flex justify-between items-center z-50 bg-transparent">
          <div
            className="text-3xl md:text-4xl sb-font-h text-[#2D2A4A] tracking-tighter cursor-pointer"
            onClick={() => window.location.reload()}>
            Spot<span className="text-[#6B5FD8]">Balance</span>
          </div>

          <div className="flex items-center gap-4">
            <HeaderWeather weather={gangwonWeather} />
            <button
              className="sb-font-h bg-white/80 backdrop-blur-md text-[#2D2A4A] text-[13px] px-5 py-2.5 rounded-full hover:bg-white border border-[#6B5FD8]/10 transition-all transform active:scale-95 shadow-md flex items-center gap-2 font-black"
              onClick={() => showScreen("screen-intro")}>
              <Info size={16} className="text-[#6B5FD8]" />
              서비스 소개
            </button>
            <button
              className="sb-font-h bg-[#6B5FD8] text-white text-[13px] px-5 py-2.5 rounded-full hover:bg-[#5A4EBF] transition-all transform active:scale-95 shadow-xl shadow-[#6B5FD8]/25 flex items-center gap-2"
              onClick={() => window.location.reload()}>
              <RefreshCw size={14} />
              새로고침
            </button>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center px-6 pt-10 pb-8">
          <div className="text-center mb-14 z-10">
            <h1 className="sb-hero text-6xl md:text-[80px] text-white mb-4 leading-[1.1] drop-shadow-[0_8px_24px_rgba(0,0,0,0.2)] tracking-tighter">
              혼잡 없이, 나답게
            </h1>
            <h1 className="sb-hero text-6xl md:text-[80px] text-[#6B5FD8] mb-8 leading-[1.1] drop-shadow-[0_4px_16px_rgba(107,95,216,0.25)] tracking-tighter">
              떠나자 강원도
            </h1>
            <p className="text-xl md:text-2xl font-semibold text-[#2D2A4A] opacity-95 max-w-4xl mx-auto leading-relaxed">
              복잡한 계획 대신 데이터로 증명된
              <br />
              가장 확실한 여행지를 지금 바로 찾아드려요
            </p>
          </div>

          <div className="relative w-full flex justify-center mt-4">
            <NatureSilhouette />
            <MountainSilhouette />
            <SailboatSilhouette />

            <div className="main-card relative max-w-[860px] !py-6 !px-6 md:!py-7 md:!px-8">
              {/* 첫 번째 줄: 출발지 설정, 여행 날짜, 이동 시간 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                <div className="h-full md:col-span-4">
                  <OriginSearchPicker
                    value={origin}
                    onSelect={setOrigin}
                    onSelectFullInfo={setSelectedOrigin}
                  />
                </div>
                <div className="h-full md:col-span-4">
                  <CalendarPicker
                    value={travelDate}
                    options={dateOptions}
                    onSelect={setTravelDate}
                  />
                </div>
                <div className="h-full md:col-span-4">
                  <SelectItem
                    label="이동 시간"
                    value={travelTime}
                    options={travelTimeOptions}
                    onSelect={setTravelTime}
                  />
                </div>
              </div>

              {/* 두 번째 줄: 성별, 나이, 선호 스타일 */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="h-full md:col-span-2">
                  <SelectItem
                    label="성별"
                    value={gender}
                    options={genderOptions}
                    onSelect={setGender}
                  />
                </div>
                <div className="h-full md:col-span-3">
                  <SelectItem
                    label="나이"
                    value={age}
                    options={ageOptions}
                    onSelect={setAge}
                  />
                </div>
                <div className="h-full md:col-span-7">
                  <MultiTastePicker
                    selectedSubs={selectedStyles}
                    onSubToggle={handleStyleToggle}
                  />
                </div>
              </div>

              {/* AI 맞춤 추천 버튼 */}
              <button
                className="btn-ai py-5 text-lg sb-font-h disabled:opacity-50"
                onClick={handleGetRecommendations}
                disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw size={22} className="animate-spin" />
                ) : (
                  <Sparkles size={22} fill="currentColor" />
                )}
                {isLoading
                  ? "강원도 빅데이터 분석 중..."
                  : "AI 맞춤 여행지 추천받기"}
              </button>
            </div>
          </div>
        </main>

        <footer className="w-full py-12 flex justify-center items-center border-t border-white/40 relative z-10">
          <div className="text-gray-600 text-[14px] sb-font-h italic text-center">
            &copy; 2026 SpotBalance. All rights reserved.
          </div>
        </footer>
      </div>

      {/* SCREEN 2: RESULT SCREEN */}
      <div
        id="screen-result"
        className={
          activeScreen === "screen-result"
            ? "flex flex-col min-h-screen"
            : "hidden"
        }>
        <header className="w-full px-6 md:px-12 py-8 flex justify-between items-center z-50">
          <div
            className="text-4xl sb-font-h text-[#2D2A4A] tracking-tighter cursor-pointer"
            onClick={() => showScreen("screen-start")}>
            Spot<span className="text-[#6B5FD8]">Balance</span>
          </div>
          <button
            className="bg-white/60 backdrop-blur-md text-[#2D2A4A] text-[13px] sb-font-h px-6 py-2 rounded-full hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
            onClick={() => {
              showScreen("screen-start");
              setVisibleCount(3);
            }}>
            <ArrowLeft size={16} />
            다시 추천받기
          </button>
        </header>
        <main className="flex-grow flex flex-col items-center px-6 py-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl md:text-5xl text-white sb-hero mb-4 drop-shadow-lg leading-tight">
              지금 가장 좋은{" "}
              <span className="text-[#F4C84A] drop-shadow-[0_0_15px_rgba(244,200,74,0.6)]">
                강원도
              </span>
              를 찾아보세요
            </h2>
          </div>
          <div className="w-full max-w-4xl space-y-4">
            {recommendations.slice(0, visibleCount).map((item, index) => (
              <RecommendationCard
                key={index}
                rank={index + 1}
                {...item}
                onShowMap={() => showScreen("screen-map")}
              />
            ))}

            <div className="flex flex-col gap-4 mt-10 items-center">
              {visibleCount < recommendations.length ? (
                <button
                  className="bg-white/80 backdrop-blur-md border border-[#6B5FD8]/20 text-[#6B5FD8] sb-font-h px-12 py-4 rounded-2xl shadow-lg hover:bg-[#6B5FD8] hover:text-white transition-all flex items-center gap-3"
                  onClick={handleMore}>
                  <Plus size={20} />
                  관광지 더 보기
                </button>
              ) : (
                <button
                  className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-500 sb-font-h px-12 py-4 rounded-2xl shadow-lg hover:bg-gray-100 transition-all flex items-center gap-3"
                  onClick={() => setVisibleCount(3)}>
                  <Minus size={20} />
                  결과 접기
                </button>
              )}
              <button
                className="bg-[#6B5FD8] text-white sb-font-h px-12 py-5 rounded-[28px] shadow-2xl transform hover:scale-105 transition-all flex items-center gap-4"
                onClick={() => showScreen("screen-map")}>
                <Map size={24} />
                전체 경로 지도로 보기
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* SCREEN 3: MAP SCREEN */}
      <div
        id="screen-map"
        className={
          activeScreen === "screen-map"
            ? "flex flex-col min-h-screen"
            : "hidden"
        }>
        <header className="w-full px-6 md:px-12 py-6 flex justify-between items-center bg-white shadow-md z-50">
          <div
            className="text-2xl sb-font-h text-[#2D2A4A] tracking-tighter cursor-pointer"
            onClick={() => showScreen("screen-start")}>
            Spot<span className="text-[#6B5FD8]">Balance</span>{" "}
            <span className="text-sm text-[#8884A8] ml-2 font-black uppercase">
              | Smart Route
            </span>
          </div>
          <button
            className="bg-[#6B5FD8] text-white text-[14px] sb-font-h px-8 py-3 rounded-full hover:bg-[#5A4EBF] transition-all flex items-center gap-2"
            onClick={() => showScreen("screen-result")}>
            <List size={16} />
            목록으로 돌아가기
          </button>
        </header>
        <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-85px)] overflow-hidden">
          <div className="w-full md:w-[420px] bg-white shadow-2xl z-20 overflow-y-auto p-8 flex flex-col gap-8">
            <div className="flex flex-col gap-0">
              <div className="relative pl-10 pb-6">
                <div className="absolute left-0 top-0 w-7 h-7 bg-[#6B5FD8] border-4 border-white rounded-full z-10 shadow-lg"></div>
                <div className="absolute left-3.5 top-7 bottom-0 w-0.5 border-dashed border-l-2 border-[#6B5FD8]"></div>
                <div className="text-xs text-[#8884A8] sb-font-h uppercase mb-1">
                  출발지
                </div>
                <div className="text-xl sb-font-h text-[#2D2A4A]">{origin}</div>
              </div>

              {recommendations.map((item, idx) => (
                <div
                  key={idx}
                  className={`relative pl-10 pb-6 cursor-pointer group ${selectedPlaceIndex === idx ? "opacity-100" : "opacity-60 hover:opacity-100"}`}
                  onClick={() => setSelectedPlaceIndex(idx)}>
                  <div
                    className={`absolute left-0 top-0 w-7 h-7 ${selectedPlaceIndex === idx ? "bg-[#6B5FD8]" : "bg-gray-400 group-hover:bg-[#6B5FD8]"} border-4 border-white rounded-full z-10 flex items-center justify-center text-[10px] text-white sb-font-h shadow-lg transition-colors`}>
                    {idx + 1}
                  </div>
                  {idx < recommendations.length - 1 && (
                    <div className="absolute left-3.5 top-7 bottom-0 w-0.5 border-dashed border-l-2 border-[#6B5FD8]/25"></div>
                  )}
                  <div
                    className={`text-xs sb-font-h uppercase mb-1 ${selectedPlaceIndex === idx ? "text-[#6B5FD8]" : "text-[#8884A8]"}`}>
                    추천 목적지 {idx + 1}
                  </div>
                  <div
                    className={`text-lg sb-font-h transition-colors ${selectedPlaceIndex === idx ? "text-[#2D2A4A]" : "text-gray-500"}`}>
                    {item.name}
                  </div>
                </div>
              ))}
            </div>

            {recommendations.length > 0 && (
              <div className="mt-auto bg-[#2D2A4A] text-white p-8 rounded-[36px] shadow-2xl">
                <div className="text-[10px] sb-font-h opacity-60 mb-2 uppercase tracking-widest">
                  Total Journey
                </div>
                <div className="text-[11px] sb-font-h opacity-80 mb-1">
                  선택지:{" "}
                  {recommendations[selectedPlaceIndex]?.name || "선택 전"}
                </div>
                <div className="text-[11px] sb-font-h opacity-80 mb-1">
                  선택지:{" "}
                  {recommendations[selectedPlaceIndex]?.name || "선택 전"}
                </div>
                {/* 🌟 기존 가짜 시간 배열 삭제 후, 카카오 실제 연산 내비 시간(시간 단위) 노출 */}
                <div className="text-4xl sb-font-h italic">
                  {recommendations[selectedPlaceIndex]
                    ? `${recommendations[selectedPlaceIndex].duration} Hour`
                    : "0.0 Hour"}
                </div>
                <div className="text-[13px] font-bold text-[#6B5FD8] mt-1">
                  실 주행 거리:{" "}
                  {recommendations[selectedPlaceIndex]?.distance || 0} km
                </div>
                <div className="text-[10px] sb-font-h opacity-40 mt-2">
                  ※ 예상 소요시간은 실시간 교통정보에 따라 변동될 수 있습니다.
                </div>
              </div>
            )}
          </div>

          <div className="flex-grow relative bg-white overflow-hidden">
            {recommendations.length > 0 ? (
              <KakaoMapView
                startOrigin={selectedOrigin}
                targetSpot={recommendations[selectedPlaceIndex]}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">
                추천된 경로 데이터가 존재하지 않습니다.
              </div>
            )}
          </div>
        </main>
      </div>

      <div
        id="screen-intro"
        className={activeScreen === "screen-intro" ? "block" : "hidden"}>
        <ServiceIntro onBack={() => showScreen("screen-start")} />
      </div>
    </div>
  );
}

export default App;
