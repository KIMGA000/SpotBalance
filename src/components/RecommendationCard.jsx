import React, { useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Snowflake,
  MapPin,
  Navigation,
  Layers,
} from "lucide-react";

export const RecommendationCard = ({
  name,
  subtitle,
  rank,
  address,
  onShowMap,
  weather,
  image,
  category_main,
  category_mid,
  category_sub,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // 1층 고정 스코어 매핑 스펙
  const fixedCongestion = 50;
  const fixedSuitability = 70;
  const fixedWeatherScore = 90;
  const fixedFinalScore = Math.round(
    (fixedCongestion + fixedSuitability + fixedWeatherScore) / 3,
  );

  // 헤더 매칭용 기상 아이콘 디스플레이 엔진
  const renderCardWeatherIcon = () => {
    const text = weather || "맑음";
    if (text.includes("맑음"))
      return <Sun size={16} strokeWidth={2.5} className="text-orange-400" />;
    if (text.includes("구름"))
      return (
        <CloudSun size={16} strokeWidth={2.5} className="text-orange-400" />
      );
    if (text.includes("흐림"))
      return <Cloud size={16} strokeWidth={2.5} className="text-gray-400" />;
    if (text.includes("비"))
      return (
        <CloudRain size={16} strokeWidth={2.5} className="text-blue-400" />
      );
    if (text.includes("눈"))
      return <Snowflake size={16} strokeWidth={2.5} className="text-sky-300" />;
    return <Sun size={16} strokeWidth={2.5} className="text-orange-400" />;
  };

  // 🌟 [버그 원인 제거] 대중소 카테고리 내의 '모든 다중 값'들을 해시태그 배열로 정밀 분쇄 추출하는 기하학적 파이프라인
  const renderHashTags = () => {
    const allTags = [];

    // 대분류 배열/문자열 처리
    if (category_main) {
      if (Array.isArray(category_main)) allTags.push(...category_main);
      else allTags.push(category_main);
    }
    // 중분류 배열/문자열 처리
    if (category_mid) {
      if (Array.isArray(category_mid)) allTags.push(...category_mid);
      else allTags.push(category_mid);
    }
    // 소분류 배열/문자열 처리 (쉼표나 공백이 섞여 들어와도 전부 조각내어 1차원 태그로 정렬)
    if (category_sub) {
      if (Array.isArray(category_sub)) {
        category_sub.forEach((sub) => {
          if (sub.includes(","))
            allTags.push(...sub.split(",").map((s) => s.trim()));
          else allTags.push(sub);
        });
      } else if (typeof category_sub === "string") {
        if (category_sub.includes(","))
          allTags.push(...category_sub.split(",").map((s) => s.trim()));
        else allTags.push(category_sub);
      }
    }

    // 중복 제거 가드 적용 후 최종 개별 해시태그 컴포넌트 렌더링
    const uniqueTags = Array.from(new Set(allTags.filter(Boolean)));

    return uniqueTags.map((tag, idx) => {
      let tagColor = "text-[#6B5FD8]";

      return (
        <span
          key={idx}
          className={`${tagColor} text-[13px] font-black tracking-tight cursor-default select-none`}>
          #{tag}
        </span>
      );
    });
  };

  return (
    <div
      className={`flip-card ${isFlipped ? "flipped" : ""}`}
      onClick={() => setIsFlipped(!isFlipped)}>
      <div className="flip-card-inner">
        {/* 1. 카드 앞면 (지표 전광판 유지) */}
        <div className="flip-card-front bg-white/55 backdrop-blur-md border border-white/60 p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-white/70 transition-all duration-300">
          <div className="flex items-center gap-6 w-full md:w-auto text-left">
            <div className="bg-gradient-to-b from-[#6B5FD8] to-[#5A4EBF] text-white w-12 h-[68px] rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-[#6B5FD8]/25">
              {rank}
            </div>
            <div>
              <h3 className="text-2xl sb-font-h text-[#2D2A4A] mb-1 leading-tight tracking-tight font-black">
                {name}
              </h3>
              <p className="text-[#6B5FD8] sb-font-h text-sm tracking-tight opacity-90 font-bold">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-5 md:gap-7 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-white/30">
            <div className="text-center">
              <div className="text-[10px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1 font-bold whitespace-nowrap">
                혼잡 추이
              </div>
              <div className="text-lg sb-font-h text-red-500 font-black">
                {fixedCongestion}%
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1 font-bold whitespace-nowrap">
                적합도(성별, 나이)
              </div>
              <div className="text-lg sb-font-h text-blue-600 font-black">
                {fixedSuitability}%
              </div>
            </div>

            <div className="text-center">
              <div className="text-[10px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1 font-bold whitespace-nowrap">
                날씨 ({weather || "맑음"})
              </div>
              <div className="text-lg sb-font-h text-emerald-600 font-black">
                {fixedWeatherScore}점
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#6B5FD8] to-[#8E85EE] text-white rounded-2xl px-5 py-3.5 shadow-lg text-center min-w-[95px] shrink-0">
              <div className="text-[9px] sb-font-h opacity-80 mb-0.5 uppercase tracking-widest font-bold">
                최종 점수
              </div>
              <div className="text-2xl sb-font-h font-black">
                {fixedFinalScore}
                <span className="text-[10px] font-bold ml-0.5">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. 카드 뒷면 */}
        <div className="flip-card-back bg-white/95 backdrop-blur-xl border-2 border-[#6B5FD8]/45 p-4 md:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-[78%] text-left items-center md:items-stretch">
            <div className="w-[150px] h-[105px] bg-gradient-to-br from-[#F0EFFF] to-[#E6E4FA] rounded-xl overflow-hidden shadow-sm shrink-0 relative border border-[#6B5FD8]/10 flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 select-none">
                  <span className="text-[14px] font-black tracking-widest text-[#6B5FD8]/60 uppercase sb-font-h">
                    No Image
                  </span>
                  <span className="text-[9px] font-bold text-[#8884A8]/60">
                    SpotBalance
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col justify-between flex-grow w-full py-1.5 gap-3 md:gap-0">
              {/* 테마 해시태그 줄 */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Layers size={12} className="text-[#6B5FD8]" />
                  <span className="text-[9px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                    테마 해시태그
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-1 mt-0.5">
                  {renderHashTags()}{" "}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1">
                  <MapPin size={12} className="text-[#6B5FD8]" />
                  <span className="text-[9px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                    정확한 위치 주소
                  </span>
                </div>
                <div className="text-[14px] sb-font-h text-[#2D2A4A] leading-tight font-black truncate pl-0.5">
                  {address}
                </div>
              </div>
            </div>
          </div>

          {/* 길찾기 버튼 */}
          <div className="flex flex-col items-center justify-center gap-2.5 w-full md:w-[20%] border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4 h-full">
            <button
              className="w-full h-full min-h-[52px] bg-[#6B5FD8] text-white py-3 rounded-xl sb-font-h text-[14px] shadow-lg hover:bg-[#5A4EBF] transition-all flex md:flex-col items-center justify-center gap-1.5 font-black transform active:scale-95"
              onClick={(e) => {
                e.stopPropagation();
                onShowMap();
              }}>
              <Navigation size={16} fill="currentColor" />
              <span>실시간 길찾기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
