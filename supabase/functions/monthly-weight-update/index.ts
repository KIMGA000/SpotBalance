// deno-lint-ignore-file
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const dataGoKey = Deno.env.get("DATA_KEY");

if (!supabaseUrl || !serviceKey || !dataGoKey) {
  console.error("🚨 환경 변수가 없습니다!", {
    supabaseUrl,
    serviceKey,
    dataGoKey,
  });
  throw new Error("환경 변수 설정이 누락되었습니다.");
}
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const PUBLIC_DATA_KEY = Deno.env.get("DATA_KEY")!;

Deno.serve(async (_req) => {
  console.log("🚀 함수 실행 시작");
  try {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    const baseYm = `${date.getFullYear()}${
      String(date.getMonth() + 1).padStart(2, "0")
    }`;
    console.log("🚀 함수 실행 시작");
    const areaCd = "51";

    const { data: existingData, error: fetchError } = await supabase.from(
      "region_age_weights",
    ).select("*");
    if (fetchError) {
      console.error("🚨 Supabase 조회 에러:", fetchError);
      throw fetchError;
    }
    console.log("✅ Supabase 데이터 조회 성공");

    const dataList = existingData || [];
    if (dataList.length > 0 && dataList[0].last_updated_ym === baseYm) {
      console.log("⚠️ 이미 업데이트됨");
      return new Response(JSON.stringify({ message: "이미 업데이트됨" }), {
        status: 200,
      });
    }

    // any 대신 Record<string, unknown> 사용
    const existingMap = new Map(
      dataList.map((
        item: Record<string, unknown>,
      ) => [item.signgu_cd as string, item]),
    );

    const SIGNGU_CODES: Record<string, string> = {
      "51110": "춘천시",
      "51130": "원주시",
      "51150": "강릉시",
      "51170": "동해시",
      "51190": "태백시",
      "51210": "속초시",
      "51230": "삼척시",
      "51720": "홍천군",
      "51730": "횡성군",
      "51750": "영월군",
      "51760": "평창군",
      "51770": "정선군",
      "51780": "철원군",
      "51790": "화천군",
      "51800": "양구군",
      "51810": "인제군",
      "51820": "고성군",
      "51830": "양양군",
    };
    const ageMetrics = ["3101", "3102", "3103", "3104", "3105", "3106", "3107"];

    // rawData 타입 구체화
    const rawData: Array<
      { signgu_cd: string; signgu_name: string; counts: Record<string, number> }
    > = [];
    for (const [cd, name] of Object.entries(SIGNGU_CODES)) {
      console.log(`📡 데이터 수집 중: ${name} (${cd})`);
      const counts: Record<string, number> = {};
      for (const code of ageMetrics) {
        const url =
          `https://apis.data.go.kr/B551011/AreaTarDivService/areaTouDivList?serviceKey=${PUBLIC_DATA_KEY}&MobileOS=WEB&MobileApp=SPOTBALANCE&baseYm=${baseYm}&areaCd=${areaCd}&signguCd=${cd}&touDivIxCd=${code}&_type=json`;
        const res = await fetch(url);

        // 🚨 API 응답이 정상인지 확인하는 코드 추가
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`🚨 API 에러 (코드 ${res.status}): ${errorText}`);
          throw new Error(`공공데이터 API 인증 실패: ${errorText}`);
        }

        const json = await res.json();
        counts[code] = parseFloat(
          json.response?.body?.items?.item?.[0]?.touDivIxVal || 0,
        );
      }
      rawData.push({ signgu_cd: cd, signgu_name: name, counts });
    }
    console.log("✅ 모든 API 데이터 수집 완료");
    const records: Array<Record<string, unknown>> = [];
    for (const item of rawData) {
      const newWeights: Record<string, number> = {};
      for (const code of ageMetrics) {
        const avg = rawData.reduce((acc, cur) => acc + cur.counts[code], 0) /
          rawData.length;
        let weight = avg > 0 ? (item.counts[code] / avg) : 1.0;
        weight = Math.max(0.8, Math.min(1.2, weight));
        newWeights[`age${(ageMetrics.indexOf(code) + 1) * 10}_weight`] =
          Math.round(weight * 100) / 100;
      }

      const old = existingMap.get(item.signgu_cd) as
        | Record<string, any>
        | undefined;
      if (old) {
        const n = (old.update_count as number) || 1;
        const updated = { ...old };
        for (const key of Object.keys(newWeights)) {
          updated[key] =
            Math.round(((old[key] * n) + newWeights[key]) / (n + 1) * 100) /
            100;
        }
        updated.update_count = n + 1;
        updated.last_updated_ym = baseYm;
        records.push(updated);
      } else {
        records.push({
          signgu_cd: item.signgu_cd,
          signgu_name: item.signgu_name,
          ...newWeights,
          update_count: 1,
          last_updated_ym: baseYm,
        });
      }
    }

    console.log("💾 Supabase에 저장 시작...");

    const { error: upsertError } = await supabase
      .from("region_age_weights")
      .upsert(records);

    if (upsertError) throw upsertError;
    console.log("✅ region_age_weights 업데이트 완료");

    const historyRecords = records.map((r) => ({
      signgu_cd: r.signgu_cd,
      signgu_name: r.signgu_name,
      // 가중치 값들만 추출하여 저장
      ...Object.fromEntries(
        Object.entries(r).filter(([key]) => key.endsWith("_weight")),
      ),
      base_ym: baseYm,
    }));

    const { error: insertError } = await supabase
      .from("region_weight_logs")
      .insert(historyRecords);

    if (insertError) {
      console.error("🚨 히스토리 저장 에러:", insertError);
      throw insertError;
    }
    console.log("🎉 히스토리 저장 완료");

    return new Response(JSON.stringify({ message: "성공" }), { status: 200 });
  } catch (error: any) {
    console.error("🚨 최종 에러 발생:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
});
