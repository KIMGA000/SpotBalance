import React, { useState } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  Snowflake,
  MapPin,
  Layers,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  X,
  Clock,
  Calendar,
} from "lucide-react";

export const RecommendationCard = ({
  name,
  subtitle,
  rank,
  address,
  weather,
  image,
  category_main,
  category_mid,
  category_sub,
  startOrigin,
  travelDate,
  departureTime,
  lat,
  lng,
  congestion_rate,
  spotScore,
  kakaoDist,
  kakaoTime,
  onCardClick,
  temp,
  selectedStyles,
  open_time,
  close_time,
  rest_weekly_days,
  is_always_open,
  is_no_holiday,
  ...rest
}) => {
  const getRestDaysText = (days) => {
    // DB에서 데이터가 어떻게 넘어오는지 확인 필요 (로그 확인했던 것)
    if (!days || days.length === 0) return "연중무휴";

    // 만약 days가 배열이 아니라면(문자열 등), 그대로 반환
    if (!Array.isArray(days)) return String(days);

    const dayMap = ["일", "월", "화", "수", "목", "금", "토"];
    return days.map((d) => dayMap[d]).join(", ") + " 휴무";
  };
  console.log("Spot Data Check:", {
    name,
    open_time,
    close_time,
    rest_weekly_days,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 👍 좋아요 / 👎 싫어요 상태 관리
  const [feedback, setFeedback] = useState(null); // null, 'like', 'dislike'

  const displayCongestion = congestion_rate !== undefined ? congestion_rate : 0;
  const displayFinalScore = spotScore !== undefined ? Math.round(spotScore) : 0;

  // 📅 "2026. 06. 12 (금)" 에서 요일 괄호를 제거하고 날짜만 안전하게 추출
  const displayPureDate = travelDate
    ? travelDate.replace(/\s*\([^)]*\)/g, "").trim()
    : "";

  // 🌤️ 기상청 코드 "맑음(1)" 이나 "흐림(4)" 에서 숫자 코드를 잘라내고 한국어만 추출
  const pureWeatherText = weather
    ? weather.replace(/\(\d+\)/g, "").trim()
    : "맑음";

  const activeImage =
    !image || image === "./600400.png" || image === "/600400.png"
      ? "/600400.png"
      : image;

  // 날씨 아이콘 매칭 엔진
  const renderCardWeatherIcon = () => {
    if (pureWeatherText.includes("맑음"))
      return <Sun size={16} strokeWidth={2.5} className="text-orange-400" />;
    if (pureWeatherText.includes("구름"))
      return (
        <CloudSun size={16} strokeWidth={2.5} className="text-orange-400" />
      );
    if (pureWeatherText.includes("흐림"))
      return <Cloud size={16} strokeWidth={2.5} className="text-gray-400" />;
    if (pureWeatherText.includes("비"))
      return (
        <CloudRain size={16} strokeWidth={2.5} className="text-blue-400" />
      );
    if (pureWeatherText.includes("눈"))
      return <Snowflake size={16} strokeWidth={2.5} className="text-sky-300" />;
    return <Sun size={16} strokeWidth={2.5} className="text-orange-400" />;
  };

  const formatCategory = (cat) => {
    if (!cat) return [];
    if (Array.isArray(cat)) return cat;
    if (typeof cat === "string") {
      if (cat.includes(",")) return cat.split(",").map((s) => s.trim());
      return [cat];
    }
    return [];
  };

  const allTags = Array.from(
    new Set([
      ...formatCategory(category_main),
      ...formatCategory(category_mid),
      ...formatCategory(category_sub),
    ]),
  ).filter(Boolean);

  // 👍 좋아요 클릭 (부모 카드 열기 이벤트 전파 방지)
  const handleLike = (e) => {
    e.stopPropagation();
    setFeedback(feedback === "like" ? null : "like");
  };

  // 👎 싫어요 클릭 (부모 카드 열기 이벤트 전파 방지)
  const handleDislike = (e) => {
    e.stopPropagation();
    setFeedback(feedback === "dislike" ? null : "dislike");
  };

  const openNaverMap = () => {
    const startName = encodeURIComponent(startOrigin?.name || "출발지");
    const url = `https://map.naver.com/index.nhn?slng=${startOrigin?.lng}&slat=${startOrigin?.lat}&stext=${startName}&elng=${lng}&elat=${lat}&etext=${encodeURIComponent(name)}&menu=route&pathType=0`;
    window.open(url, "_blank");
  };

  const openNaverReview = () => {
    // 플레이스 ID가 없더라도 위경도(`lng`, `lat`)와 인코딩된 `명소 명칭`이 결합되면 네이버 검색 허브가 매칭되는 리뷰 탭을 정확하게 띄워줍니다.
    const searchName = encodeURIComponent(name);
    const url = `https://map.naver.com/p/search/${searchName}?lng=${lng}&lat=${lat}&placePath=%2Freview&searchType=place&entry=plt&c=15.00,0,0,0,dh`;
    window.open(url, "_blank");
  };

  const getCongestionColor = (rate) => {
    if (rate <= 30) return "text-emerald-500"; // 여유 (Green)
    if (rate <= 60) return "text-blue-500"; // 보통 (Blue - 변경!)
    return "text-red-500"; // 혼잡 (Red)
  };

  // 혼잡도에 따른 상태 텍스트
  const getCongestionLabel = (rate) => {
    if (rate <= 30) return "여유";
    if (rate <= 60) return "보통";
    return "혼잡";
  };

  const getRecommendationReason = () => {
    // 1. 분류 (대분류/중분류 추출)
    const mainCat = Array.isArray(category_main)
      ? category_main.join("/")
      : category_main || "여행";
    const midCat = Array.isArray(category_mid)
      ? category_mid.join("/")
      : category_mid || "테마";

    // 2. 🌟 핵심 매칭 로직: allTags(관광지의 태그들)와 selectedStyles(유저의 취향들)의 교집합 확인
    // some()을 사용해 유저의 취향 중 하나라도 관광지의 태그에 포함되어 있는지 확인합니다.
    const isMatch = selectedStyles.some((style) => allTags.includes(style));

    const themePart = isMatch
      ? `${mainCat}의 ${midCat} 테마에 아주 잘 맞으며`
      : `${mainCat}의 ${midCat} 테마지만`;

    // 3. 날씨 (이모티콘 매칭)
    const weatherEmoji = pureWeatherText.includes("맑음")
      ? "☀️"
      : pureWeatherText.includes("흐림")
        ? "☁️"
        : "🌤️";
    const weatherPart = `오늘 날씨가 ${pureWeatherText}(${weatherEmoji})이고`;

    // 혼잡도 색상 및 라벨 가져오기
    const congestionColor = getCongestionColor(displayCongestion);
    const congestionLabel = getCongestionLabel(displayCongestion);

    return (
      <>
        오늘 날씨가 {pureWeatherText}({weatherEmoji})이고,{" "}
        <span className="font-black text-[#6B5FD8]">{mainCat}</span>의{" "}
        <span className="font-black text-[#6B5FD8]">{midCat}</span> 테마
        {isMatch ? "에 아주 잘 맞으며" : "이지만"}, 인파가{" "}
        <span className={`font-black ${congestionColor}`}>
          {displayCongestion}%
        </span>
        {congestionLabel === "여유"
          ? "로 매우 여유로워 힐링하기 딱 좋아요"
          : congestionLabel === "보통"
            ? "로 적당해서 둘러보기 좋은 시기예요"
            : "로 조금 붐비지만, 그만큼 매력 있는 곳이에요"}
        입니다.
      </>
    );
  };

  return (
    <>
      {/* ==================================================== */}
      {/* 1. 메인 결과 화면 노출용 전면 카드 유닛 */}
      {/* ==================================================== */}
      <div
        className="bg-white/55 backdrop-blur-md border border-white/60 p-5 md:p-6 rounded-[24px] shadow-xl flex flex-col hover:bg-white/70 transition-all duration-300 cursor-pointer transform active:scale-[0.99]"
        onClick={() => {
          if (onCardClick) onCardClick();
          setIsModalOpen(true);
        }}>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-6 w-full md:w-auto text-left">
            <div className="bg-gradient-to-b from-[#6B5FD8] to-[#5A4EBF] text-white w-12 h-[68px] rounded-2xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg">
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
              <div className="text-[10px] text-[#8884A8] font-bold whitespace-nowrap uppercase tracking-widest mb-1">
                혼잡도 ({getCongestionLabel(displayCongestion)})
              </div>
              <div
                className={`text-lg font-black ${getCongestionColor(displayCongestion)}`}>
                {displayCongestion}%
              </div>
            </div>

            <div className="text-center min-w-[90px]">
              <div className="text-[10px] text-[#8884A8] font-bold whitespace-nowrap uppercase tracking-widest mb-1.5">
                실시간 날씨
              </div>
              <div className="flex items-center gap-1.5 justify-center bg-gray-50/80 px-2.5 py-1.5 rounded-xl border border-gray-100/50">
                <div className="shrink-0 animate-pulse">
                  {renderCardWeatherIcon()}
                </div>
                <span className="text-sm font-black text-[#2D2A4A] tracking-tight">
                  {pureWeatherText}
                </span>
                <span className="text-sm font-black text-[#6B5FD8]">
                  {temp ? `${Math.round(temp)}°C` : "22°C"}
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#6B5FD8] to-[#8E85EE] text-white rounded-2xl px-5 py-3.5 shadow-lg text-center min-w-[95px] shrink-0">
              <div className="text-[9px] opacity-80 mb-0.5 font-bold uppercase tracking-widest">
                최종 점수
              </div>
              <div className="text-2xl font-black">
                {displayFinalScore}
                <span className="text-[10px] font-bold ml-0.5">/100</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3.5 border-t border-dashed border-[#2D2A4A]/10 flex items-center justify-between w-full">
          <span className="text-[11px] text-[#8884A8] font-black tracking-tight animate-pulse flex items-center gap-1">
            💡 자세히 보시려면 카드를 눌러주세요.
          </span>

          <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/40">
            <button
              onClick={handleLike}
              className={`p-1.5 rounded-lg transition-all transform active:scale-90 ${
                feedback === "like"
                  ? "bg-[#6B5FD8] text-white shadow-md"
                  : "text-gray-400 hover:bg-gray-200 hover:text-[#2D2A4A]"
              }`}
              title="좋아요">
              <ThumbsUp
                size={13}
                className={feedback === "like" ? "fill-white" : ""}
              />
            </button>
            <button
              onClick={handleDislike}
              className={`p-1.5 rounded-lg transition-all transform active:scale-90 ${
                feedback === "dislike"
                  ? "bg-red-500 text-white shadow-md"
                  : "text-gray-400 hover:bg-gray-200 hover:text-red-500"
              }`}
              title="싫어요">
              <ThumbsDown
                size={13}
                className={feedback === "dislike" ? "fill-white" : ""}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================== */}
      {/* 2. 브라우저용 반응형 상세 모달 창 */}
      {/* ==================================================== */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-[#2D2A4A]/20 backdrop-blur-[4px] z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsModalOpen(false)}>
          <div
            className="bg-white border border-white/80 rounded-[32px] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left"
            onClick={(e) => e.stopPropagation()}>
            <div className="w-full h-[180px] md:h-[220px] relative bg-gradient-to-br from-[#F0EFFF] to-[#E6E4FA] shrink-0">
              <img
                src={activeImage}
                alt={name}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-all backdrop-blur-sm">
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-4 bg-[#6B5FD8] text-white px-3.5 py-1 rounded-full text-xs font-black shadow-lg">
                추천순위 {rank}위
              </div>
            </div>

            <div className="p-5 md:p-7 flex-grow overflow-y-auto space-y-5 scrollbar-thin">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-black text-[#2D2A4A] tracking-tight leading-tight mb-1">
                    {name}
                  </h2>
                  <p className="text-[#6B5FD8] text-sm font-bold">{subtitle}</p>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-200/60">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${feedback === "like" ? "bg-[#6B5FD8] text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
                      <ThumbsUp size={12} />
                      좋아요
                    </button>
                    <button
                      onClick={handleDislike}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${feedback === "dislike" ? "bg-red-500 text-white" : "bg-white text-gray-500 border border-gray-200"}`}>
                      <ThumbsDown size={12} />
                      싫어요
                    </button>
                  </div>
                </div>
              </div>
              {/* 상세 모달 상단 추천 브리핑 박스 */}
              <div className="bg-[#6B5FD8]/5 p-4 rounded-xl border border-[#6B5FD8]/10 mb-4">
                <p className="text-sm text-[#2D2A4A] font-medium leading-relaxed">
                  {getRecommendationReason()}
                </p>
              </div>
              <div className="text-xs bg-[#6B5FD8]/5 p-3.5 rounded-xl border border-[#6B5FD8]/10 flex justify-between font-black text-[#2D2A4A]">
                <span className="flex items-center gap-1">
                  🚘 실시간 예상 소요시간:{" "}
                  <span className="text-[#6B5FD8] text-sm font-black">
                    {kakaoTime ? `${kakaoTime}분` : "계산 중..."}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  🛣️ 도로 거리:{" "}
                  <span className="text-emerald-600 text-sm font-black">
                    {kakaoDist ? `${kakaoDist}km` : "계산 중..."}
                  </span>
                </span>
              </div>

              <hr className="border-gray-100" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8884A8] font-black uppercase tracking-wider">
                  <Layers size={12} className="text-[#6B5FD8]" />
                  <span>테마 카테고리 태그</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-[#6B5FD8]/5 border border-[#6B5FD8]/10 text-[#6B5FD8] text-[12px] font-black px-2.5 py-0.5 rounded-lg">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-[#8884A8] font-black uppercase tracking-wider">
                  <MapPin size={12} className="text-[#6B5FD8]" />
                  <span>정확한 위치 주소</span>
                </div>
                <div className="text-[14px] text-[#2D2A4A] font-black bg-gray-50/70 px-3 py-2.5 rounded-xl border border-gray-100">
                  {address}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* 이용 시간 박스 */}
                <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-100 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[#6B5FD8]">
                    <Clock size={14} />
                    <span className="text-[10px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                      이용 시간
                    </span>
                  </div>
                  <div className="text-[13px] sb-font-h text-[#2D2A4A] leading-tight font-black truncate">
                    {is_always_open
                      ? "24시간 상시 개방"
                      : open_time && close_time
                        ? `${open_time.substring(0, 5)} ~ ${close_time.substring(0, 5)}`
                        : "운영 시간 정보 없음"}
                  </div>
                </div>

                {/* 휴무일 박스 */}
                <div className="bg-gray-50/90 p-3 rounded-xl border border-gray-100 flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[#6B5FD8]">
                    <Calendar size={14} />
                    <span className="text-[10px] sb-font-h text-[#8884A8] uppercase tracking-widest font-black">
                      휴무일
                    </span>
                  </div>
                  <div className="text-[13px] sb-font-h text-[#2D2A4A] leading-tight font-black truncate">
                    {is_no_holiday
                      ? "연중무휴"
                      : rest_weekly_days && rest_weekly_days.length > 0
                        ? getRestDaysText(rest_weekly_days)
                        : "휴무 정보 없음"}
                  </div>
                </div>
              </div>

              {/* 🌟 [명세 변경 반영 완료] 카카오 네비 연계 버튼을 '네이버 리뷰보기' 서비스로 리포지셔닝 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={openNaverMap}
                  className="w-full bg-[#03C75A] text-white py-3.5 rounded-xl text-[14px] font-black flex items-center justify-center gap-2 shadow-md hover:brightness-95 transition-all">
                  <span>네이버 지도 길찾기</span>
                  <ExternalLink size={14} />
                </button>
                <button
                  onClick={openNaverReview}
                  className="w-full bg-[#2DB400] text-white py-3.5 rounded-xl text-[14px] font-black flex items-center justify-center gap-2 shadow-md hover:brightness-95 transition-all">
                  <span>네이버 리뷰보기</span>
                  <ExternalLink size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
