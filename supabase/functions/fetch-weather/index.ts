import { serve } from "std/http/server";
import { createClient } from "supabase-js";

// 🌐 CORS 에러 차단용 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// 🌤️ 기상청 API 응답 아이템에 대한 TypeScript 타입 정의 (any 타입 경고 완벽 제거)
interface WeatherItem {
  category: string;
  fcstValue: string;
  fcstDate: string;
  fcstTime: string;
  nx: number;
  ny: number;
}

// 📅 단기예보 업데이트 주기를 계산해주는 백엔드 전용 타이밍 함수
function getVilageFcstBaseTime() {
  const now = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);

  let year = kstDate.getFullYear();
  let month = kstDate.getMonth() + 1;
  let date = kstDate.getDate();
  const hour = kstDate.getHours();

  const hoursList = [2, 5, 8, 11, 14, 17, 20, 23];
  let baseHour = 23;
  let isYesterday = false;

  const checkHour = kstDate.getMinutes() < 15 ? hour - 1 : hour;

  if (checkHour < 2) {
    isYesterday = true;
    baseHour = 23;
  } else {
    for (let i = hoursList.length - 1; i >= 0; i--) {
      if (hoursList[i] <= checkHour) {
        baseHour = hoursList[i]; // 🌟 오타 교정 완료: boxHour -> baseHour
        break;
      }
    }
  }

  if (isYesterday) {
    kstDate.setDate(kstDate.getDate() - 1);
    year = kstDate.getFullYear();
    month = kstDate.getMonth() + 1;
    date = kstDate.getDate();
  }

  const baseDate = `${year}${String(month).padStart(2, "0")}${
    String(date).padStart(2, "0")
  }`;
  const baseTime = `${String(baseHour).padStart(2, "0")}00`;

  return { baseDate, baseTime };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const weatherServiceKey = Deno.env.get("VITE_WEATHER_SERVICE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const NX = 73;
    const NY = 134;
    const { baseDate, baseTime } = getVilageFcstBaseTime();

    const apiUrl =
      `http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${
        encodeURIComponent(weatherServiceKey)
      }&pageNo=1&numOfRows=50&dataType=JSON&base_date=${baseDate}&base_time=${baseTime}&nx=${NX}&ny=${NY}`;

    const response = await fetch(apiUrl);
    const json = await response.json();

    const isError = json.response?.header?.resultCode !== "00";
    const items = json.response?.body?.items?.item as WeatherItem[] | undefined; // 🌟 타입 명시

    if (isError || !items || (Array.isArray(items) && items.length === 0)) {
      console.warn(
        "⚠️ 기상청 API 데이터가 정상이 아닙니다! 기존 DB 캐시를 유지합니다.",
      );

      return new Response(
        JSON.stringify({
          success: false,
          message:
            "기상청 호출 제한 혹은 데이터 공백 발생, 기존 캐시를 유지합니다.",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 🌟 any 대신 가독성 높은 WeatherItem 구조적 매핑 적용
    const tmpItem = items.find((i: WeatherItem) => i.category === "TMP");
    const skyItem = items.find((i: WeatherItem) => i.category === "SKY");
    const ptyItem = items.find((i: WeatherItem) => i.category === "PTY");

    const rawTemp = tmpItem ? parseFloat(tmpItem.fcstValue) : 22;
    const currentTemp = rawTemp >= 900 || rawTemp <= -900
      ? 22
      : Math.round(rawTemp);
    const skyCode = skyItem ? skyItem.fcstValue : "1";
    const ptyCode = ptyItem ? ptyItem.fcstValue : "0";

    let weatherText = "맑음";
    let weatherIcon = "sun";

    if (["1", "4"].includes(ptyCode)) {
      weatherText = "비";
      weatherIcon = "cloud-rain";
    } else if (["2", "3"].includes(ptyCode)) {
      weatherText = "눈";
      weatherIcon = "snowflake";
    } else {
      if (skyCode === "3") {
        weatherText = "구름많음";
        weatherIcon = "cloud-sun";
      } else if (skyCode === "4") {
        weatherText = "흐림";
        weatherIcon = "cloud";
      } else {
        const currentHour = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
          .getHours();
        if (currentHour >= 19 || currentHour <= 5) {
          weatherIcon = "moon";
        }
      }
    }

    const { error: dbError } = await supabase
      .from("current_weather")
      .update({
        weather_text: weatherText,
        temp: currentTemp,
        icon: weatherIcon,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (dbError) throw dbError;

    return new Response(
      JSON.stringify({
        success: true,
        message: "날씨 캐싱 완료!",
        data: { weatherText, currentTemp },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err: unknown) { // 🌟 any 가이드라인에 맞추어 예외 타입 보완
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
