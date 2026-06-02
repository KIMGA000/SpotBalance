import React from "react";

export function ServiceIntro({ onBack }) {
  return (
    <div className="flex flex-col min-h-screen sb-root relative">
      <header className="w-full px-6 md:px-12 py-8 flex justify-between items-center z-50">
        <div className="text-3xl md:text-4xl sb-font-h text-[#2D2A4A] tracking-tighter">
          Spot<span className="text-[#6B5FD8]">Balance</span>
          <span className="text-xs text-[#8884A8] ml-2 font-black uppercase">
            | About
          </span>
        </div>
        <button
          className="bg-white/60 backdrop-blur-md text-[#2D2A4A] text-[13px] sb-font-h px-5 py-2 rounded-full hover:bg-white/90 transition-all flex items-center gap-2 shadow-lg"
          onClick={onBack}>
          <i className="ti ti-arrow-left"></i>메인으로 돌아가기
        </button>
      </header>

      <main className="flex-grow flex flex-col items-center px-4 md:px-6 py-10 z-10">
        <div className="max-w-3xl w-full bg-white/90 backdrop-blur-lg rounded-[32px] p-8 md:p-12 shadow-2xl border border-white/40">
          <h2 className="text-3xl md:text-4xl sb-font-h text-[#2D2A4A] mb-6 tracking-tight">
            💡 Spot<span className="text-[#6B5FD8]">Balance</span>는 어떤
            서비스인가요?
          </h2>

          <div className="space-y-6 text-[#2D2A4A]/90 leading-relaxed font-medium text-base md:text-lg">
            <p>
              여행을 떠날 때마다 마주하는{" "}
              <strong>인기 관광지의 긴 대기 줄</strong>과, 어디로 가야 할지
              결정하기 어려운 <strong>막막한 순간</strong>을 해결하기 위해
              태어났습니다.
            </p>

            <div className="p-5 bg-[#6B5FD8]/5 rounded-2xl border border-[#6B5FD8]/10">
              <h3 className="font-bold text-[#6B5FD8] mb-2">
                📊 데이터 기반 스마트 가중치 시스템
              </h3>
              <p className="text-sm text-[#555273]">
                사용자의 출발지, 이동 제한 시간, 세부 취향, 연령대별 선호도
                트렌드와 함께 한국관광공사 DataLab의{" "}
                <strong>방문객 집중률 추이 데이터</strong>, 그리고 기상청의
                <strong>실시간 날씨 정보</strong>를 하나의 점수로 결합합니다.
              </p>
            </div>

            <p>
              복잡한 비교 없이 오직 데이터로 증명된{" "}
              <strong>'지금 가장 완벽한 강원도'</strong>를 단 하나의 직관적인
              밸런스 점수로 도출하여 쾌적하고 나다운 여행을 선물합니다.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
