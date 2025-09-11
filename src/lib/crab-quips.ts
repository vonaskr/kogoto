// src/lib/crab-quips.ts
export type Quip = {
  id: string;
  text: string;              // <k>…</k> で古語タグ可
  when?: {
    minLevel?: number;       // このLv以上
    maxRemainPts?: number;   // 次Lvまでの残りptがこの値以下
    weatherTag?: "sunny" | "rainy" | "cloudy"; // 未来用
  };
};
export const CRAB_QUIPS: Quip[] = [
  // 汎用
  { id: "q1",  text: "今日もコツコツ〜" },
  { id: "q2",  text: "焦らず、一歩ずつ。" },
  { id: "q3",  text: "ちょっと息抜きも大事。" },
  { id: "q4",  text: "むりせず、でも手は止めない〜" },
  { id: "q5",  text: "小さな積み重ねが、おおきな力に！" },
  // 進捗系
  { id: "q6",  text: "次のレベル、見えてきた！", when: { maxRemainPts: 10 } },
  { id: "q7",  text: "あと少しで進化のとき…！", when: { maxRemainPts: 5 } },
  { id: "q8",  text: "調子いいね、このままいこう！", when: { minLevel: 2 } },
  // 古語入り（サンプル）
  { id: "q9",  text: "学ぶは楽しきかな、<k>をさをさ</k>見逃すな。", when: { minLevel: 3 } },
  { id: "q10", text: "今日の気持ちは、<k>いと</k>よし！" },
  { id: "q13", text: "みんなから<k>ののしられ</k>たいよ～！" },
  // 天気（後でAPI連携）
  { id: "q11", text: "カニ，雨の日すきなんだぁ～", when: { weatherTag: "rainy" } },
  { id: "q12", text: "晴れてる日の砂浜，きもちいいよね", when: { weatherTag: "sunny" } },
];