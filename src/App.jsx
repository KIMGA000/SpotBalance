import {
  filterAndScoreSpots,
  getUserPreferenceWeights,
} from "./utils/spotRecommender";
import { getOrCreateUserId } from "./utils/auth";
import React, { useState, useMemo, useEffect, useRef } from "react";
import "./index.css";
import { supabase } from "./supabaseClient";
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
import { KakaoMapView } from "./components/KakaoMapView";

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

function App() {
  const [activeScreen, setActiveScreen] = useState("screen-start");
  const [visibleCount, setVisibleCount] = useState(3);
  const [selectedPlaceIndex, setSelectedPlaceIndex] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [kakaoRoutesMaster, setKakaoRoutesMaster] = useState({});
  const [recSessionId, setRecSessionId] = useState(null);
  const [gangwonWeather, setGangwonWeather] = useState({
    text: "맑음",
    temp: 0,
    icon: "cloud-sun",
  });
  const [top10Routes, setTop10Routes] = useState([]);

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

  const [origin, setOrigin] = useState("강원대학교 춘천캠퍼스");
  const [selectedOrigin, setSelectedOrigin] = useState({
    name: "강원대학교 춘천캠퍼스",
    address: "강원대학교 춘천캠퍼스",
    lat: 37.86945254603451,
    lng: 127.74403884881542,
  });
  const [travelDate, setTravelDate] = useState(dateOptions[0]);
  const [age, setAge] = useState("20대");
  const [gender, setGender] = useState("여성");
  const [travelTime, setTravelTime] = useState("3시간 이내");
  const [departureTime, setDepartureTime] = useState("10:00");
  const [selectedStyles, setSelectedStyles] = useState([]);

  useEffect(() => {
    const initializeAppServices = async () => {
      try {
        const { data: weatherData } = await supabase
          .from("current_weather")
          .select("weather_text, temp")
          .eq("id", 1)
          .single();
        if (weatherData) {
          setGangwonWeather({
            text: weatherData.weather_text || "맑음",
            temp: weatherData.temp || 22,
            icon: "cloud-sun",
          });
        }
        const kakaoMapApiKey = import.meta.env.VITE_KAKAO_MAP_KEY;
        if (kakaoMapApiKey && !document.getElementById("kakao-map-script")) {
          const script = document.createElement("script");
          script.id = "kakao-map-script";
          script.async = true;
          script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapApiKey}&libraries=services&autoload=false`;
          script.onload = () => {
            window.kakao.maps.load(() => {
              console.log("🗺️ 카카오맵 구동 완료!");
            });
          };
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error(error);
      }
    };
    initializeAppServices();
  }, []);

  const fetchAllTop10KakaoRoutes = async (top10Spots) => {
    const KAKAO_REST_KEY = import.meta.env.VITE_KAKAO_REST_KEY;
    if (!KAKAO_REST_KEY) {
      console.warn("VITE_KAKAO_REST_KEY 정보가 누락되었습니다.");
      return;
    }

    const originCoords = `${selectedOrigin.lng},${selectedOrigin.lat}`;

    const routePromises = top10Spots.map(async (spot, index) => {
      const destCoords = `${spot.lng},${spot.lat}`;
      try {
        // 1단계: 자동차 길찾기 호출
        let response = await fetch(
          `https://apis-navi.kakaomobility.com/v1/directions?origin=${originCoords}&destination=${destCoords}&priority=TIME`,
          {
            method: "GET",
            headers: { Authorization: `KakaoAK ${KAKAO_REST_KEY}` },
          },
        );

        let resData = await response.json();

        // 최종 확인: 자동차든 도보든 경로 데이터가 있다면 처리
        if (resData?.routes?.[0]?.summary) {
          const route = resData.routes[0];
          const realTimeMin = Math.round(route.summary.duration / 60);
          const realDistKm = (route.summary.distance / 1000).toFixed(1);

          const linePoints = [];
          if (route.sections?.[0]?.roads) {
            route.sections[0].roads.forEach((road) => {
              if (road.vertexes) {
                for (let i = 0; i < road.vertexes.length; i += 2) {
                  linePoints.push({
                    lat: road.vertexes[i + 1],
                    lng: road.vertexes[i],
                  });
                }
              }
            });
          }

          return {
            index,
            kakaoTime: realTimeMin,
            kakaoDist: realDistKm,
            path: linePoints,
          };
        } else {
          throw new Error("경로 데이터 없음");
        }
      } catch (e) {
        //console.error("❌ 카카오 API 호출 상세 에러:", e);
        console.warn(
          `⚠️ [카카오 가드 발동] "${spot.name}" 노선 하버사인 대체 매핑 우회`,
        );
        try {
          // OSRM API 호출 (좌표는 롱,렛 순서)
          const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${selectedOrigin.lng},${selectedOrigin.lat};${spot.lng},${spot.lat}?overview=full&geometries=geojson`;
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();

          if (osrmData.routes && osrmData.routes.length > 0) {
            const route = osrmData.routes[0];
            // OSRM은 geometry.coordinates에 [경도, 위도] 배열을 줍니다.
            const path = route.geometry.coordinates.map((p) => ({
              lat: p[1],
              lng: p[0],
            }));
            const osrmTimeMin = Math.round(route.duration / 60);
            const osrmDistKm = (route.distance / 1000).toFixed(1);
            return {
              index,
              kakaoTime: osrmTimeMin, // 하버사인 대신 OSRM의 정확한 시간 사용
              kakaoDist: osrmDistKm,
              path: path,
            };
          }
          throw new Error("OSRM 경로 없음");
        } catch (osrmErr) {
          const travelDate = new Date(); // 혹은 전달받은 날짜 사용
          const dayOfWeek = travelDate.getDay();
          const isWeekendOrFriday = [0, 5, 6].includes(dayOfWeek);
          const currentSpeed = isWeekendOrFriday ? 60 : 70; // 금토일 60km/h, 월~목 70km/h

          // spot.distance는 하버사인으로 계산된 거리(km)라고 가정
          const distVal = parseFloat(spot.distance || "0");

          // 속도(km/h)를 이용해 시간(분) 계산: (거리 / 속도) * 60
          const timeVal =
            distVal > 0 ? Math.round((distVal / currentSpeed) * 60) : 0;

          return {
            index,
            kakaoTime: null,
            kakaoDist: null,
            haversineTime: timeVal, // 요일별 속도가 반영된 계산값
            haversineDist: distVal,
            path: [
              { lat: selectedOrigin.lat, lng: selectedOrigin.lng },
              { lat: spot.lat, lng: spot.lng },
            ],
          };
        }
      }
    });
    return await Promise.all(routePromises);
  };

  // 알고리즘 연산 위임 파이프라인
  const handleGetRecommendations = async () => {
    document.body.style.overflow = "unset";
    if (selectedStyles.length === 0) {
      alert(
        "더 정확한 맞춤 추천을 위해 취향 설정을 최소 1개 이상 선택해 주세요! 😉",
      );
      return;
    }

    const match = travelDate.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})/);
    const targetQueryDate = match
      ? `${match[1]}-${match[2]}-${match[3]}`
      : new Date().toISOString().split("T")[0];

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

    try {
      const userId = getOrCreateUserId();

      const targetMainLabels = [];
      Object.keys(TASTE_DATA_CONFIG).forEach((mainKey) => {
        if (
          selectedStyles.some((style) =>
            TASTE_DATA_CONFIG[mainKey].includes(style),
          )
        ) {
          targetMainLabels.push(MAIN_LABEL_MAP[mainKey]);
        }
      });

      // [검색 조건 저장]
      const { data: searchLog, error: searchError } = await supabase
        .from("search_conditions")
        .insert({
          user_id: userId,
          origin_name: selectedOrigin.name,
          origin_lat: selectedOrigin.lat,
          origin_lng: selectedOrigin.lng,
          travel_date: targetQueryDate,
          departure_time: departureTime,
          travel_time_limit: travelTime,
          gender: gender,
          age_num: parseInt(age.replace(/[^0-9]/g, "")) || 20,
          preferred_main_categories: targetMainLabels, // 위에서 계산된 값
          preferred_mid_categories: selectedStyles,
        })
        .select("id")
        .single();

      if (searchError) throw searchError;

      // 발급받은 세션 ID를 상단 state에 저장
      setRecSessionId(searchLog.id);

      // 1. 필요한 모든 데이터를 한 번씩 호출
      const [
        preferenceWeights,
        { data: spotsData, error },
        { data: weatherCache },
        { data: ageWeightsData },
      ] = await Promise.all([
        getUserPreferenceWeights(supabase, userId),
        supabase
          .from("spots")
          .select(
            `
            id, spot_name, spot_description, address, image_url, is_always_open,
            open_time, close_time, last_entry_time, is_no_holiday, rest_weekly_days, is_holiday_close,
            category_main, category_mid, category_sub, lat, lng, county, county_district,
            spot_visitor_trends(visitor_count)
          `,
          )
          .eq("spot_visitor_trends.target_date", targetQueryDate),
        supabase
          .from("weather_town_cache")
          .select("county, county_district, weather_data"),
        supabase.from("region_age_weights").select("*"),
      ]);

      if (error) throw error;

      // 2. 데이터 가공 (맵핑)
      const weatherMap = {};
      weatherCache?.forEach((item) => {
        weatherMap[`${item.county}_${item.county_district}`] =
          item.weather_data || null;
      });

      const ageWeightMap = {};
      ageWeightsData?.forEach((row) => {
        ageWeightMap[row.signgu_name] = row;
      });

      // 3. 알고리즘 엔진 호출 (순수 데이터만 전달)
      const finalCandidates = await filterAndScoreSpots({
        allSpots: spotsData,
        preferenceWeights: preferenceWeights,
        selectedOrigin,
        travelDate,
        departureTime,
        travelTime,
        userMainCategoryLabels: targetMainLabels,
        selectedStyles,
        userAgeNum: parseInt(age.replace(/[^0-9]/g, "")) || 20,
        weatherCacheData: weatherMap,
        regionAgeWeightsMap: ageWeightMap,
        weatherCacheData: weatherMap,
      });

      if (finalCandidates.length === 0) {
        alert(
          "조건에 부합하는 명소가 발견되지 않았습니다. 범위를 조절해 보세요! ☺️",
        );
        return;
      }

      // 1. 결과 처리
      const candidatePool = finalCandidates
        .sort((a, b) => b.spotScore - a.spotScore)
        .slice(0, 15);

      // 2. 경로 데이터를 모두 불러옵니다.
      const allRoutes = await fetchAllTop10KakaoRoutes(candidatePool);

      // 3. 시간 조건(travelTime) 이내인 것들만 2차 필터링 & 정렬
      const validatedTop10 = candidatePool
        .map((spot, index) => {
          const route = allRoutes.find((r) => r.index === index);
          // 시간(분)을 60으로 나눠서 시간 단위로 환산
          const durationHours =
            (route?.kakaoTime || route?.haversineTime / 60) / 60;
          return { ...spot, durationHours, routeData: route };
        })
        .filter((spot) => spot.durationHours <= parseFloat(travelTime)) // 2시간 이내 조건 재검증
        .slice(0, 10); // 최종 10개만 확정!

      // 최소 추천 관광지 3개 미만이라면  나옴)
      if (validatedTop10.length < 3) {
        console.log("⚠️ 필터링 후 남은 명소 개수:", validatedTop10.length);
        alert(
          `조건을 만족하는 명소가 ${validatedTop10.length}개 발견되었습니다.`,
        );
      }

      // 4. 상태 저장 전
      const recommendationsWithData = validatedTop10.map((spot) => ({
        ...spot,
        // duration: 분 단위로 변환 (durationHours * 60)
        duration: Math.round(spot.durationHours * 60),
        // distance: 카카오 API값이 있으면 우선 사용, 없으면 하버사인 거리 사용
        distance:
          spot.routeData?.kakaoDist || spot.routeData?.haversineDist || 0,
      }));

      // 5. 상태 저장
      setRecommendations(recommendationsWithData);

      // 지도용 마스터 객체 만들기
      const newRoutesMaster = {};
      validatedTop10.forEach((spot, index) => {
        if (spot.routeData?.path) {
          newRoutesMaster[index] = spot.routeData.path;
        }
      });
      setKakaoRoutesMaster(newRoutesMaster);
      setVisibleCount(3);
      setSelectedPlaceIndex(0);
      try {
        const routesFromValidated = validatedTop10.map((spot, index) => ({
          ...spot.routeData,
          index: index, // 인덱스 매칭을 위해 필수
        }));
        setTop10Routes(routesFromValidated);
      } catch (e) {
        console.error("경로 데이터 수집 실패:", e);
      }
      const logEntries = validatedTop10.map((spot, index) => ({
        spot_id: String(spot.id),
        user_id: userId,
        rec_session_id: searchLog.id,
        age_group: age,
        gender: gender,
        recommended_rank: index + 1,
        recommend_score: spot.spotScore,
      }));

      supabase
        .from("recommendation_logs")
        .insert(logEntries)
        .then(() => {
          console.log("추천 로그 기록 완료");
        });

      showScreen("screen-result");
    } catch (err) {
      console.error("추천 데이터 파이프라인 크래시:", err);
      alert("매칭 연산 도중 에러가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };
  const logRecommendations = async (results, userProfile) => {
    const userId = getOrCreateUserId();
    const logs = results.map((spot, index) => ({
      spot_id: spot.id,
      gender: userProfile.gender,
      age_group: userProfile.age,
      recommended_rank: index + 1,
      recommend_score: spot.spotScore,
    }));

    await supabase.from("recommendation_logs").insert(logs);
  };

  const toggleMainCategory = (mainKey) => {
    const subCategories = TASTE_DATA_CONFIG[mainKey]; // ['바다', '산', ...]
    const isAllSelected = subCategories.every((sub) =>
      selectedStyles.includes(sub),
    );

    if (isAllSelected) {
      // 이미 다 선택되어 있으면 -> 전부 삭제
      setSelectedStyles(
        selectedStyles.filter((s) => !subCategories.includes(s)),
      );
    } else {
      // 일부만 선택되어 있거나 하나도 없으면 -> 전부 추가 (중복 제거)
      const newStyles = new Set([...selectedStyles, ...subCategories]);
      setSelectedStyles(Array.from(newStyles));
    }
  };

  const handleStyleToggle = (subName) => {
    // 만약 subName이 '배열'이라면? (한꺼번에 삭제)
    if (Array.isArray(subName)) {
      setSelectedStyles((prev) =>
        prev.filter((item) => !subName.includes(item)),
      );
    } else {
      // 기존처럼 단일 삭제/추가
      if (selectedStyles.includes(subName)) {
        setSelectedStyles(selectedStyles.filter((item) => item !== subName));
      } else {
        setSelectedStyles([...selectedStyles, subName]);
      }
    }
  };

  const showScreen = (id) => {
    setActiveScreen(id);
    window.scrollTo(0, 0);
    document.body.style.overflow = id === "screen-map" ? "hidden" : "unset";
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
              className="sb-font-h bg-white/80 backdrop-blur-md text-[#2D2A4A] text-[13px] px-5 py-2.5 rounded-full hover:bg-white border border-[#6B5FD8]/10 transition-all font-black flex items-center gap-2"
              onClick={() => showScreen("screen-intro")}>
              <Info size={16} className="text-[#6B5FD8]" />
              서비스 소개
            </button>
            <button
              className="sb-font-h bg-[#6B5FD8] text-white text-[13px] px-5 py-2.5 rounded-full hover:bg-[#5A4EBF] transition-all shadow-xl flex items-center gap-2"
              onClick={() => window.location.reload()}>
              <RefreshCw size={14} />
              새로고침
            </button>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center px-6 pt-10 pb-8">
          <div className="text-center mb-14 z-10">
            <h1 className="sb-hero text-6xl md:text-[80px] text-white mb-4 leading-[1.1] tracking-tighter">
              혼잡 없이, 나답게
            </h1>
            <h1 className="sb-hero text-6xl md:text-[80px] text-[#6B5FD8] mb-8 leading-[1.1] tracking-tighter">
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
                className="btn-ai py-5 text-lg sb-font-h"
                onClick={handleGetRecommendations}
                disabled={isLoading}>
                {isLoading ? (
                  <RefreshCw size={22} className="animate-spin" />
                ) : (
                  <Sparkles size={22} fill="currentColor" />
                )}
                {isLoading
                  ? "강원도 관광지 빅데이터 분석 중"
                  : "맞춤 여행지 추천받기"}
              </button>
            </div>
          </div>
        </main>
        <footer className="w-full py-12 flex justify-center items-center border-t border-white/40 relative z-10">
          <div className="text-gray-600 text-[14px] sb-font-h italic">
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
            className="bg-white/60 backdrop-blur-md text-[#2D2A4A] text-[13px] sb-font-h px-6 py-2 rounded-full shadow-lg flex items-center gap-2"
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
            <h2 className="text-4xl md:text-5xl text-white sb-hero mb-4 drop-shadow-lg">
              지금 가장 좋은 <span className="text-[#F4C84A]">강원도</span> 를
              찾아보세요
            </h2>
          </div>
          <div className="w-full max-w-4xl space-y-4">
            {recommendations.slice(0, visibleCount).map((item, index) => {
              const routeData =
                top10Routes.find((r) => r.index === index) || {};
              return (
                <RecommendationCard
                  key={item.id}
                  rank={index + 1}
                  {...item}
                  temp={item.temp}
                  kakaoDist={routeData.kakaoDist}
                  kakaoTime={routeData.kakaoTime}
                  haversineTime={routeData.haversineTime}
                  haversineDist={routeData.haversineDist}
                  startOrigin={selectedOrigin}
                  travelDate={travelDate}
                  departureTime={departureTime}
                  selectedStyles={selectedStyles}
                  age={age}
                  gender={gender}
                  recSessionId={recSessionId}
                  onCardClick={() => setSelectedPlaceIndex(index)}
                />
              );
            })}
            <div className="flex flex-col gap-4 mt-10 items-center">
              {visibleCount < recommendations.length ? (
                <button
                  className="bg-white/80 backdrop-blur-md border border-[#6B5FD8]/20 text-[#6B5FD8] sb-font-h px-12 py-4 rounded-2xl shadow-lg flex items-center gap-3"
                  onClick={handleMore}>
                  <Plus size={20} />
                  관광지 더 보기
                </button>
              ) : (
                <button
                  className="bg-white/80 backdrop-blur-md border border-gray-200 text-gray-500 sb-font-h px-12 py-4 rounded-2xl shadow-lg flex items-center gap-3"
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
            <span className="text-sm text-[#8884A8] ml-2 font-black">
              | Smart Route
            </span>
          </div>
          <button
            className="bg-[#6B5FD8] text-white text-[14px] sb-font-h px-8 py-3 rounded-full flex items-center gap-2"
            onClick={() => showScreen("screen-result")}>
            <List size={16} />
            목록으로 돌아가기
          </button>
        </header>
        <main className="flex-grow flex flex-col md:flex-row h-[calc(100vh-85px)] overflow-hidden">
          <div className="w-full md:w-[420px] bg-white shadow-2xl z-20 overflow-y-auto p-8 flex flex-col gap-8">
            <div className="flex flex-col gap-0">
              <div className="relative pl-10 pb-6">
                <div className="absolute left-0 top-0 w-7 h-7 bg-[#6B5FD8] border-4 border-white rounded-full z-10"></div>
                <div className="absolute left-3.5 top-7 bottom-0 w-0.5 border-dashed border-l-2 border-[#6B5FD8]"></div>
                <div className="text-xs text-[#8884A8] sb-font-h mb-1">
                  출발지
                </div>
                <div className="text-xl sb-font-h text-[#2D2A4A]">{origin}</div>
              </div>
              {recommendations.map((item, idx) => (
                <div
                  key={idx}
                  className={`relative pl-10 pb-6 cursor-pointer group transition-all ${selectedPlaceIndex === idx ? "opacity-100 font-bold" : "opacity-40"}`}
                  onClick={() => setSelectedPlaceIndex(idx)}>
                  <div
                    className={`absolute left-0 top-0 w-7 h-7 ${selectedPlaceIndex === idx ? "bg-[#6B5FD8]" : "bg-gray-400"} border-4 border-white rounded-full z-10 flex items-center justify-center text-[10px] text-white shadow-lg`}>
                    {idx + 1}
                  </div>
                  {idx < recommendations.length - 1 && (
                    <div className="absolute left-3.5 top-7 bottom-0 w-0.5 border-dashed border-l-2 border-[#6B5FD8]/25"></div>
                  )}
                  <div className="text-xs sb-font-h mb-1 text-[#8884A8]">
                    추천 목적지 {idx + 1}
                  </div>
                  <div className="text-lg sb-font-h text-[#2D2A4A]">
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
                <div className="text-[11px] sb-font-h opacity-80 mb-1 truncate">
                  선택지 : {recommendations[selectedPlaceIndex]?.name}
                </div>
                <div className="text-4xl sb-font-h italic">
                  {recommendations[selectedPlaceIndex]?.duration
                    ? `${recommendations[selectedPlaceIndex].duration} 분`
                    : "계산 중..."}
                </div>
                <div className="text-[13px] font-bold text-[#6B5FD8] mt-1">
                  실 주행 거리:{" "}
                  {recommendations[selectedPlaceIndex]?.distance || 0} km
                </div>
              </div>
            )}
          </div>
          <div className="flex-grow relative bg-white overflow-hidden">
            {recommendations.length > 0 ? (
              <KakaoMapView
                startOrigin={selectedOrigin}
                targetSpot={recommendations[selectedPlaceIndex]}
                routeLinePath={kakaoRoutesMaster[selectedPlaceIndex] || []}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                데이터가 없습니다.
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
