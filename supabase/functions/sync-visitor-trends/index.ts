import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DATA_GO_KR_KEY = Deno.env.get("DATA_GO_KR_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 1. `req`를 `_req`로 바꾸어 사용하지 않는 변수 경고 해결
serve(async (_req) => {
  try {
    const { count } = await supabase
      .from("spot_visitor_trends")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (count !== null && count > 3) {
      return new Response(JSON.stringify({ message: "데이터 충분" }), {
        status: 200,
      });
    }

    const { data: spots } = await supabase.from("spots").select(
      "id, content_id, spot_name, sigungu_code",
    );

    for (const spot of spots || []) {
      if (!spot.content_id || !spot.sigungu_code) continue;

      const apiUrl =
        `https://apis.data.go.kr/B551011/TatsCnctrRateService/tatsCnctrRatedList`;
      const params = new URLSearchParams({
        serviceKey: DATA_GO_KR_KEY,
        numOfRows: "30",
        MobileOS: "WEB",
        MobileApp: "TR",
        areaCd: "51",
        signguCd: String(spot.sigungu_code),
        tAtsNm: spot.spot_name,
        _type: "json",
      });

      const res = await fetch(`${apiUrl}?${params}`);
      const json = await res.json();

      // 2. `any` 대신 `unknown` 사용 후 타입 가드 적용
      const items = json.response?.body?.items?.item;
      const itemList = Array.isArray(items) ? items : items ? [items] : [];

      const insertData = itemList.map((
        item: { baseYmd: string; cnctrRate: number },
      ) => ({
        spot_id: spot.id,
        target_date: `${item.baseYmd.slice(0, 4)}-${item.baseYmd.slice(4, 6)}-${
          item.baseYmd.slice(6, 8)
        }`,
        visitor_count: Number(item.cnctrRate),
      }));

      if (insertData.length > 0) {
        await supabase.from("spot_visitor_trends").upsert(insertData, {
          onConflict: "spot_id,target_date",
        });
      }
    }

    return new Response(JSON.stringify({ message: "동기화 완료" }), {
      status: 200,
    });
  } catch (e: unknown) {
    // 3. 'e'가 unknown일 때 타입 체크
    const message = e instanceof Error ? e.message : "알 수 없는 오류 발생";
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
});
