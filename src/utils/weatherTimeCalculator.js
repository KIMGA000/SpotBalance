// src/utils/weatherTimeCalculator.js

export function getVilageFcstBaseTime() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let date = now.getDate();
  const hour = now.getHours();

  // 기상청 단기예보(getVilageFcst) 공식 발표 시각 리스트
  const hoursList = [2, 5, 8, 11, 14, 17, 20, 23];

  // 현재 시각보다 작거나 같은 최근 발표 시각 찾기
  let baseHour = 23; // 기본값은 어제 23시 대비
  let isYesterday = false;

  // 기상청 데이터 생성 리드타임(약 10~15분)을 고려하여 현재 시각 매칭
  const checkHour = now.getMinutes() < 15 ? hour - 1 : hour;

  if (checkHour < 2) {
    isYesterday = true;
    baseHour = 23;
  } else {
    // 현재 시각 직전의 발표 타임 찾기
    for (let i = hoursList.length - 1; i >= 0; i--) {
      if (hoursList[i] <= checkHour) {
        baseHour = hoursList[i];
        break;
      }
    }
  }

  // 어제 날짜 처리
  if (isYesterday) {
    now.setDate(now.getDate() - 1);
    year = now.getFullYear();
    month = now.getMonth() + 1;
    date = now.getDate();
  }

  const baseDate = `${year}${String(month).padStart(2, "0")}${String(date).padStart(2, "0")}`;
  const baseTime = `${String(baseHour).padStart(2, "0")}00`;

  return { baseDate, baseTime };
}
