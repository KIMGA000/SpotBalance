import React, { useState } from "react";
// 🌟 헤더(App.jsx)와 100% 매치되는 무결점 아이콘 컴포넌트 임포트
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Snowflake,
  Clock,
  CalendarX,
  MapPin,
  Navigation,
} from "lucide-react";

export const RecommendationCard = ({
  name,
  subtitle,
  score,
  congestion,
  suitability,
  rank,
  hours,
  closed,
  address,
  onShowMap,
  weather,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // 🌟 헤더의 날씨 판별 로직과 아이콘 톤앤매너를 100% 일치시킵니다.
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

  return (
    <div
      className={`flip-card ${isFlipped ? "flipped" : ""}`}
      onClick={() => setIsFlipped(!isFlipped)}>
      <div className="flip-card-inner">
        {/* 카드 앞면 */}
        <div className="flip-card-front bg-white/55 backdrop-blur-md border border-white/60 p-5 md:p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 hover:bg-white/70 transition-all duration-300">
          <div className="flex items-center gap-6 w-full md:w-auto text-left">
            <div className="bg-[#6B5FD8] text-white w-12 h-[68px] rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg shadow-[#6B5FD8]/25">
              {rank}
            </div>
            <div>
              <h3 className="text-2xl sb-font-h text-[#2D2A4A] mb-1 leading-tight tracking-tight">
                {name}
              </h3>
              <div className="flex items-center gap-3">
                <p className="text-[#6B5FD8] sb-font-h text-sm tracking-tight opacity-90">
                  {subtitle}
                </p>
                <div className="flex items-center gap-1 bg-white/40 px-2.5 py-0.5 rounded-full">
                  {/* 🌟 구버전 <i> 태그 대신 정밀 매칭된 리액트 날씨 컴포넌트 탑재 */}
                  {renderCardWeatherIcon()}
                  <span className="text-[11px] sb-font-h text-[#2D2A4A]/70 font-bold">
                    {weather}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between md:justify-end gap-6 md:gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-white/30">
            <div className="text-center">
              <div className="text-[10px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
                혼잡 지수
              </div>
              <div className="text-lg sb-font-h text-red-500 font-black">
                {congestion}%
              </div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-[#8884A8] sb-font-h uppercase tracking-widest mb-1">
                적합도
              </div>
              <div className="text-lg sb-font-h text-blue-600 font-black">
                {suitability}%
              </div>
            </div>
            <div className="bg-gradient-to-br from-[#6B5FD8] to-[#8E85EE] text-white rounded-2xl px-6 py-4 shadow-lg text-center min-w-[100px]">
              <div className="text-[9px] sb-font-h opacity-80 mb-0.5 uppercase tracking-widest">
                추천 점수
              </div>
              <div className="text-2xl sb-font-h font-black">
                {score}
                <span className="text-[10px] font-bold ml-0.5">/100</span>
              </div>
            </div>
          </div>
        </div>

        {/* 카드 뒷면 */}
        <div className="flip-card-back bg-white/95 backdrop-blur-xl border-2 border-[#6B5FD8]/45 p-4 md:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-col gap-2 w-full md:w-[75%] text-left justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="bg-gray-50/90 p-2.5 rounded-lg border border-gray-100 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-[#6B5FD8]" />
                  <span className="text-[8px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                    이용 시간
                  </span>
                </div>
                <div className="text-[12px] sb-font-h text-[#2D2A4A] leading-tight truncate font-black">
                  {hours}
                </div>
              </div>
              <div className="bg-gray-50/90 p-2.5 rounded-lg border border-gray-100 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <CalendarX size={13} className="text-[#6B5FD8]" />
                  <span className="text-[8px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                    휴무일
                  </span>
                </div>
                <div className="text-[12px] sb-font-h text-[#2D2A4A] leading-tight truncate font-black">
                  {closed}
                </div>
              </div>
            </div>
            <div className="bg-gray-50/90 p-2.5 rounded-lg border border-gray-100 flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <MapPin size={13} className="text-[#6B5FD8]" />
                <span className="text-[8px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                  주소
                </span>
              </div>
              <div className="text-[12px] sb-font-h text-[#2D2A4A] leading-tight font-black">
                {address}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center gap-2.5 w-full md:w-[22%] border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-4">
            <button
              className="w-full bg-[#6B5FD8] text-white py-3 rounded-xl sb-font-h text-[14px] shadow-lg hover:bg-[#5A4EBF] transition-all flex flex-col items-center justify-center gap-1 font-black"
              onClick={(e) => {
                e.stopPropagation();
                onShowMap();
              }}>
              <Navigation size={18} fill="currentColor" />
              <span>길찾기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
