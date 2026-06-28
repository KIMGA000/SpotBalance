import { serve } from "http/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DATA_KEY = Deno.env.get("DATA_GO_KR_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (_req) => {
  try {
    // 1. 전체 데이터 개수만 확인
    // 1. [수정] 변수명 중복 해결 및 사용 안 하는 변수 언더바 처리
    const { count: _count, error: countError } = await supabase
      .from("spot_visitor_trends")
      .select("id", { count: "exact", head: true });

    // 2. [수정] 변수명 중복 해결
    const { data: insufficientSpots, error: targetError } = await supabase
      .from("spots")
      .select(`
    id, 
    spot_name, 
    sigungu_code, 
    spot_visitor_trends ( id )
  `)
      .order("id");

    if (targetError) throw targetError; // targetError 사용
    const targets = insufficientSpots?.filter((spot) =>
      !spot.spot_visitor_trends || spot.spot_visitor_trends.length < 8
    ) || [];

    const slicedTargets = targets.slice(0, 30);

    if (slicedTargets.length === 0) {
      return new Response(
        JSON.stringify({ message: "모든 관광지 데이터 충분" }),
        { status: 200 },
      );
    }

    console.log(`📡 동기화 시작: 이번 회차 ${slicedTargets.length}개 처리`);

    for (const spot of slicedTargets) {
      try {
        await new Promise((resolve) =>
          setTimeout(resolve, 500)
        );

        if (!spot.id || !spot.sigungu_code) continue;
        const apiUrl =
          `https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList`;
        const params = new URLSearchParams({
          serviceKey: DATA_KEY,
          pageNo: "1",
          numOfRows: "30",
          MobileOS: "WEB",
          MobileApp: "SPOTBALANCE",
          areaCd: "51",
          signguCd: String(spot.sigungu_code),
          tAtsNm: spot.spot_name,
          _type: "json",
        });

        // 1. API 호출 직후 응답 확인 강화
        const res = await fetch(`${apiUrl}?${params}`);

        // 응답이 성공(200 OK)인지 먼저 확인
        if (!res.ok) {
          const errorText = await res.text();
          console.error(
            `🚨 API 서버가 에러를 반환했습니다 (${res.status}):`,
            errorText,
          );
          continue; // 다음 장소로 건너뜀
        }
        const json = await res.json();
        console.log(
          `${spot.spot_name} API 응답 개수:`,
          json.response?.body?.items?.item?.length,
        );

        // 2. `any` 대신 `unknown` 사용 후 타입 가드 적용
        const items = json.response?.body?.items?.item;
        const itemList = Array.isArray(items) ? items : items ? [items] : [];

        // 1. API가 준 데이터와 실제 가공한 데이터 로그
        console.log(`[${spot.spot_name}] API 응답 개수: ${itemList.length}`);

        const insertData = itemList.map((item) => ({
          spot_id: spot.id,
          target_date: `${item.baseYmd.slice(0, 4)}-${
            item.baseYmd.slice(4, 6)
          }-${item.baseYmd.slice(6, 8)}`,
          visitor_count: Number(item.cnctrRate),
        }));

        // 2. 가공된 데이터 개수 로그
        console.log(
          `[${spot.spot_name}] 가공 완료 데이터 개수: ${insertData.length}`,
        );

        if (insertData.length > 0) {
          // 3. Upsert 직전 데이터 내용 출력 (너무 길면 에러날 수 있으니 첫 데이터만 샘플로)
          console.log(
            `[${spot.spot_name}] 저장 시도 첫 번째 데이터:`,
            insertData[0],
          );

          const { error: upsertError, data: _upsertData } = await supabase
            .from("spot_visitor_trends")
            .upsert(insertData, { onConflict: "spot_id,target_date" });

          if (upsertError) {
            console.error(`[${spot.spot_name}] DB 저장 에러:`, upsertError);
          } else {
            console.log(`[${spot.spot_name}] DB 저장 성공!`);
          }
        }
      } catch (err) {
        // 특정 관광지에서 에러가 나도 다음 관광지로 넘어가도록 처리!
        console.error(`관광지 ${spot.spot_name} 동기화 실패:`, err);
        continue;
      }
    }

    return new Response(JSON.stringify({ message: "동기화 완료" }), {
      status: 200,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류 발생";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
