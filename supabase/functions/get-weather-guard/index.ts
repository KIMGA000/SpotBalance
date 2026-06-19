import { serve } from "std/http/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WeatherItem {
  예보시각: string;
  "기온(TMP)": string | null;
  "하늘상태(SKY)": string | null;
  "강수형태(PTY)": string | null;
  "강수확률(POP)": string | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const { county, district, userTargetDate, isBatchTrigger } = body;

    // =======================================================
    // 🔄 [모드 1] 매일 아침 06:10 크론 배치 모드 (병렬 초고속 리필)
    // =======================================================
    if (isBatchTrigger === true) {
      console.log("⏰ [Supabase Cron] spots에서 고유 읍면동 좌표 추출 중...");

      const { data: townMaster, error: townError } = await supabaseClient
        .from("spots")
        .select("county, county_district, nx, ny")
        .order("county");

      if (townError || !townMaster) throw new Error("관광지 쿼리 실패");

      const uniqueTowns = Array.from(
        new Map(
          townMaster.map(
            (item) => [`${item.county}_${item.county_district}`, item],
          ),
        ).values(),
      );

      let uniqueGrids = Array.from(
        new Set(uniqueTowns.map((g) => `${g.nx}_${g.ny}`)),
      )
        .map((str) => {
          const [nx, ny] = str.split("_");
          return { nx: parseInt(nx), ny: parseInt(ny) };
        });

      console.log(
        `📡 초고속 병렬 다운로드 시작 (대상 격자 수: ${uniqueGrids.length}개)...`,
      );

      // 1. 🌟 Promise.all을 이용해 기상청 API를 동시에 찔러 2초만에 데이터 수집!
      const gridWeatherMap = new Map<string, WeatherItem[]>();
      const promises = uniqueGrids.map(async (grid) => {
        try {
          const freshShortData = await fetchShortTermFromKma(grid.nx, grid.ny);
          if (freshShortData && freshShortData.length > 0) {
            gridWeatherMap.set(`${grid.nx}_${grid.ny}`, freshShortData);
          }
        } catch (e) {
          console.error(`격자 에러 스킵: ${grid.nx}, ${grid.ny}`, e);
        }
      });
      await Promise.all(promises);

      // 2. 레코드 결합
      const upsertRecords = [];
      for (const town of uniqueTowns) {
        const shortData = gridWeatherMap.get(`${town.nx}_${town.ny}`) || [];
        if (shortData.length === 0) continue; // 데이터 없는 동네는 패스

        try {
          const regLand = ["강릉", "동해", "삼척", "속초", "양양"].some((p) =>
              town.county.includes(p)
            )
            ? "11D20000"
            : "11D10000";
          const midData = await fetchLiveMidTermOnly(regLand, "11D20401");

          upsertRecords.push({
            county: town.county,
            county_district: town.county_district,
            nx: town.nx,
            ny: town.ny,
            weather_data: [...shortData, ...midData],
            updated_at: new Date().toISOString(),
          });
        } catch (midErr) {
          console.error("중기 에러 스킵:", midErr);
        }
      }

      // 3. DB 적재
      if (upsertRecords.length > 0) {
        console.log(
          `💾 최종 ${upsertRecords.length}개의 읍면동 캐시 DB 적재 가동!`,
        );
        const { error: upsertError } = await supabaseClient.from(
          "weather_town_cache",
        ).upsert(upsertRecords);
        if (upsertError) throw upsertError;
      }

      return new Response(
        JSON.stringify({ success: true, count: upsertRecords.length }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // =======================================================
    // 🔮 [모드 2] 유저 실시간 관광지 추천 가드 모드 (기존 동일)
    // =======================================================
    const { data: cache } = await supabaseClient.from("weather_town_cache")
      .select("*").eq("county", county).eq("county_district", district)
      .single();
    if (!cache) {
      return new Response(JSON.stringify({ error: "No Cache" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const finalMatch = findMatchedWeather(cache.weather_data, userTargetDate);
    return new Response(JSON.stringify({ success: true, data: finalMatch }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

function findMatchedWeather(
  array: WeatherItem[],
  targetDateStr: string,
): WeatherItem | null {
  const targetDayStr = targetDateStr.split(" ")[0];
  return array.find((item) => item.예보시각.includes(targetDayStr)) || array[0];
}

async function fetchShortTermFromKma(
  nx: number,
  ny: number,
): Promise<WeatherItem[] | null> {
  const SERVICE_KEY =
    "H/KnO7wIwXvNlGLkCZ4HKsHpbfFsowyslgHQuP9yliVcTGtZutc+4caIz2uzbSO09pIQUy/4+sqMFcmcKlSmXQ==";
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const url =
    `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${
      encodeURIComponent(SERVICE_KEY)
    }&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${todayStr}&base_time=0500&nx=${nx}&ny=${ny}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.response?.body?.items?.item;
    if (!items) return null;

    const timeSlots: Record<string, WeatherItem> = {};
    for (const item of items) {
      const { category, fcstDate, fcstTime, fcstValue } = item;
      const key = `${fcstDate}_${fcstTime}`;

      if (!timeSlots[key]) {
        timeSlots[key] = {
          예보시각: `${fcstDate.slice(0, 4)}-${fcstDate.slice(4, 6)}-${
            fcstDate.slice(6)
          } ${fcstTime.slice(0, 2)}:${fcstTime.slice(2)}`,
          "기온(TMP)": null,
          "하늘상태(SKY)": null,
          "강수형태(PTY)": null,
          "강수확률(POP)": null,
        };
      }

      if (category === "TMP") timeSlots[key]["기온(TMP)"] = `${fcstValue}°C`;
      else if (category === "SKY") {
        timeSlots[key]["하늘상태(SKY)"] = {
          "1": "맑음(1)",
          "3": "구름많음(3)",
          "4": "흐림(4)",
        }[fcstValue as string] || fcstValue;
      } else if (category === "PTY") {
        timeSlots[key]["강수형태(PTY)"] = {
          "0": "없음(0)",
          "1": "비(1)",
          "2": "비/눈(2)",
          "3": "눈(3)",
          "4": "소나기(4)",
        }[fcstValue as string] || fcstValue;
      } else if (category === "POP") {
        timeSlots[key]["강수확률(POP)"] = `${fcstValue}%`;
      }
    }
    return Object.keys(timeSlots).sort().map((k) => timeSlots[k]);
  } catch {
    return null;
  }
}

async function fetchLiveMidTermOnly(
  regLand: string,
  regTemp: string,
): Promise<WeatherItem[]> {
  const SERVICE_KEY =
    "H/KnO7wIwXvNlGLkCZ4HKsHpbfFsowyslgHQuP9yliVcTGtZutc+4caIz2uzbSO09pIQUy/4+sqMFcmcKlSmXQ==";
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const baseTm = `${todayStr}0600`;

  const landUrl =
    `http://apis.data.go.kr/1360000/MidFcstInfoService/getMidLandFcst?serviceKey=${
      encodeURIComponent(SERVICE_KEY)
    }&pageNo=1&numOfRows=10&dataType=JSON&regId=${regLand}&tmFc=${baseTm}`;
  const tempUrl =
    `http://apis.data.go.kr/1360000/MidFcstInfoService/getMidTa?serviceKey=${
      encodeURIComponent(SERVICE_KEY)
    }&pageNo=1&numOfRows=10&dataType=JSON&regId=${regTemp}&tmFc=${baseTm}`;

  try {
    const landRes = await (await fetch(landUrl)).json();
    const landItem = landRes.response?.body?.items?.item[0];
    const tempRes = await (await fetch(tempUrl)).json();
    const tempItem = tempRes.response?.body?.items?.item[0];

    const midRecords: WeatherItem[] = [];
    for (let day = 4; day <= 10; day++) {
      const futureDate = new Date(
        new Date().getTime() + day * 24 * 60 * 60 * 1000,
      );
      const dateStr = futureDate.toISOString().slice(0, 10);

      if (day <= 7) {
        midRecords.push({
          예보시각: `${dateStr} 오전 (06:00)`,
          "하늘상태(SKY)": landItem?.[`wf${day}Am`] || "구름많음",
          "강수형태(PTY)": (landItem?.[`wf${day}Am`] || "").includes("비")
            ? "비(1)"
            : "없음(0)",
          "강수확률(POP)": `${landItem?.[`rnSt${day}Am`] || 30}%`,
          "기온(TMP)": `${tempItem?.[`taMin${day}`] || 16}°C`,
        });
        midRecords.push({
          예보시각: `${dateStr} 오후 (18:00)`,
          "하늘상태(SKY)": landItem?.[`wf${day}Pm`] || "구름많음",
          "강수형태(PTY)": (landItem?.[`wf${day}Pm`] || "").includes("비")
            ? "비(1)"
            : "없음(0)",
          "강수확률(POP)": `${landItem?.[`rnSt${day}Pm`] || 30}%`,
          "기온(TMP)": `${tempItem?.[`taMax${day}`] || 24}°C`,
        });
      } else {
        midRecords.push({
          예보시각: `${dateStr} 하루 통합`,
          "하늘상태(SKY)": landItem?.[`wf${day}`] || "맑음",
          "강수형태(PTY)": (landItem?.[`wf${day}`] || "").includes("비")
            ? "비(1)"
            : "없음(0)",
          "강수확률(POP)": `${landItem?.[`rnSt${day}`] || 20}%`,
          "기온(TMP)": `${tempItem?.[`taMin${day}`] || 15}°C ~ ${
            tempItem?.[`taMax${day}`] || 25
          }°C`,
        });
      }
    }
    return midRecords;
  } catch {
    return [];
  }
}
