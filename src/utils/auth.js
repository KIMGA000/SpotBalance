// src/utils/auth.js
export const getOrCreateUserId = () => {
  let userId = localStorage.getItem("sb_user_id");
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem("sb_user_id", userId);
  }
  return userId;
};
