// src/utils/logger.js
import { supabase } from "../supabaseClient";
import { getOrCreateUserId } from "./auth";

const actionWeights = {
  detail_view: 1,
  review_view: 2,
  like: 2,
  like_cancel: -2,
  route_search: 5,
  dislike: -3,
  dislike_cancel: 3,
};

export const recordUserAction = async (spot, actionType, userProfile = {}) => {
  const userId = getOrCreateUserId();
  const cleanDate = spot.travelDate
    ? spot.travelDate
        .replace(/\s*\([^)]*\)/g, "") // 요일 제거 "(토)"
        .replace(/\s+/g, "") // 공백 제거
        .replace(/\./g, "-") // 점을 하이픈으로
        .trim()
    : new Date().toISOString().split("T")[0];
  const { error } = await supabase.from("user_action_logs").insert([
    {
      user_id: userId,
      spot_id: spot.id,
      action_type: actionType,
      interaction_weight: actionWeights[actionType] || 0,
      age_group: userProfile.age,
      gender: userProfile.gender,
      main_category: spot.category_main,
      mid_category: spot.category_mid,
      sub_category: spot.category_sub,
      recommend_score: spot.spotScore,
      recommended_rank: spot.rank,
      travel_date: cleanDate, // 추천 시점의 날짜
    },
  ]);

  if (error) console.error("로그 기록 실패:", error);
};
