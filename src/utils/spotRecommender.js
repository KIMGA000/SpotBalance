/**
 * 🗺️ 두 위경도 좌표 사이의 하버사인 직선 거리 구하기 (단위: km)
 */
export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 🌡️ [가영님 신규 기획 표준 엄격 반영] 5단계 임계점 구간형 기온 패널티 연산 엔진
 */
function calculateTemperaturePenalty(month, tempValue) {
  // ❶ [최우선 가드] 극한 기온 오버라이딩 시스템 (폭염 33℃ 이상 / 한파 -1℃ 이하 ➔ 무조건 0.6)
  if (tempValue >= 33 || tempValue <= -1) {
    return 0.6;
  }

  let targetMin = 19,
    targetMax = 23; // 봄·가을 기본값

  if (month >= 6 && month <= 8) {
    targetMin = 25;
    targetMax = 28; // 여름
  } else if (month === 12 || month === 1 || month === 2) {
    targetMin = 18;
    targetMax = 20; // 겨울
  }

  // ❷ 쾌적 구간 (기준 범위 내부) ➔ 1.0
  if (tempValue >= targetMin && tempValue <= targetMax) {
    return 1.0;
  }

  // 이탈 오차 절대값 계산
  const diff =
    tempValue < targetMin ? targetMin - tempValue : tempValue - targetMax;

  // ❸ 다소 불편 (기준에서 ±3℃ 이내) ➔ 0.9
  if (diff <= 3) {
    return 0.9;
  }
  // ❹ 불편 (기준에서 ±6℃ 이내) ➔ 0.8
  if (diff <= 6) {
    return 0.8;
  }
  // ❺ 매우 불편 (기준에서 ±6℃ 초과) ➔ 0.7
  return 0.7;
}

/**
 * 🚀 SpotBalance 빅데이터 정밀 필터링 및 최종 점수 연산 파이프라인
 */
export function filterAndScoreSpots({
  allSpots,
  selectedOrigin,
  travelDate,
  departureTime,
  travelTime,
  userMainCategoryLabels,
  selectedStyles,
  userAgeNum,
  weatherCacheData,
  regionAgeWeightsMap,
}) {
  const match = travelDate.match(/(\d{4})\.\s*(\d{2})\.\s*(\d{2})/);
  const targetQueryDate = match
    ? `${match[1]}-${match[2]}-${match[3]}`
    : new Date().toISOString().split("T")[0];

  const dateObj = new Date(targetQueryDate);
  const travelMonth = dateObj.getMonth() + 1;
  const dayOfWeek = dateObj.getDay();

  const weekdaysText = ["일", "월", "화", "수", "목", "금", "토"];
  const currentDayText = weekdaysText[dayOfWeek];

  const isWeekendOrFriday = [0, 5, 6].includes(dayOfWeek);
  const currentSpeed = isWeekendOrFriday ? 60 : 70;

  const isOverCondition = travelTime.includes("초과");
  const parsedLimitHours = parseFloat(travelTime.replace(/[^0-9.]/g, ""));
  const maxHours = isNaN(parsedLimitHours) ? 3 : parsedLimitHours;

  let stage1Fail = 0;
  let stage2HolidayFail = 0;
  let stage2TimeFail = 0;
  let stage3DistanceFail = 0;

  const stage2PassResults = [];

  allSpots.forEach((spot) => {
    const name = spot.spot_name || "이름 없는 명소";
    const spotMains = Array.isArray(spot.category_main)
      ? spot.category_main
      : [spot.category_main].filter(Boolean);

    // 🔴 [STAGE 1] 취향 필터
    const isMainMatched = spotMains.some((mainVal) =>
      userMainCategoryLabels.includes(mainVal),
    );
    if (!isMainMatched) {
      stage1Fail++;
      return;
    }

    // 🟠 [STAGE 2] 시공간 복합 마감 필터
    if (!(spot.is_always_open && spot.is_no_holiday)) {
      if (
        spot.rest_weekly_days &&
        spot.rest_weekly_days.includes(currentDayText)
      ) {
        stage2HolidayFail++;
        return;
      }

      if (!spot.is_always_open) {
        if (!spot.open_time || !spot.close_time) {
          stage2TimeFail++;
          return;
        }

        const [depH, depM] = departureTime.split(":").map(Number);
        const distanceKm = getHaversineDistance(
          Number(selectedOrigin.lat),
          Number(selectedOrigin.lng),
          Number(spot.lat),
          Number(spot.lng),
        );
        const realRoadDist = distanceKm * 1.3;
        const durationMinutes = Math.round((realRoadDist / currentSpeed) * 60);
        const arrivalMinutes = depH * 60 + depM + durationMinutes;

        if (spot.last_entry_time) {
          const [leH, leM] = spot.last_entry_time.split(":").map(Number);
          if (arrivalMinutes > leH * 60 + leM) {
            stage2TimeFail++;
            return;
          }
        } else {
          const [clH, clM] = spot.close_time.split(":").map(Number);
          if (arrivalMinutes > clH * 60 + clM - 60) {
            stage2TimeFail++;
            return;
          }
        }
      }
    }
    stage2PassResults.push(spot);
  });

  const isShortageFallbackActive = stage2PassResults.length <= 3;
  const filteredResults = [];

  // 🗺️ 3차 거리 필터링 구역
  stage2PassResults.forEach((spot) => {
    const name = spot.spot_name;
    const distanceKm = getHaversineDistance(
      Number(selectedOrigin.lat),
      Number(selectedOrigin.lng),
      Number(spot.lat),
      Number(spot.lng),
    );
    const realRoadDist = distanceKm * 1.3;
    const estimatedTime = realRoadDist / currentSpeed;

    if (!isShortageFallbackActive) {
      if (isOverCondition) {
        if (estimatedTime <= maxHours) {
          stage3DistanceFail++;
          return;
        }
      } else {
        if (estimatedTime > maxHours) {
          stage3DistanceFail++;
          return;
        }
      }
    }

    // 📊 4차 최종 가중치 스코어링 결합부
    const spotMids = Array.isArray(spot.category_mid)
      ? spot.category_mid
      : [spot.category_mid].filter(Boolean);
    const hasStyleMatch = selectedStyles.some((style) =>
      spotMids.includes(style),
    );
    const preferenceScore = hasStyleMatch ? 1.2 : 0.8;

    const trendRecord = spot.spot_visitor_trends && spot.spot_visitor_trends[0];
    const congestionRate = trendRecord
      ? parseFloat(trendRecord.visitor_count)
      : 0;
    const congestionScore = (100 - congestionRate) / 100;

    const ageGroupKey =
      userAgeNum >= 70 ? "age70" : `age${Math.floor(userAgeNum / 10) * 10}`;
    const targetWeightField = `${ageGroupKey}_weight`;
    let ageScore = 1.0;

    const regionWeightRow = regionAgeWeightsMap
      ? regionAgeWeightsMap[spot.county]
      : null;
    if (regionWeightRow && regionWeightRow[targetWeightField] !== undefined) {
      ageScore = parseFloat(regionWeightRow[targetWeightField]);
    }

    let weatherScore = 1.0;
    const subCategoryText = spot.category_sub || "";
    const isBothBoth =
      subCategoryText.includes("실내") && subCategoryText.includes("실외");
    const isPureIndoor = !isBothBoth && subCategoryText.includes("실내");
    const isPureOutdoor = !isBothBoth && subCategoryText.includes("실외");

    const townWeather = weatherCacheData
      ? weatherCacheData[`${spot.county}_${spot.county_district}`]
      : null;
    let localTempRaw = 22;

    if (townWeather) {
      const ptyValue = townWeather["강수형태(PTY)"] || "0";
      const tempValue = parseFloat(townWeather["기온(TMP)"] || "22");
      localTempRaw = tempValue;

      let rainFactor = 1.0;
      let tempFactor = 1.0;

      const hasRealRainOrSnow =
        ptyValue !== "0" &&
        !ptyValue.includes("없음") &&
        (ptyValue.includes("비") ||
          ptyValue.includes("눈") ||
          ptyValue.includes("소나기"));

      if (hasRealRainOrSnow) {
        rainFactor = isPureOutdoor ? 0.7 : 1.0;
      }

      if (isPureOutdoor) {
        tempFactor = calculateTemperaturePenalty(travelMonth, tempValue);
      }

      // 비/눈과 기온이 겹치면 강수 * 기온 공식 결합
      weatherScore = rainFactor * tempFactor;
    }

    const rawScore =
      congestionScore * preferenceScore * ageScore * weatherScore;
    const maxPossibleScore = 1.0 * 1.2 * 1.2 * 1.0;
    const finalScorePercent = (rawScore / maxPossibleScore) * 100;

    filteredResults.push({
      name: spot.spot_name,
      subtitle: spot.spot_description || "낭만 가득한 강원도 추천 플레이스",
      spotScore: Math.min(100, Math.round(finalScorePercent * 100) / 100),
      congestion_rate: congestionRate,
      weather: townWeather ? townWeather["하늘상태(SKY)"] || "맑음" : "맑음",
      temp: localTempRaw,
      address: spot.address,
      image: spot.image_url,
      lat: spot.lat,
      lng: spot.lng,
      category_main: spot.category_main,
      category_mid: spot.category_mid,
      category_sub: spot.category_sub,
      calculatedRoadDist: realRoadDist,
      distance: realRoadDist.toFixed(1),
      duration: estimatedTime.toFixed(1),
      calculatedTime: estimatedTime * 60,
    });
  });

  console.log(
    "%c--------------------------------------------------",
    "color: #ccc;",
  );
  console.log(
    `%c📊 알고리즘 최종 필터링 분석 통계 리포트`,
    "font-weight: bold; color: #2D2A4A;",
  );
  console.log(`- 전체 원본 수: ${allSpots.length}개`);
  console.log(`- 1차 [취향 불일치] 탈락: ${stage1Fail}개`);
  console.log(`- 2차 [휴무일 정보] 탈락: ${stage2HolidayFail}개`);
  console.log(`- 2차 [운영시간 마감] 탈락: ${stage2TimeFail}개`);
  console.log(`- 3차 [하버사인 시간 범위] 탈락: ${stage3DistanceFail}개`);
  console.log(
    `%c- 모든 필터를 통과한 순수 최종 후보군: ${filteredResults.length}개`,
    "font-weight: bold; color: #6B5FD8;",
  );
  console.log(
    "%c==================================================",
    "color: #6B5FD8; font-weight: bold; font-size: 13px;",
  );
  // =======================================================
  // 🏆 최종 Top 10 가중치 및 날씨 연산 과정 초정밀 로깅 (변수 스코프 완치본)
  // =======================================================
  console.log(
    "%c🏆 대망의 SpotBalance 맞춤형 추천 Top 10 가중치 세부 추적 리포트",
    "color: #2e7d32; font-weight: bold; font-size: 14px;",
  );

  const logTop10 = [...filteredResults]
    .sort((a, b) => b.spotScore - a.spotScore)
    .slice(0, 10);

  logTop10.forEach((candidate, index) => {
    const spotSource = allSpots.find((s) => s.spot_name === candidate.name);
    if (!spotSource) return;

    const spotMids = Array.isArray(spotSource.category_mid)
      ? spotSource.category_mid
      : [spotSource.category_mid].filter(Boolean);
    const hasStyleMatch = selectedStyles.some((style) =>
      spotMids.includes(style),
    );
    const finalPrefWeight = hasStyleMatch ? 1.2 : 0.8;

    const trendRecord =
      spotSource.spot_visitor_trends && spotSource.spot_visitor_trends[0];
    const rawCongestion = trendRecord
      ? parseFloat(trendRecord.visitor_count)
      : 0;
    const finalCongWeight = (100 - rawCongestion) / 100;

    const ageGroupKey =
      userAgeNum >= 70 ? "age70" : `age${Math.floor(userAgeNum / 10) * 10}`;
    const targetWeightField = `${ageGroupKey}_weight`;
    let finalAgeWeight = 1.0;
    const regionWeightRow = regionAgeWeightsMap
      ? regionAgeWeightsMap[spotSource.county]
      : null;
    if (regionWeightRow && regionWeightRow[targetWeightField] !== undefined) {
      finalAgeWeight = parseFloat(regionWeightRow[targetWeightField]);
    }

    // 🌟 [완치 구역] 로그 내부 스코프에 유실되었던 실내/실외 공간 판정 변수 완벽 복원!
    const subCategoryText = spotSource.category_sub || "";
    const logIsBothBoth =
      subCategoryText.includes("실내") && subCategoryText.includes("실외");
    const logIsPureIndoor = !logIsBothBoth && subCategoryText.includes("실내");
    const logIsPureOutdoor = !logIsBothBoth && subCategoryText.includes("실외");

    let ptyLog = "0 (없음)",
      tmpLog = "22.0°C";
    let seasonLog = "봄·가을 (기준: 19~23℃)";
    if (travelMonth >= 6 && travelMonth <= 8) seasonLog = "여름 (기준: 25~28℃)";
    else if (travelMonth === 12 || travelMonth === 1 || travelMonth === 2)
      seasonLog = "겨울 (기준: 18~20℃)";

    let rainFactorLog = "1.0 (감점 없음)",
      tempFactorLog = "1.0 (쾌적 구간 1.0)";
    let weatherCalcProcess = "";

    const townWeather = weatherCacheData
      ? weatherCacheData[`${spotSource.county}_${spotSource.county_district}`]
      : null;

    if (townWeather) {
      const ptyValue = townWeather["강수형태(PTY)"] || "0";
      const tempValue = parseFloat(townWeather["기온(TMP)"] || "22");
      ptyLog = ptyValue;
      tmpLog = `${tempValue.toFixed(1)}°C`;

      const hasRealRainOrSnow =
        ptyValue !== "0" &&
        !ptyValue.includes("없음") &&
        (ptyValue.includes("비") ||
          ptyValue.includes("눈") ||
          ptyValue.includes("소나기"));

      if (logIsBothBoth || logIsPureIndoor) {
        weatherCalcProcess = `↳ 🛡️ [공간 가드]: 실내 및 복합 공간은 패널티 제로! (일괄 1.0)`;
      } else if (logIsPureOutdoor) {
        if (hasRealRainOrSnow) rainFactorLog = "0.7 (🌧️ 강수 패널티 타격)";
        const finalT = calculateTemperaturePenalty(travelMonth, tempValue);

        let levelText = "쾌적 구간";
        if (finalT === 0.6) levelText = "🚨 극한 기온(폭염/한파)";
        else if (finalT === 0.7) levelText = "매우 불편(±6℃ 초과)";
        else if (finalT === 0.8) levelText = "불편(±6℃ 이내)";
        else if (finalT === 0.9) levelText = "다소 불편(±3℃ 이내)";

        tempFactorLog = `${finalT.toFixed(1)} (${levelText} | 계측: ${tempValue}℃)`;
        weatherCalcProcess = `↳ 🌧️ 강수: ${rainFactorLog} | 🌡️ 기온: ${tempFactorLog}\n      ↳ 🧮 날씨 최종 수식: [강수] ${hasRealRainOrSnow ? "0.7" : "1.0"} × [기온] ${finalT.toFixed(1)} = ${(hasRealRainOrSnow ? 0.7 * finalT : 1.0 * finalT).toFixed(2)}`;
      }
    }

    console.log(
      `%c[Rank ${index + 1}] 명소: ${candidate.name} ➔ 🏆 최종 환산 점수: ${candidate.spotScore}점\n` +
        `   📝 [1단계 필터 메타]: 분류 [${spotSource.category_main} > ${subCategoryText}]\n` +
        `   🧩 [4차 취향 가중치]: ${finalPrefWeight === 1.2 ? "🟢 1.2 (유저 선호 해시태그 일치 버프)" : "🔴 0.8 (선호 비일치 감점)"}\n` +
        `   🚗 [4차 혼잡 가중치]: 데이터랩 지수 ${rawCongestion.toFixed(2)}% ➔ x${finalCongWeight.toFixed(4)}\n` +
        `   👥 [4차 연령 가중치]: 지역 [${spotSource.county}] ➔ x${finalAgeWeight.toFixed(3)}\n` +
        `   🌤️ [4차 날씨 신규 5단계 구간 연산 과정]\n` +
        `      ├─ 기상청 동네예보 ➔ [강수 형태]: ${ptyLog} | [현재 기온]: ${tmpLog} | [계절]: ${seasonLog}\n` +
        `      ${weatherCalcProcess}\n` +
        `   🧮 최종 수식 검증 스펙 ➔ (혼잡: ${finalCongWeight.toFixed(3)} × 취향: ${finalPrefWeight} × 연령: ${finalAgeWeight.toFixed(2)} × 날씨: ${(candidate.spotScore ? (candidate.spotScore * 1.44) / 100 / (finalCongWeight * finalPrefWeight * finalAgeWeight) : 1.0).toFixed(2)}) / 1.44 × 100 = ${candidate.spotScore}점`,
      "color: #1b5e20; line-height: 1.6;",
    );
  });
  console.log(
    "%c==================================================",
    "color: #6B5FD8; font-weight: bold; font-size: 13px;",
  );

  return filteredResults;
}
