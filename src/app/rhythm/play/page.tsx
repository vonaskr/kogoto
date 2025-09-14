"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { loadVocabCsv } from "@/lib/vocab";
import { buildQuizSet, type Quiz } from "@/lib/question-engine";
import { useMetronome } from "@/lib/use-metronome";
import { speak } from "@/lib/tts";
import { sfx } from "@/lib/sfx";
import { startVoice, stopVoice, voiceSupported, warmupMic, getMicPermissionState } from "@/lib/voice";
import { getLatencyOffset, calibrateOnce } from "@/lib/latency";
import { saveSession, type SessionItem, getWrongWeights } from "@/lib/store";

const QUIZ_COUNT = 5;
const DEFAULT_BPM = 90;

type Phase = "ready" | "prompt" | "choices" | "judge" | "interlude";

function RhythmPlayInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const reviewMode = sp.get("mode") === "review";
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [qs, setQs] = useState<Quiz[]>([]);
  const [idx, setIdx] = useState(0);

  const [phase, setPhase] = useState<Phase>("ready");
  const [selected, setSelected] = useState<number | null>(null);
  const itemsRef = useRef<SessionItem[]>([]);
  const startedAtRef = useRef<number>(Date.now());

  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const justStartedRef = useRef(false);

  const barBeatRef = useRef(0);
  const judgedThisCycleRef = useRef(false);
  const answerCenterAtRef = useRef<number>(0);
  const latencyRef = useRef<number>(0);

  const [micOn, setMicOn] = useState(false);
  const [heardInterim, setHeardInterim] = useState<string>("");
  const [heardFinal, setHeardFinal] = useState<string>("");
  const [noAnswerMsg, setNoAnswerMsg] = useState<string>("");

  const idxRef = useRef(0);
  const phaseRef = useRef<Phase>("ready");
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  const [debugRhythm, setDebugRhythm] = useState(false);
  const [centerAtMs, setCenterAtMs] = useState<number | null>(null);
  const [debugVoice, setDebugVoice] = useState(false);
  const [interimText, setInterimText] = useState<string>("");
  const [voiceErr, setVoiceErr] = useState<string>("");
  const [micPerm, setMicPerm] =
    useState<'granted' | 'denied' | 'prompt' | 'unsupported'>('unsupported');

  // 参考表示用
  const [matchInfo, setMatchInfo] = useState<{
    spokenRaw: string;
    spokenNorm: string;
    rule: 'number' | 'keyword' | 'label' | 'none';
    matchedIndex: number | null;
    note?: string;
  } | null>(null);

  // 語彙ロード＆出題構成
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        if (!vocab.length) throw new Error("辞書が空です");
        const weight = getWrongWeights();
        const quiz = buildQuizSet(vocab, QUIZ_COUNT, weight, { reviewOnly: reviewMode });
        if (!quiz.length) {
          throw new Error(reviewMode ? "復習対象がありません（誤答履歴が空です）" : "問題が生成できませんでした");
        }
        setQs(quiz);
        setIdx(0);
        setPhase("ready");
        setErr(null);
      } catch (e: any) {
        setErr(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, [reviewMode]);

  const q = qs[idx];
  const progress = qs.length ? (idx / qs.length) * 100 : 0;

  // 判定
  const judgeNow = (ok: boolean) => {
    if (!q || judgedThisCycleRef.current) return;
    setPhase("judge");
    judgedThisCycleRef.current = true;

    ok ? sfx.ok() : sfx.ng();

    setCorrect((x) => x + (ok ? 1 : 0));
    setStreak((s) => {
      const ns = ok ? s + 1 : 0;
      setMaxStreak((m) => Math.max(m, ns));
      return ns;
    });

    const chosenText = selected != null ? q.choices[selected] : null;
    itemsRef.current.push({
      vocabId: q.id,
      word: q.word,
      correctText: q.choices[q.answer],
      chosenText,
      correct: ok,
    });
  };

  // 数字→インデックス
  const numWordToIndex = (raw: string): number | null => {
    const t = raw.trim();
    const map: Record<string, number> = {
      "1": 0, "いち": 0, "ひとつ": 0, "いちばん": 0, "だいいち": 0,
      "2": 1, "に": 1, "ふたつ": 1, "にばん": 1, "だいに": 1,
      "3": 2, "さん": 2, "みっつ": 2, "さんばん": 2, "だいさん": 2,
      "4": 3, "よん": 3, "し": 3, "よっつ": 3, "よんばん": 3, "だいよん": 3,
    };
    if (/^[1-4]番?$/.test(t)) return Number(t[0]) - 1;
    return (t in map) ? map[t] : null;
  };

  // かな一致 → 数字 → ラベル一致（フォールバック）
  const tryMatch = (
    spokenRaw: string,
    choices: string[],
    choiceReadings: string[],
  ): { rule: 'number' | 'keyword' | 'label' | 'none'; matchedIndex: number | null; note: string } => {
    // 数字
    const num = numWordToIndex(spokenRaw);
    if (num != null && num >= 0 && num < choices.length) {
      return { rule: 'number', matchedIndex: num, note: '番号指定' };
    }
    // mean_reading（かな）
    const kana = spokenRaw.trim();
    const ixKana = choiceReadings.findIndex((r) => (r || '').trim() === kana);
    if (ixKana >= 0) return { rule: 'keyword', matchedIndex: ixKana, note: 'mean_reading一致' };

    // ラベル本文（控えめな正規化）
    const norm = (s: string) =>
      s.normalize('NFKC').replace(/[\s、。・.,/\\|_*+~^$()[\]{}"'`!?@#:;<>-]/g, "");
    const spokenLbl = norm(spokenRaw);
    const ixLbl = choices.findIndex((c) => norm(c) === spokenLbl);
    if (ixLbl >= 0) return { rule: 'label', matchedIndex: ixLbl, note: '表示ラベル一致' };

    return { rule: 'none', matchedIndex: null, note: '不一致' };
  };

  // 音声結果
  const onVoice = (spoken: { text: string; normalized: string; confidence: number; at: number }) => {
    if (!q || phaseRef.current !== "choices" || judgedThisCycleRef.current) return;
    if (spoken.confidence < 0.3) return;

    
    const raw = (spoken.text || "").trim();
    const res = tryMatch(raw, q.choices, q.choiceReadings);
    setMatchInfo({
      spokenRaw: raw,
      spokenNorm: spoken.normalized,
      rule: res.rule,
      matchedIndex: res.matchedIndex,
      note: res.note,
    });

    if (res.matchedIndex == null) {
      setNoAnswerMsg("聞き取れませんでした。もう一度音声で回答してください。");
      return;
    }

    setSelected(res.matchedIndex);
    sfx.click();
    const ok = res.matchedIndex === q.answer;
    judgeNow(ok);
  };

  // メトロノーム
  const { bpm, isRunning, start, stop } = useMetronome(DEFAULT_BPM, () => {
    if (!q) return;
    barBeatRef.current = ((barBeatRef.current % 8) + 1);
    const b = barBeatRef.current;

    if (b === 1 && (phaseRef.current === "ready" || phaseRef.current === "interlude")) {
      setPhase("prompt");
      judgedThisCycleRef.current = false;
      if (justStartedRef.current) { justStartedRef.current = false; }
      speak(q.word, { lang: "ja-JP", rate: 0.95 });
      sfx.click();
    }

    if ((b === 2 || b === 3) && phaseRef.current !== "judge") sfx.click();

    if (b === 4 && phaseRef.current === "prompt") {
      setPhase("choices");
      sfx.click();
      const beatMs = 60000 / bpm;
      answerCenterAtRef.current = performance.now() + beatMs * 0.5;
      setCenterAtMs(Math.round(answerCenterAtRef.current));
      setNoAnswerMsg("");
      setHeardInterim("");
      setHeardFinal("");
    }

    // 自動×はしない（同一問題継続）
    if (b === 8 && phaseRef.current === "choices" && !judgedThisCycleRef.current) {
      setNoAnswerMsg("聞き取れませんでした。もう一度音声で回答してください。");
      setHeardInterim("");
      setHeardFinal("");
    }
  });

  // クリーンアップ
  useEffect(() => {
    return () => {
      stop();
      stopVoice();
      try { setMicOn(false); } catch {}
    };
  }, [stop]);

  // デバッグフラグ
  useEffect(() => {
    try {
      setDebugRhythm(localStorage.getItem("kogoto:debugRhythm") === "1");
      setDebugVoice(localStorage.getItem("kogoto:debugVoice") === "1");
    } catch {}
  }, []);

  // スタート
  const startPlay = async () => {
    if (!q) return;

    // 1) クリック直後に権限ダイアログ
    let granted = false;
    if (voiceSupported() && !micOn) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        granted = true;
        setMicPerm("granted");
        setVoiceErr("");
      } catch {
        setMicPerm("denied");
        setVoiceErr("マイク権限がブロックされています。🔒→サイトの設定から『マイクを許可』してください。");
      }
    }

    // 2) 認識開始
    if (granted) {
      const ok = startVoice({
        lang: "ja-JP",
        onResult: (r) => {
          if (idxRef.current !== idx || phaseRef.current !== "choices") return;
          setInterimText("");
          setHeardInterim("");
          setHeardFinal(r.text);
          onVoice({ text: r.text, normalized: r.normalized, confidence: r.confidence, at: r.at });
        },
        onInterim: (t) => {
          if (idxRef.current !== idx || phaseRef.current !== "choices") return;
          setInterimText(t);
          setHeardInterim(t);
        },
        onError: (msg) => setVoiceErr(msg),
      });
      if (ok) setMicOn(true);
    }

    // 3) 既存開始処理
    if (!latencyRef.current) latencyRef.current = getLatencyOffset() || (await calibrateOnce(120));
    await start();
    // 読み上げは「拍1」のタイミングで行うため、ここでは phase を変えない
    justStartedRef.current = true;
    setPhase("ready");
    barBeatRef.current = 0;
  };

  const canAnswer = phase === "choices" && isRunning;

  // 次の問題へ（手動）
  const goNext = () => {
    if (!q) return;
    if (idx + 1 < qs.length) {
      setIdx((i) => i + 1);
      setPhase("interlude");
      barBeatRef.current = 0;
      judgedThisCycleRef.current = false;
      setSelected(null);
      setHeardInterim("");
      setHeardFinal("");
      setNoAnswerMsg("");
      return;
    }
    // 終了 → 保存＆結果へ
    const total = qs.length;
    const wrongIds = itemsRef.current.filter((it) => !it.correct).map((it) => it.vocabId);
    stop();
    saveSession({
      id: String(Date.now()),
      startedAt: startedAtRef.current,
      items: itemsRef.current,
      correctRate: total ? correct / total : 0,
      comboMax: maxStreak,
      earnedPoints: correct * 10 + maxStreak * 2,
      wrongIds,
    });
    itemsRef.current = [];
    startedAtRef.current = Date.now();
    const p = new URLSearchParams({
      total: String(total),
      correct: String(correct),
      streak: String(maxStreak),
    });
    router.push(`/rhythm/result?${p.toString()}`);
  };

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          {loading && <div className="opacity-70">辞書を読み込んでいます…</div>}
          {err && <div className="text-red-600 font-semibold">Error: {err}</div>}

          {!loading && !err && q && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="font-semibold">
                  リズム学習：{idx + 1} / {qs.length}
                </div>
                <div className="text-sm opacity-70 flex items-center gap-3">
                  <span>BPM: {bpm} ／ COMBO: {streak}</span>
                  <span className="px-2 py-0.5 rounded border border-[var(--border-strong)] bg-[var(--card)]">
                    マイク: {voiceSupported() ? (micOn ? "ON" : "OFF") : "未対応"}
                  </span>
                </div>
              </div>
              <Progress value={progress} className="mb-6" />

              <div className="flex gap-2 mb-4">
                {!isRunning ? (
                  <Button onClick={startPlay} disabled={!!err}>
                    {reviewMode ? "復習スタート" : "スタート"}
                  </Button>
                ) : (
                  <Button
                    variant="accent"
                    onClick={() => {
                      stop();
                      stopVoice();
                      setMicOn(false);
                    }}
                  >
                    ストップ
                  </Button>
                )}
              </div>

              <div className="text-2xl font-extrabold mb-2">「{q.word}」の現代語は？</div>
              <div className="text-sm opacity-70 mb-4">
                {phase === "prompt" && "提示中…（拍1）"}
                {phase === "choices" && "選択肢をタップ！or 声で『1/2/3/4』や かな読み！"}
                {phase === "judge" && "判定中！"}
                {phase === "ready" && (reviewMode ? "復習対象から出題します" : "スタートを押してね")}
              </div>

              {/* 🎤聞き取りの可視化 */}
              <div className="text-xs mb-3 inline-flex items-center gap-2 px-2 py-1 rounded border border-[var(--border-strong)] bg-[var(--card)]" aria-live="polite">
                <span>🎤</span>
                {micPerm === "denied" ? (
                  <span className="opacity-70">マイクはブロック中（🔒→サイト設定で許可）</span>
                ) : heardInterim ? (
                  <span>聞き取り中：<b>{heardInterim}</b></span>
                ) : heardFinal ? (
                  <span>確定：<b>{heardFinal}</b></span>
                ) : (
                  <span className="opacity-70">待機中… {noAnswerMsg && <em>{noAnswerMsg}</em>}</span>
                )}
              </div>

              {debugVoice && (
                <div className="text-xs mb-3 px-2 py-1 rounded border border-[var(--border-strong)] bg-[var(--card)]">
                  <div>interim: <span className="opacity-70">{interimText || "（なし）"}</span></div>
                  <div>error: <span className="opacity-70">{voiceErr || "（なし）"}</span></div>
                  <div>permission: <span className="opacity-70">{micPerm}</span></div>
                  {matchInfo && (
                    <div className="mt-2">
                      <div>rule: <b>{matchInfo.rule}</b> / note: {matchInfo.note || "—"}</div>
                      <div>spoken(norm): <code>{matchInfo.spokenNorm}</code></div>
                      <div>matchedIndex: {matchInfo.matchedIndex ?? "—"}</div>
                    </div>
                  )}
                  <button
                    className="mt-1 px-2 py-0.5 rounded border"
                    onClick={async () => {
                      const ok = await warmupMic();
                      const st = await getMicPermissionState();
                      setMicPerm(st);
                      if (!ok && (st === "denied" || st === "prompt")) {
                        setVoiceErr("マイク許可を確認してください（🔒→サイト設定→マイク）。");
                      } else {
                        setVoiceErr("");
                      }
                    }}
                  >
                    権限を再チェック
                  </button>
                  {micPerm === "denied" && (
                    <div className="mt-1 opacity-70">
                      ヒント: <b>http://127.0.0.1:3000</b> を別オリジンとして開くと再確認できます。
                    </div>
                  )}
                </div>
              )}

              {debugRhythm && (
                <div className="text-xs mb-3 px-2 py-1 inline-flex gap-3 rounded border border-[var(--border-strong)] bg-[var(--card)]">
                  <span>判定センター(ms): {centerAtMs ?? "—"}</span>
                </div>
              )}

              {/* 選択肢：音声でヒットしたら selected を反映して光る */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.choices.map((txt, idxChoice) => (
                  <Button
                    key={idxChoice}
                    variant="surface"
                    size="lg"
                    disabled={!canAnswer}
                    onClick={() => {
                      if (!canAnswer) return;
                      setSelected(idxChoice);
                      sfx.click();
                      judgeNow(idxChoice === q.answer);
                    }}
                    className={
                      phase === "judge"
                        ? idxChoice === q.answer
                          ? "bg-green-300"
                          : selected === idxChoice
                            ? "bg-red-300"
                            : "opacity-70"
                        : selected === idxChoice
                          ? "outline outline-4"
                          : ""
                    }
                  >
                    {txt}
                  </Button>
                ))}
              </div>

              {/* 判定後は手動で次へ */}
              {phase === "judge" && (
                <div className="mt-4">
                  <Button variant="primary" size="lg" onClick={goNext}>
                    次の問題へ
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 opacity-70">ロード中…</div>}>
      <RhythmPlayInner />
    </Suspense>
  );
}
