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
  DepartureTimePicker,
} from "./components/FormControls";
import { RecommendationCard } from "./components/RecommendationCard";
import { ServiceIntro } from "./components/ServiceIntro";
import { getVilageFcstBaseTime } from "./utils/weatherTimeCalculator";
import { KakaoMapView } from "./components/KakaoMapView";

// 1. Supabase 초기화 설정
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// 🌤️ 실시간 날씨 전광판 컴포넌트
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

// 메인 App 컴포넌트 시작
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
    "4시간 이내",
    "5시간 이내",
    "5시간 초과",
  ];
  const departureTimeOptions = [
    "06:00",
    "07:00",
    "08:00",
    "09:00",
    "10:00",
    "11:00",
    "12:00",
    "13:00",
    "14:00",
    "15:00",
    "16:00",
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

  // 브라우저 현재 시, 분 초기 세팅
  const currentInitialTime = useMemo(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }, []);

  const [departureTime, setDepartureTime] = useState("10:00");
  const [selectedStyles, setSelectedStyles] = useState([]);
  const timeInputRef = useRef(null);

  // Supabase 실시간 날씨 연동 및 카카오맵 스크립트 로드
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
          if (document.getElementById("kakao-map-script")) return;

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
        }
      } catch (error) {
        console.error("인프라 초기화 실패:", error);
      }
    };
    initializeAppServices();
  }, []);

  const handleGetRecommendations = async () => {
    document.body.style.overflow = "unset";

    // [1차 필터 사전 가드] 대/중분류 취향 필수 가드
    if (selectedStyles.length === 0) {
      alert(
        "더 정확한 맞춤 추천을 위해 취향 설정을 최소 1개 이상 선택해 주세요! 😉",
      );
      return;
    }

    // 날짜 스트링 포맷 파싱
    const match = travelDate.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})/);
    const targetQueryDate = match
      ? `${match[1]}-${match[2]}-${match[3]}`
      : new Date().toISOString().split("T")[0];

    // 오늘 날짜인데 선택 시간이 과거인 경우 차단하는 하드 가드
    const realNow = new Date();
    const todayStr = `${realNow.getFullYear()}-${String(realNow.getMonth() + 1).padStart(2, "0")}-${String(realNow.getDate()).padStart(2, "0")}`;

    if (targetQueryDate === todayStr) {
      const [chooseH, chooseM] = departureTime.split(":").map(Number);
      const currentH = realNow.getHours();
      const currentM = realNow.getMinutes();

      if (chooseH < currentH || (chooseH === currentH && chooseM < currentM)) {
        alert(
          "선택하신 출발 시간이 이미 지났습니다! ⏰ 출발 날짜나 시간을 다시 골라주세요.",
        );
        return;
      }
    }

    setIsLoading(true);

    const WEEK_DAYS = [
      "일요일",
      "월요일",
      "화요일",
      "수요일",
      "목요일",
      "금요일",
      "토요일",
    ];
    const dateObj = new Date(targetQueryDate);
    const dayOfWeek = dateObj.getDay();
    const formattedTravelDate = targetQueryDate.substring(5, 10);

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

    const isHoliday = publicHolidays.includes(formattedTravelDate);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;
    const isWeekendOrHoliday = isWeekend || isHoliday;

    // 3차 하버사인 연산 시속 스펙 명세 (평일 100km/h, 주말/공휴일/금요일 80km/h)
    const currentSpeed = isWeekendOrHoliday ? 80 : 100;

    const isOverCondition = travelTime.includes("초과");
    const parsedLimitHours = parseFloat(travelTime.replace(/[^0-9.]/g, ""));
    const maxHours = isNaN(parsedLimitHours) ? 5 : parsedLimitHours;

    // 대분류 취향 레이블 수집
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

    // 📊 대시보드용 카운터 변수 장전
    let totalSpotsCount = 0;
    let stage1FailCount = 0;
    let stage2HolidayFailCount = 0;
    let stage2TimeFailCount = 0;
    let stage3DistanceFailCount = 0;

    console.clear(); // 이전 지저분한 로그 초기화
    console.log(
      "%c==================================================",
      "color: #6B5FD8; font-weight: bold; font-size: 13px;",
    );
    console.log(
      `%c🔮 SpotBalance 빅데이터 정밀 매칭 알고리즘 가동`,
      "color: #6B5FD8; font-weight: bold; font-size: 14px;",
    );
    console.log(
      `[출발 기준점] ${origin} (위도: ${selectedOrigin?.lat}, 경도: ${selectedOrigin?.lng})`,
    );
    console.log(
      `[분석 조건 설정] 날짜: ${targetQueryDate} (${WEEK_DAYS[dayOfWeek]}) | 출발시간: ${departureTime} | 제한시간: ${travelTime}`,
    );
    console.log(
      `[교통 환경 연산] 가중치 적용 시속: ${currentSpeed}km/h (주말/공휴일 여부: ${isWeekendOrHoliday ? "YES" : "NO"})`,
    );
    console.log(
      `[유저 매칭 취향] 대분류: [${targetMainLabels.join(", ")}] | 세부 해시태그: [${selectedStyles.join(", ")}]`,
    );
    console.log(
      "%c==================================================",
      "color: #6B5FD8; font-weight: bold; font-size: 13px;",
    );

    try {
      const { data, error } = await supabase.from("spots").select(`
          id, spot_name, spot_description, address, image_url, is_always_open,
          open_time, close_time, last_entry_time, is_no_holiday, rest_weekly_days, is_holiday_close,
          category_main, category_mid, category_sub, lat, lng
        `);

      if (error) throw error;
      totalSpotsCount = data ? data.length : 0;

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

      // 1차, 2차를 통과한 후보들을 먼저 수집하는 독립 배열
      const stage2PassResults = [];

      data.forEach((spot) => {
        const name = spot.spot_name || "이름 없는 명소";

        // [STAGE 1] 1차 취향 필터
        const spotMains = Array.isArray(spot.category_main)
          ? spot.category_main
          : [spot.category_main].filter(Boolean);
        const spotMids = Array.isArray(spot.category_mid)
          ? spot.category_mid
          : [spot.category_mid].filter(Boolean);

        const isMainMatched = spotMains.some((mainVal) =>
          targetMainLabels.includes(mainVal),
        );
        const hasSelectedMid = selectedStyles.some((style) =>
          spotMids.includes(style),
        );

        if (!isMainMatched || !hasSelectedMid) {
          stage1FailCount++;
          return;
        }

        // [STAGE 2] 2차 요일/시간/휴무일 복합 연산 필터
        if (!(spot.is_always_open && spot.is_no_holiday)) {
          if (!spot.is_no_holiday) {
            if (isHoliday) {
              if (spot.is_holiday_close) {
                console.log(
                  `%c[❌ 2차 공휴일 탈락] ${name}`,
                  "color: #e57373;",
                );
                stage2HolidayFailCount++;
                return;
              }
              if (
                spot.rest_weekly_days &&
                spot.rest_weekly_days.includes(dayOfWeek)
              ) {
                console.log(
                  `%c[❌ 2차 휴무 요일 탈락] ${name}`,
                  "color: #e57373;",
                );
                stage2HolidayFailCount++;
                return;
              }
            } else {
              if (
                spot.rest_weekly_days &&
                spot.rest_weekly_days.includes(dayOfWeek)
              ) {
                console.log(
                  `%c[❌ 2차 휴무 요일 탈락] ${name}`,
                  "color: #e57373;",
                );
                stage2HolidayFailCount++;
                return;
              }
            }
          }

          if (!spot.is_always_open) {
            if (!spot.open_time || !spot.close_time) {
              stage2TimeFailCount++;
              return;
            }

            const [depH, depM] = departureTime.split(":").map(Number);
            const totalDepMinutes = depH * 60 + depM;

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
            const durationMinutes = Math.round(
              (distanceKm / currentSpeed) * 60,
            );
            const arrivalMinutes = totalDepMinutes + durationMinutes;

            const arrivalH = String(Math.floor(arrivalMinutes / 60)).padStart(
              2,
              "0",
            );
            const arrivalM = String(arrivalMinutes % 60).padStart(2, "0");

            if (spot.last_entry_time) {
              const [leH, leM] = spot.last_entry_time.split(":").map(Number);
              if (arrivalMinutes > leH * 60 + leM) {
                console.log(
                  `%c[❌ 2차 입장 마감 탈락] ${name}`,
                  "color: #ffb74d;",
                );
                stage2TimeFailCount++;
                return;
              }
            } else {
              const [clH, clM] = spot.close_time.split(":").map(Number);
              if (arrivalMinutes > clH * 60 + clM - 60) {
                console.log(
                  `%c[❌ 2차 운영 마감 탈락] ${name}`,
                  "color: #ffb74d;",
                );
                stage2TimeFailCount++;
                return;
              }
            }
          }
        }

        // 2차까지 잘 버틴 명소들을 임시 저장소에 push
        stage2PassResults.push(spot);
      });

      // 3개 이하 스킵 가드 트리거 선언
      const filteredResults = [];
      const isShortageFallbackActive = stage2PassResults.length <= 3;

      if (isShortageFallbackActive) {
        console.log(
          `%c⚠️ [데이터 유실 방지 가드 발동] 2차 생존 명소가 단 ${stage2PassResults.length}개이므로 3차 하버사인 거리 필터를 스킵합니다!`,
          "color: #ff3d00; font-weight: bold; background: #fff3e0; padding: 4px;",
        );
      }

      // 수집된 생존 명소들을 바탕으로 최종 결과 매핑 루프 가동
      stage2PassResults.forEach((spot) => {
        const name = spot.spot_name;
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

        // 🌟 가드가 발동하지 않았을 때(남은 명소가 4개 이상일 때)만 3차 거리 필터를 체크함!
        if (!isShortageFallbackActive) {
          if (isOverCondition) {
            if (estimatedTime <= maxHours) {
              console.log(
                `%c[❌ 3차 범위 탈락] ${name} -> ${maxHours}시간 '초과' 필터 조건 미달`,
                "color: #4fc3f7;",
              );
              stage3DistanceFailCount++;
              return;
            }
          } else {
            if (estimatedTime > maxHours) {
              console.log(
                `%c[❌ 3차 범위 탈락] ${name} -> ${maxHours}시간 '이내' 필터 범위 조건 초과`,
                "color: #4fc3f7;",
              );
              stage3DistanceFailCount++;
              return;
            }
          }
          console.log(
            `%c[🟢 최종합격] ${name} -> 직선거리: ${distanceKm.toFixed(1)}km | 예상소요시간: ${estimatedTime.toFixed(1)}시간`,
            "color: #2e7d32; font-weight: bold;",
          );
        } else {
          // 가드가 켜져서 프리패스하는 경우의 로그
          console.log(
            `%c[🟢 가드통과 명소] ${name} -> 직선거리: ${distanceKm.toFixed(1)}km (하버사인 필터 프리패스)`,
            "color: #ff3d00; font-weight: bold;",
          );
        }

        // 지표 데이터 구조 가공 및 push
        const congestionScore = 50;
        const suitabilityScore = 70;
        const weatherScore = 90;
        const finalScore = Math.round(
          (congestionScore + suitabilityScore + weatherScore) / 3,
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
          score: finalScore,
          congestion: congestionScore,
          suitability: suitabilityScore,
          weather: gangwonWeather.text,
          icon: gangwonWeather.icon,
          hours: formattedHours,
          closed: formattedClosed,
          address: spot.address || "강원특별자치도",
          image: spot.image_url,
          lat: spot.lat,
          lng: spot.lng,
          category_main: spot.category_main,
          category_mid: spot.category_mid,
          category_sub: spot.category_sub,
          distance: distanceKm.toFixed(1),
          duration: estimatedTime.toFixed(1),
        });
      });

      // 📊 [최종 통계 전광판 로깅]
      console.log(
        "%c--------------------------------------------------",
        "color: #ccc;",
      );
      console.log(
        `%c📊 알고리즘 최종 필터링 분석 통계 리포트`,
        "font-weight: bold; color: #2D2A4A;",
      );
      console.log(`- 전체 원본 수: ${totalSpotsCount}개`);
      console.log(`- 1차 [취향 불일치] 탈락: ${stage1FailCount}개`);
      console.log(`- 2차 [휴무일 정보] 탈락: ${stage2HolidayFailCount}개`);
      console.log(`- 2차 [운영시간 마감] 탈락: ${stage2TimeFailCount}개`);
      console.log(
        `- 3차 [하버사인 시간 이내/초과] 탈락: ${stage3DistanceFailCount}개`,
      );
      console.log(
        `%c- 모든 필터를 통과한 순수 최종 후보군: ${filteredResults.length}개`,
        "font-weight: bold; color: #6B5FD8;",
      );
      console.log(
        "%c==================================================",
        "color: #6B5FD8; font-weight: bold; font-size: 13px;",
      );

      if (filteredResults.length === 0) {
        alert(
          "선택하신 조건(시간/휴무/이내·초과)에 부합하는 명소가 발견되지 않았습니다. 범위를 조절해 보세요! ☺️",
        );
        setIsLoading(false);
        return;
      }

      // 최종 정렬 후 상위 10개 반환
      const finalSortedResults = filteredResults
        .sort((a, b) => parseFloat(a.duration) - parseFloat(b.duration))
        .slice(0, 10);

      setRecommendations(finalSortedResults);
      setVisibleCount(3);
      setSelectedPlaceIndex(0);
      showScreen("screen-result");
    } catch (err) {
      console.error(err);
      alert("매칭 연산 수행 도중 예기치 못한 장애가 발생했습니다.");
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
    if (id === "screen-map") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  };
  const handleMore = () => setVisibleCount(recommendations.length);

  return (
    <div className="sb-root relative">
      <TwinklingStars />

      {/* SCREEN 1: 시작 화면 */}
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
              {/* 🌟 1층 (상단 줄): 여행의 핵심 축 [출발지(4) + 날짜(4) + 출발시간(4)] */}
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
                  <DepartureTimePicker
                    value={departureTime}
                    options={departureTimeOptions}
                    onSelect={setDepartureTime}
                  />
                </div>
              </div>

              {/* 🌟 2층 (하단 줄): 필터 상세 조건 [이동시간(3) + 성별(2) + 나이(2) + 선호스타일(5)] */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                <div className="h-full md:col-span-3">
                  <SelectItem
                    label="이동 시간"
                    value={travelTime}
                    options={travelTimeOptions}
                    onSelect={setTravelTime}
                  />
                </div>

                <div className="h-full md:col-span-2">
                  <SelectItem
                    label="성별"
                    value={gender}
                    options={genderOptions}
                    onSelect={setGender}
                  />
                </div>

                <div className="h-full md:col-span-2">
                  <SelectItem
                    label="나이"
                    value={age}
                    options={ageOptions}
                    onSelect={setAge}
                  />
                </div>

                <div className="h-full md:col-span-5">
                  <MultiTastePicker
                    selectedSubs={selectedStyles}
                    onSubToggle={handleStyleToggle}
                  />
                </div>
              </div>

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

      {/* SCREEN 2: 결과 화면 */}
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
              </span>{" "}
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

      {/* SCREEN 3: 지도 화면 */}
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
                targetSpot={
                  recommendations[selectedPlaceIndex] || recommendations[0]
                }
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
