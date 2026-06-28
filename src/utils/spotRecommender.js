const actionWeights = {
  detail_view: 1,
  review_view: 2,
  like: 2,
  like_cancel: -2,
  route_search: 5,
  dislike: -3,
  dislike_cancel: 3,
};

export async function getUserPreferenceWeights(supabase, userId) {
  const { data: logs } = await supabase
    .from("user_action_logs")
    .select("spot_id, action_type, main_category, mid_category, sub_category")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!logs || logs.length === 0) return {};

  const latestStates = {};
  logs.forEach((log) => {
    if (
      log.action_type === "like_cancel" ||
      log.action_type === "dislike_cancel"
    ) {
      latestStates[log.spot_id] = { action: null };
    } else {
      latestStates[log.spot_id] = {
        action: log.action_type,
        categories: {
          main: log.main_category,
          mid: log.mid_category,
          sub: log.sub_category,
        },
      };
    }
  });

  const weights = {};
  Object.values(latestStates).forEach(({ action, categories }) => {
    if (!action || !categories) return;

    const weight = actionWeights[action] || 0;

    ["main", "mid", "sub"].forEach((level) => {
      let cats = categories[level];
      const catArray = typeof cats === "string" ? JSON.parse(cats) : cats;

      catArray?.forEach((cat) => {
        weights[cat] = (weights[cat] || 0) + weight;
      });
    });
  });

  return weights;
}

export function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
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

function calculateTemperaturePenalty(month, tempValue) {
  if (tempValue === null) return 0.1;
  if (tempValue >= 33 || tempValue <= -5) return 0.6;
  if (tempValue >= 15 && tempValue <= 25) return 1.0;

  if (
    (tempValue >= 10 && tempValue <= 14) ||
    (tempValue >= 26 && tempValue <= 29)
  )
    return 0.9;
  if (
    (tempValue >= 5 && tempValue <= 9) ||
    (tempValue >= 30 && tempValue <= 32)
  )
    return 0.8;

  return 0.7;
}

export function findBestWeather(weatherArray, arrivalDateTime) {
  return weatherArray.reduce((closest, current) => {
    // 1. 날씨 데이터 예보시각 파싱
    const forecastTime = parseWeatherDate(current["예보시각"]);

    // 2. 시간 차이 계산
    const diff = Math.abs(arrivalDateTime.getTime() - forecastTime.getTime());
    const closestDiff = Math.abs(
      arrivalDateTime.getTime() -
        parseWeatherDate(closest["예보시각"]).getTime(),
    );

    return diff < closestDiff ? current : closest;
  }, weatherArray[0]);
}

// 기존 날씨 문자열 파서 활용
function parseWeatherDate(dateStr) {
  const datePart = dateStr.slice(0, 10);
  let timePart = dateStr.includes("오전")
    ? "06:00"
    : dateStr.includes("오후")
      ? "18:00"
      : dateStr.slice(11, 16);
  return new Date(`${datePart}T${timePart}`);
}
export async function filterAndScoreSpots({
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
  preferenceWeights,
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
    const spotMains = Array.isArray(spot.category_main)
      ? spot.category_main
      : [spot.category_main].filter(Boolean);
    const isMainMatched = spotMains.some((mainVal) =>
      userMainCategoryLabels.includes(mainVal),
    );
    if (!isMainMatched) {
      stage1Fail++;
      return;
    }

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
        const realRoadDist = distanceKm * 1.5;
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

  stage2PassResults.forEach((spot) => {
    const name = spot.spot_name;
    const distanceKm = getHaversineDistance(
      Number(selectedOrigin.lat),
      Number(selectedOrigin.lng),
      Number(spot.lat),
      Number(spot.lng),
    );
    const realRoadDist = distanceKm * 1.5;
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

    const subCategoryText = spot.category_sub || "";
    const isBothBoth =
      subCategoryText.includes("실내") && subCategoryText.includes("실외");
    const isPureOutdoor = !isBothBoth && subCategoryText.includes("실외");

    let localTempRaw = 22.0;
    let weatherScore = 1.0;
    let rainFactor = 1.0;
    let tempFactor = 1.0;

    const cacheKey = `${spot.county}_${spot.county_district}`;
    const townWeather = weatherCacheData ? weatherCacheData[cacheKey] : null;

    let targetWeather = null; // 여기서 안전하게 선언

    if (townWeather) {
      const weatherArray =
        typeof townWeather === "string" ? JSON.parse(townWeather) : townWeather;

      if (Array.isArray(weatherArray) && weatherArray.length > 0) {
        // 1. [정밀 매칭] 도착 예정 시간 계산
        const [depH, depM] = departureTime.split(":").map(Number);
        const arrivalDate = new Date(targetQueryDate);
        arrivalDate.setHours(depH, depM, 0, 0);

        // travelTime 문자열에서 숫자 추출
        const travelHours = parseFloat(travelTime.replace(/[^0-9.]/g, "")) || 0;
        arrivalDate.setHours(arrivalDate.getHours() + travelHours);

        // 2. [오타 수정] ffindBestWeather -> findBestWeather
        targetWeather = findBestWeather(weatherArray, arrivalDate);

        // 3. 점수 계산
        if (targetWeather) {
          const rawTempStr = String(targetWeather["기온(TMP)"] || "");
          if (rawTempStr.includes("~")) {
            const temps = rawTempStr
              .split("~")
              .map((t) => parseFloat(t.replace(/[^0-9.-]/g, "")));
            localTempRaw = !isNaN((temps[0] + temps[1]) / 2)
              ? (temps[0] + temps[1]) / 2
              : 22.0;
          } else {
            const numericTemp = parseFloat(rawTempStr.replace(/[^0-9.-]/g, ""));
            localTempRaw = !isNaN(numericTemp) ? numericTemp : 22.0;
          }

          const ptyValue = String(targetWeather["강수형태(PTY)"] || "0");
          const hasRealRainOrSnow =
            ptyValue !== "0" && !ptyValue.includes("없음");

          if (isPureOutdoor) {
            rainFactor = hasRealRainOrSnow ? 0.7 : 1.0;
            tempFactor = calculateTemperaturePenalty(travelMonth, localTempRaw);
          }
          weatherScore = rainFactor * tempFactor;
        }
      }
    } else {
      console.warn(
        `⚠️ 날씨 데이터 매칭 실패 (Fallback 22°C 적용): ${spot.spot_name}`,
      );
      localTempRaw = 10;
      tempFactor = 1.0;
      weatherScore = 1.0;
    }

    // 스코어링 연산부
    const spotMids = Array.isArray(spot.category_mid)
      ? spot.category_mid
      : [spot.category_mid].filter(Boolean);
    const hasStyleMatch = selectedStyles.some((style) =>
      spotMids.includes(style),
    );
    const preferenceScore = hasStyleMatch ? 1.2 : 0.8;

    const personalBoost = (preferenceWeights?.[spot.category_mid] || 0) * 0.01;

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

    const rawScore =
      congestionScore * preferenceScore * ageScore * weatherScore;
    const maxPossibleScore = 1.0 * 1.2 * 1.2 * 1.0;
    const finalScoreClipped = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          (rawScore / maxPossibleScore) * 100 * (1 + personalBoost) * 100,
        ) / 100,
      ),
    );

    filteredResults.push({
      ...spot,
      name: spot.spot_name,
      subtitle: spot.spot_description || "낭만 가득한 강원도 추천 플레이스",
      spotScore: finalScoreClipped,
      congestion_rate: congestionRate,
      weather: (() => {
        if (!townWeather) return "오류";
        let status = targetWeather["하늘상태(SKY)"]
          .replace(/\(.*?\)/g, "")
          .trim();
        return status.replace(/\s+/g, "");
      })(),
      temp: localTempRaw,
      weather_raw: typeof targetWeather !== "undefined" ? targetWeather : null,
      is_outdoor: isPureOutdoor,
      weather_final_score: weatherScore,
      weather_rain_reason:
        rainFactor === 0.7 ? "강수 감지 ➔ 0.7배" : "강수 없음 ➔ 1.0배",
      weather_temp_reason:
        tempFactor === 1.0
          ? "쾌적 ➔ 1.0배"
          : tempFactor === 0.9
            ? "다소 불편 ➔ 0.9배"
            : tempFactor === 0.8
              ? "불편 ➔ 0.8배"
              : "매우 불편/극한 ➔ 0.7/0.6배",
      address: spot.address,
      image: spot.image_url,
      lat: spot.lat,
      lng: spot.lng,
      category_main: spot.category_main,
      category_mid: spot.category_mid,
      category_sub: spot.category_sub,
      open_time: spot.open_time,
      close_time: spot.close_time,
      rest_weekly_days: spot.rest_weekly_days,
      is_always_open: spot.is_always_open,
      is_no_holiday: spot.is_no_holiday,
      calculatedRoadDist: realRoadDist,
      distance: realRoadDist.toFixed(1),
      duration: estimatedTime.toFixed(1),
      calculatedTime: estimatedTime * 60,
      debugLog: {
        result: {
          rawMultiplication: rawScore.toFixed(4),
          maxPossible: maxPossibleScore.toFixed(4),
        },
        normalizedScores: {
          congestion: congestionScore.toFixed(4),
          preference: preferenceScore.toFixed(4),
          ageWeight: ageScore.toFixed(4),
          weatherMatrix: weatherScore.toFixed(4),
        },
      },
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

  console.log(
    "%c🏆 대망의 SpotBalance 맞춤형 추천 Top 10 가중치 세부 추적 리포트",
    "color: #2e7d32; font-weight: bold; font-size: 14px;",
  );

  const top10Spots = [...filteredResults]
    .sort((a, b) => b.spotScore - a.spotScore)
    .slice(0, 10);

  top10Spots.forEach((candidate, index) => {
    const log = candidate.debugLog;
    if (!log) return;

    const spotMids = Array.isArray(candidate.category_mid)
      ? candidate.category_mid
      : [candidate.category_mid].filter(Boolean);
    const midDetail = spotMids
      .map((mid) => `${mid}:${(preferenceWeights?.[mid] || 0).toFixed(1)}`)
      .join(", ");
    const totalActionScore = spotMids.reduce(
      (acc, mid) => acc + (preferenceWeights?.[mid] || 0),
      0,
    );

    const baseScore100 =
      (parseFloat(log.result.rawMultiplication) /
        parseFloat(log.result.maxPossible)) *
      100;
    const boostRate = 1 + totalActionScore * 0.01;

    console.group(
      `[Rank ${index + 1}] 명소: ${candidate.name} ➔ 🏆 최종 환산 점수: ${candidate.spotScore}점`,
    );
    if (candidate.weather_raw) {
      console.log(
        `%c[🔍 매칭된 DB 예보 원본]`,
        "color: #7e57c2; font-weight: bold;",
        candidate.weather_raw,
      );
    } else {
      console.log(
        `%c[❌ DB 예보 매칭 실패]`,
        "color: #e53935; font-weight: bold;",
        `주소 불일치로 인해 Fallback 기본값(22.0℃)이 계산에 적용되었습니다.`,
      );
    }
    console.log(
      `%c[A. 기상 분석]`,
      "color: #039be5; font-weight: bold;",
      `${candidate.is_outdoor ? "실외" : "실내"} | 현지 기온: ${candidate.temp.toFixed(1)}℃ | 최종 날씨 계수: ${candidate.weather_final_score.toFixed(4)}`,
    );
    console.log(
      `%c[B. 기온 상세 사유]`,
      "color: #039be5;",
      `기온분석: ${candidate.temp.toFixed(1)}℃는 ${candidate.weather_temp_reason}`,
    );
    console.log(
      `%c[C. 기초 점수 산출]`,
      "color: #f57c00; font-weight: bold;",
      `((혼잡:${log.normalizedScores.congestion} × 취향:${log.normalizedScores.preference} × 연령:${log.normalizedScores.ageWeight} × 날씨:${log.normalizedScores.weatherMatrix}) / ${parseFloat(log.result.maxPossible).toFixed(3)}) × 100 ➔ ${baseScore100.toFixed(2)}점`,
    );
    console.log(
      `%c[D. 개인화]`,
      "color: #9c27b0; font-weight: bold;",
      `매칭 중분류[${midDetail}] ➔ 총점:${totalActionScore.toFixed(1)}점 ➔ 부스트율:+${(totalActionScore * 0.01 * 100).toFixed(1)}%`,
    );
    console.log(
      `%c[E. 최종 결합식]`,
      "color: #2ca02c; font-weight: bold;",
      `기초(${baseScore100.toFixed(2)}점) × 보너스(${boostRate.toFixed(3)}배) ➔ ${candidate.spotScore}점`,
    );
    console.groupEnd();
  });

  return filteredResults;
}
