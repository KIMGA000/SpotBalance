import React, { useState, useMemo, useEffect, useRef } from "react";
import "./index.css";
import { createClient } from "@supabase/supabase-js";

// 최신 lucide-react 패키지 아이콘 적용
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

// 분리된 자식 컴포넌트 파일들 정밀 연동
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

// ==========================================
// 1. Supabase 초기화 설정
// ==========================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 🌟 [정밀 조치] 가영님이 짚어주신 데이터베이스 실제 라벨 규칙 명세 완전 동기화
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
    "40~50대",
    "50~60대",
    "가족여행",
    "효도 여행",
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

        const { data: configData, error: configError } = await supabase
          .from("app_config")
          .select("key_value")
          .eq("key_name", "KAKAO_MAP_KEY")
          .single();

        if (configError) throw configError;
        const kakaoApiKey = configData?.key_value;

        if (kakaoApiKey) {
          const script = document.createElement("script");
          script.async = true;
          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoApiKey}&libraries=services&autoload=false`;
          script.onload = () => {
            window.kakao.maps.load(() => {
              console.log("🗺️ 카카오맵 구동 완료!");
            });
          };
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error("인프라 초기화 실패:", error);
      }
    };
    initializeAppServices();
  }, []);

  // 대분류 배열(text[]) 검사 후 중분류 정밀 매칭
  const handleGetRecommendations = async () => {
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

    // 🌟 1단계: 클릭된 subs들의 부모 대분류 국문 꼬리표('자연관광', '체험관광' 등) 동적 식별 연산
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
      const { data, error } = await supabase.from("spots").select(`
          id, spot_name, spot_description, address, image_url, is_always_open,
          open_time, close_time, last_entry_time, is_no_holiday, rest_weekly_days, 
          category_main, category_mid, category_sub,
          spot_visitor_trends (visitor_count, target_date)
        `);

      if (error) throw error;

      if (!data || data.length === 0) {
        alert("관광지 데이터를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      const filteredResults = [];

      data.forEach((spot) => {
        const trendData = spot.spot_visitor_trends?.find(
          (t) => t.target_date === queryDate,
        );
        const rawVisitorRate = trendData
          ? trendData.visitor_count
          : Math.floor(Math.random() * 30) + 5;
        const congestionScore = Math.min(100, Math.round(rawVisitorRate * 1.5));

        // 🌟 2단계: text[] 데이터 컴포넌트 안전 배열화
        const spotMains = Array.isArray(spot.category_main)
          ? spot.category_main
          : [spot.category_main].filter(Boolean);
        const spotMids = Array.isArray(spot.category_mid)
          ? spot.category_mid
          : [spot.category_mid].filter(Boolean);

        // 🌟 3단계: 대분류 실시간 교집합 연산 ('자연관광', '체험관광' 검사)
        const isMainMatched = spotMains.some((mainVal) =>
          targetMainLabels.includes(mainVal),
        );

        if (isMainMatched) {
          // 🌟 4단계: 중분류 실시간 교집합 연산 ('동물원', '바다', '산' 검사)
          let matchedSubCount = 0;
          selectedStyles.forEach((style) => {
            if (spotMids.includes(style)) matchedSubCount++;
          });

          // 🌟 5단계: 중분류 매칭이 단 1개라도 성공했다면 필터 최종 합격 처리!
          if (matchedSubCount > 0) {
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
            });
          }
        }
      });

      // 스코어 랭킹순으로 정렬
      filteredResults.sort((a, b) => b.score - a.score);

      // 🌟 [기획 전제 반영] 있는 개수만큼만 출력 (상한선 슬라이스 10개 고정)
      const finalSliceResults = filteredResults.slice(0, 10);

      if (finalSliceResults.length === 0) {
        alert(
          "선택하신 세부 취향 조건에 부합하는 장소가 강원도 내에 존재하지 않습니다. 다른 스타일을 선택해 보세요! ☺️",
        );
        setIsLoading(false);
        return;
      }

      setRecommendations(finalSliceResults);
      setVisibleCount(3);
      showScreen("screen-result");
    } catch (err) {
      console.error(err);
      alert("취향 매칭 연산 도중 예기치 못한 장애가 생겼습니다.");
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

            <div class="main-card relative max-w-[860px] !py-6 !px-6 md:!py-7 md:!px-8">
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
                <div className="text-4xl sb-font-h italic">
                  {
                    [
                      "2H 10M",
                      "3H 30M",
                      "2H 45M",
                      "4H 05M",
                      "3H 15M",
                      "3H 50M",
                      "4H 20M",
                      "2H 55M",
                      "3H 40M",
                      "4H 30M",
                    ][selectedPlaceIndex % 10]
                  }
                </div>
                <div className="text-[10px] sb-font-h opacity-40 mt-2">
                  ※ 예상 소요시간은 실시간 교통정보에 따라 변동될 수 있습니다.
                </div>
              </div>
            )}
          </div>

          <div className="flex-grow relative bg-[#E5E7EB] overflow-hidden">
            <div
              className="absolute inset-0 bg-[#D9E4E0]"
              style={{
                backgroundImage:
                  "radial-gradient(#C4CEC9 2px, transparent 2px)",
                backgroundSize: "40px 40px",
                opacity: 0.6,
              }}></div>

            <div className="absolute left-[150px] top-[700px] -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
              <div className="w-9 h-9 bg-white rounded-full border-[5px] border-[#6B5FD8] shadow-2xl"></div>
              <div className="bg-white px-2 py-1 rounded-md text-[10px] sb-font-h mt-2 shadow-sm border border-gray-100">
                출발: {origin}
              </div>
            </div>

            {recommendations.map((pos, idx) => {
              const currentPos = mapPositions[idx % mapPositions.length];
              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
                  style={{
                    left: `${currentPos[0]}px`,
                    top: `${currentPos[1]}px`,
                  }}
                  onClick={() => setSelectedPlaceIndex(idx)}>
                  <div
                    className={`${selectedPlaceIndex === idx ? "bg-[#6B5FD8] w-12 h-12 animate-bounce" : "bg-gray-500 w-10 h-10"} rounded-full border-[5px] border-white flex items-center justify-center shadow-2xl transition-all`}>
                    <span className="text-white text-xs sb-font-h font-bold">
                      {idx + 1}
                    </span>
                  </div>
                  {selectedPlaceIndex === idx && (
                    <div className="bg-[#2D2A4A] text-white px-3 py-1.5 rounded-lg text-[11px] sb-font-h mt-2 shadow-xl whitespace-nowrap">
                      {recommendations[idx]?.name}
                    </div>
                  )}
                </div>
              );
            })}

            <svg
              className="absolute inset-0 w-full h-full z-10 pointer-events-none"
              viewBox="0 0 1000 1000">
              {currentMapPos && (
                <path
                  d={`M 150 700 L ${currentMapPos[0]} ${currentMapPos[1]}`}
                  fill="none"
                  stroke="#6B5FD8"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="1,15"
                  className="animate-[dash_12s_linear_infinite]"
                />
              )}
            </svg>
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
