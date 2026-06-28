import React from "react";

export function ServiceIntro({ onBack }) {
  // 별 생성 함수
  const stars = Array.from({ length: 30 }).map((_, i) => ({
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 2 + 1}px`,
    duration: `${Math.random() * 3 + 2}s`,
    delay: `${Math.random() * 3}s`,
  }));

  return (
    <div className="sb-root relative min-h-screen overflow-x-hidden flex flex-col bg-[#F8F6E3]">
      {/* 반짝이는 별 배경 */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {stars.map((star, i) => (
          <div
            key={i}
            className="absolute bg-white rounded-full opacity-20 animate-pulse"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animation: `twinkling ${star.duration} ease-in-out infinite alternate`,
              animationDelay: star.delay,
            }}
          />
        ))}
      </div>

      {/* 헤더 */}
      <header className="w-full px-6 md:px-12 py-8 flex justify-between items-center z-50">
        <div className="text-4xl sb-font-h text-[#2D2A4A] tracking-tighter">
          Spot<span className="text-[#6B5FD8]">Balance</span>
        </div>
        <button
          className="sb-font-h bg-[#6B5FD8] text-white text-[14px] px-6 py-2.5 rounded-full hover:bg-[#5A4EBF] transition-all transform active:scale-95 shadow-xl flex items-center gap-2"
          onClick={onBack}>
          <i className="ti ti-arrow-back text-base"></i> 메인으로 돌아가기
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-grow flex flex-col items-center px-6 pt-10 pb-16 z-10">
        <div className="bg-white/95 backdrop-blur-lg rounded-[40px] p-8 md:p-16 shadow-2xl border border-white max-w-5xl w-full">
          {/* 1. 서비스 미션 */}
          <div className="text-center md:text-left flex flex-col md:flex-row items-center gap-16 border-b border-gray-100 pb-12 mb-12">
            <div className="md:w-1/2">
              <h2 className="text-3xl sb-font-h text-[#2D2A4A] mb-5 leading-tight whitespace-nowrap">
                "짧은 여행 + 확실한 만족"
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0077B6] to-[#6B5FD8]">
                  효율 중심의 강원도 탐험가
                </span>
                들을 위해
              </h2>
              <p className="text-gray-600 font-semibold leading-loose text-[15px]">
                여기저기 정보를 뒤지며 복잡한 비교를 하는 여행은 끝났습니다.
                <br />
                떠날 때마다 마주하는 인기 관광지의 긴 대기 줄과,
                <br />
                어디로 가야 할지 결정하기 어려운 순간은 끝났습니다.
                <br />
                <br />
                스팟 밸런스는 기상청의 날씨 정보, 관광지의 혼잡 추이율,
                <br />
                사용자의 연령 및 취향 정보를 토대로 최적의 장소를 제안합니다.
              </p>
            </div>

            {/* 핵심 가치 */}
            <div className="md:w-1/2 bg-[#F7F6FB] rounded-3xl p-8 border border-gray-50 w-full flex flex-col gap-4">
              {[
                {
                  icon: "ti-search",
                  color: "text-[#0077B6]",
                  bg: "bg-[#0077B6]/10",
                  label: "시간 절약",
                  text: "비교 검색 시간 단축",
                },
                {
                  icon: "ti-thumb-up",
                  color: "text-[#6B5FD8]",
                  bg: "bg-[#6B5FD8]/10",
                  label: "만족도 증대",
                  text: "개인 최적화 점수 큐레이션",
                },
                {
                  icon: "ti-map-2",
                  color: "text-[#F4C84A]",
                  bg: "bg-[#F4C84A]/10",
                  label: "동선 최적화",
                  text: "실시간 연동 드라이브 맵",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-4 bg-white p-4 rounded-2xl shadow-sm">
                  <div
                    className={`${item.bg} ${item.color} w-10 h-10 rounded-xl flex items-center justify-center`}>
                    <i className={`ti ${item.icon} text-xl`}></i>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 font-bold">
                      {item.label}
                    </div>
                    <div className="text-[14px] sb-font-h text-[#2D2A4A]">
                      {item.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. 핵심 데이터 엔진 */}
          <div className="mb-16">
            <h2 className="text-3xl sb-font-h text-[#2D2A4A] text-center mb-10">
              스마트 추천 엔진의 3대 핵심 데이터
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: "ti-sun-wind",
                  color: "text-[#F4C84A]",
                  label: "기상 상태 실시간 반영",
                  desc: "기상 데이터를 분석하여 맑은 날에는 실외와 실내 모두를, 날씨가 궂은 날에는 실내 관광지와 아늑한 장소를 우선 순위로 밸런싱합니다.",
                },
                {
                  icon: "ti-users",
                  color: "text-[#0077B6]",
                  label: "실시간 유동인구 예측",
                  desc: "강원도 관광객 혼잡 추이율 데이터로 혼잡 지수를 예측합니다. 인파에 치이는 스트레스 없이 여유로운 힐링을 보낼 수 있는 숨겨진 명당을 발굴합니다.",
                },
                {
                  icon: "ti-chart-bar",
                  color: "text-[#6B5FD8]",
                  label: "관광 통계 취향 매칭",
                  desc: "사용자가 입력한 개인 취향과 데이터, 통계를 기반으로 100점 만점 기준의 맞춤 추천 점수를 산출합니다.",
                },
              ].map((feat, idx) => (
                <div
                  key={idx}
                  className="border-2 border-gray-50 bg-[#F7F6FB]/50 rounded-3xl p-8 text-center flex flex-col items-center gap-4 hover:translate-y-[-6px] transition-transform duration-300">
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center ${feat.color} bg-white text-4xl shadow-lg`}>
                    <i className={`ti ${feat.icon}`}></i>
                  </div>
                  <h3 className="text-lg sb-font-h text-[#2D2A4A]">
                    {feat.label}
                  </h3>
                  <p className="text-gray-500 text-[13px] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. CTA */}
          <div className="text-center bg-gradient-to-br from-[#2D2A4A] to-[#6B5FD8] text-white rounded-[32px] p-12 shadow-2xl relative overflow-hidden">
            {/* [추가] CTA 박스 전용 별 배경 */}
            <div className="absolute inset-0 z-0">
              <div
                className="absolute bg-white rounded-full opacity-30 animate-pulse"
                style={{
                  top: "20%",
                  left: "10%",
                  width: "2px",
                  height: "2px",
                }}></div>
              <div
                className="absolute bg-white rounded-full opacity-30 animate-pulse"
                style={{
                  top: "60%",
                  left: "80%",
                  width: "3px",
                  height: "3px",
                  animationDelay: "1s",
                }}></div>
              <div
                className="absolute bg-white rounded-full opacity-30 animate-pulse"
                style={{
                  top: "40%",
                  left: "50%",
                  width: "2px",
                  height: "2px",
                  animationDelay: "0.5s",
                }}></div>
              <div
                className="absolute bg-white rounded-full opacity-30 animate-pulse"
                style={{
                  top: "80%",
                  left: "90%",
                  width: "4px",
                  height: "4px",
                  animationDelay: "2s",
                }}></div>
            </div>

            <div className="relative z-10">
              <h3 className="text-3xl sb-font-h mb-3">
                지금 당신만의 여행 균형을 찾아보세요
              </h3>
              <p className="text-sm md:text-base opacity-80 font-medium mb-8">
                취향도, 날씨도, 혼잡도도 SpotBalance가 완벽하게 계산해 드립니다.
              </p>
              <button
                className="bg-white text-[#6B5FD8] font-black px-12 py-5 rounded-[20px] text-lg hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-3 mx-auto"
                onClick={onBack}>
                <i className="ti ti-sparkles text-xl"></i> 스마트 강원도 여행
                시작하기
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="w-full px-16 py-12 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-[14px] sb-font-h z-10">
        <div className="italic">
          &copy; 2026 SpotBalance. All rights reserved.
        </div>
        <a
          href="mailto:spotbalance@gmail.com"
          className="flex items-center gap-2 hover:text-[#6B5FD8] transition-colors">
          <i className="ti ti-mail"></i> 오류 제보 및 문의하기
        </a>
      </footer>
    </div>
  );
}
