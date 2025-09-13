"use client";

import { useEffect, useRef, useState } from "react";
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
import { timingGrade } from "@/lib/judge";
import { getLatencyOffset, calibrateOnce } from "@/lib/latency";
import { saveSession, type SessionItem, getWrongWeights } from "@/lib/store";

const QUIZ_COUNT = 5;
const DEFAULT_BPM = 90;

type Phase = "ready" | "prompt" | "choices" | "judge" | "interlude";

export default function RhythmPlay() {
  const router = useRouter();
  const sp = useSearchParams();

  const reviewMode = (sp.get("mode") === "review");
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

  const barBeatRef = useRef(0);              // 1..8 管理
  const judgedThisCycleRef = useRef(false);  // 二重判定防止
  const answerCenterAtRef = useRef<number>(0); // 声判定の中心時刻(ms)
  const latencyRef = useRef<number>(0);
  const [micOn, setMicOn] = useState(false);
  const [lastHeard, setLastHeard] = useState<string>(""); // ←（既存）正規化などの表示に使っていたら残す
  const [heardInterim, setHeardInterim] = useState<string>(""); // 途中結果
  const [heardFinal, setHeardFinal] = useState<string>("");     // 確定結果（人間可読）
  const [noAnswerMsg, setNoAnswerMsg] = useState<string>("");   // 聞き取りなし/未回答の通知
  const idxRef = useRef(0);           // 前問の結果が混ざらないためのガード
  const phaseRef = useRef<Phase>("ready");
  useEffect(()=>{ idxRef.current = idx; }, [idx]);
  useEffect(()=>{ phaseRef.current = phase; }, [phase]);
  const [matchInfo, setMatchInfo] = useState<{
    spokenRaw: string;
    spokenNorm: string;
    rule: 'number'|'keyword'|'none';
    matchedIndex: number|null;  // 0-based
    tokensByChoice: string[][];
    note?: string;
  }|null>(null);
  const [debugRhythm, setDebugRhythm] = useState(false);
  const [lastDeltaMs, setLastDeltaMs] = useState<number | null>(null);
  const [lastGrade, setLastGrade] = useState<'perfect'|'great'|'good'|'miss'|null>(null);
  const [centerAtMs, setCenterAtMs] = useState<number | null>(null);
  const [debugVoice, setDebugVoice] = useState(false);
  const [interimText, setInterimText] = useState<string>("");
  const [voiceErr, setVoiceErr] = useState<string>("");
  const [micPerm, setMicPerm] = useState<'granted'|'denied'|'prompt'|'unsupported'>('unsupported');

  // 辞書ロードと問題生成
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const vocab = await loadVocabCsv("/vocab.csv");
        if (!vocab.length) throw new Error("辞書が空です");
        const weight = getWrongWeights(); // ★ 直近誤答の重み
        const quiz = buildQuizSet(vocab, QUIZ_COUNT, weight, { reviewOnly: reviewMode });
        if (!quiz.length) {
          if (reviewMode) {
            throw new Error("復習対象がありません（誤答履歴が空です）");
          } else {
            throw new Error("問題が生成できませんでした");
          }
        } else {
          setQs(quiz);
          setIdx(0);
          setPhase("ready");
          setErr(null);
        }
      } catch (e: any) {
        setErr(e?.message ?? "読み込みに失敗しました");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const q = qs[idx];
  const progress = qs.length ? (idx / qs.length) * 100 : 0;

  // 判定処理（即時 or 自動）
  const judgeNow = (ok: boolean) => {
    if (!q || judgedThisCycleRef.current) return;
    setPhase("judge");
    judgedThisCycleRef.current = true;

    ok ? sfx.ok() : sfx.ng();

    setCorrect((x) => x + (ok ? 1 : 0));
    setStreak((s) => {
      const ns = ok ? s + 1 : 0;
      setMaxStreak((m: number) => Math.max(m, ns));
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

    // 演出を見せてから次へ
    setTimeout(() => {
      if (idx + 1 < qs.length) {
        setIdx((i) => i + 1);
        setPhase("interlude");
        barBeatRef.current = 0;
        setSelected(null);
      } else {
        // 全問終了
        const total = qs.length;
        const nextStreakLocal = ok ? Math.max(maxStreak, streak + 1) : maxStreak;
        const nextCorrectLocal = ok ? correct + 1 : correct;
        stop();
        const wrongIds = itemsRef.current.filter((it) => !it.correct).map((it) => it.vocabId);
        saveSession({
          id: String(Date.now()),
          startedAt: startedAtRef.current,
          items: itemsRef.current,
          correctRate: total ? nextCorrectLocal / total : 0,
          comboMax: nextStreakLocal,
          earnedPoints: nextCorrectLocal * 10 + nextStreakLocal * 2,
          wrongIds,
        });
        itemsRef.current = [];
        startedAtRef.current = Date.now();
        const p = new URLSearchParams({
          total: String(total),
          correct: String(nextCorrectLocal),
          streak: String(nextStreakLocal),
        });
        router.push(`/rhythm/result?${p.toString()}`);
      }
    }, 380);
  };

  // 音声結果ハンドラ：タイミング(±ms)＋内容一致 → judgeNow()
    const onVoice = (spoken: { normalized: string; confidence: number; at: number }) => {
    // フェーズずれ・前問の遅延イベントは無視
    if (!q || phaseRef.current !== "choices" || judgedThisCycleRef.current) return;

    // 低信頼は無視（緩め）
    if (spoken.confidence < 0.5) return;
    setLastHeard(spoken.normalized);
    // 内容一致（デバッグ付きマッチャ）
    const res = tryMatch(spoken.normalized, heardFinal || heardInterim, q.choices);
    setMatchInfo({
      spokenRaw: heardFinal || heardInterim || '',
      spokenNorm: spoken.normalized,
      rule: res.rule,
      matchedIndex: res.matchedIndex,
      tokensByChoice: res.tokensByChoice,
      note: res.note,
    });
    if (res.matchedIndex == null) return; // 内容不一致 → 何もしない
    // 一致したので即判定（内容のみ）。色付けのため選択も反映
    setSelected(res.matchedIndex);
    setLastDeltaMs(null); setLastGrade(null); // タイミング評価は使わない
    sfx.click();
    judgeNow(res.matchedIndex === q.answer);
  };

    // --- マッチャ（番号 → キーワードの順で判定） -----------------------
  const numWordToIndex = (t: string): number | null => {
    const m = t.match(/([1-4])ばん?$/); // 例: "2番"
    if (m) return Number(m[1]) - 1;
    const map: Record<string, number> = {
      '1':0,'いち':0,'ひとつ':0,'だいいち':0,'いちばん':0,
      '2':1,'に':1,'ふたつ':1,'だいに':1,'にばん':1,
      '3':2,'さん':2,'みっつ':2,'だいさん':2,'さんばん':2,
      '4':3,'よん':3,'し':3,'よっつ':3,'だいよん':3,'よんばん':3,
    };
    return map[t] ?? null;
  };
  const normalizeJa = (s: string) =>
    s.toLowerCase()
     .normalize('NFKC')
     .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0)+0x60))
     .replace(/[ー―−‐]/g,'-')
     .replace(/[！-～]/g, c => String.fromCharCode(c.charCodeAt(0)-0xFEE0))
     .replace(/[\s、。・.,/\\|_*+~^$()[\]{}"'`!?@#:;<>-]/g,'');
  const choiceTokens = (label: string): string[] => {
    const tokens = new Set<string>();
    const base = (label||'').trim();
    if (!base) return [];
    tokens.add(normalizeJa(base));
    const m = base.match(/[（(]([^）)]+)[)）]/); // （よみ）補助
    if (m?.[1]) tokens.add(normalizeJa(m[1]));
    return Array.from(tokens);
  };
  const tryMatch = (spokenNorm: string, spokenRaw: string, choices: string[]) => {
    // 1) 番号ルール
    const num = numWordToIndex(spokenNorm);
    if (num != null && num >= 0 && num < choices.length) {
      return { rule:'number' as const, matchedIndex: num, tokensByChoice: choices.map(choiceTokens), note:'番号指定' };
    }
    // 2) キーワードルール
    const tokensByChoice = choices.map(choiceTokens);
    const ix = tokensByChoice.findIndex(tokens =>
      tokens.some(t => t && (spokenNorm === t || spokenNorm.includes(t) || t.includes(spokenNorm)))
    );
    if (ix >= 0) return { rule:'keyword' as const, matchedIndex: ix, tokensByChoice, note:'部分一致' };
    // 3) 不一致
    return { rule:'none' as const, matchedIndex: null, tokensByChoice, note: '不一致（漢字かな変換や別名が必要かも）' };
  };

  // メトロノーム
  const { bpm, isRunning, start, stop } = useMetronome(DEFAULT_BPM, (beat /*1..4*/) => {
    if (!q) return;
    barBeatRef.current = ((barBeatRef.current % 8) + 1);
    const b = barBeatRef.current;

    if (b === 1) {
      setPhase("prompt");
      judgedThisCycleRef.current = false;
      if (justStartedRef.current) {
        justStartedRef.current = false;
      } else {
        speak(q.word, { lang: "ja-JP", rate: 0.95 });
      }
      sfx.click();
    }

    if (b === 2 || b === 3) {
      sfx.click();
    }

    if (b === 4) {
      setPhase("choices");
      sfx.click();
      // 回答受付ウィンドウの中心時刻（b=4から半拍後）を記録
      const beatMs = 60000 / bpm;
      answerCenterAtRef.current = performance.now() + beatMs * 0.5;
      setCenterAtMs(Math.round(answerCenterAtRef.current));
      // 新しい小問に入ったので、直前の判定可視化をリセット
      setLastDeltaMs(null);
      setLastGrade(null);
      setNoAnswerMsg(""); 
      // 新しい小問になったので、聞き取り表示もクリア
      setHeardInterim("");
      setHeardFinal("");
    }

    if (b === 8 && !judgedThisCycleRef.current) {
      // 未回答 ×。聞こえなかった旨を表示（その問に限り）
      if (selected == null && !heardInterim && !heardFinal) {
        setNoAnswerMsg("（聞き取り・回答なし）");
      }
      judgeNow(false);
    }
  });

  useEffect(() => {
      return () => {
      stop();
      stopVoice();
      // アンマウント時なので setMicOn は必須ではないが、開発時のホットリロード対策として明示
      try { setMicOn(false); } catch {}
    };
  }, [stop]);
  // デバッグ表示トグル: localStorage.kogoto:debugRhythm === "1" でON
  useEffect(() => {
    try {
      const v = localStorage.getItem("kogoto:debugRhythm");
      setDebugRhythm(v === "1");
      const v2 = localStorage.getItem("kogoto:debugVoice");
      setDebugVoice(v2 === "1");
    } catch {}
  }, []);

  const startPlay = async () => {
    if (!q) return;
    // 一度だけ遅延オフセットを確保（将来：手拍子校正に差し替え）
    if (!latencyRef.current) latencyRef.current = getLatencyOffset() || (await calibrateOnce(120));
    // クリア（新規スタート時）
    setHeardInterim(""); setHeardFinal(""); setNoAnswerMsg("");
    // 音声有効なら起動（常にタップは併用可）
    if (voiceSupported() && !micOn) {
      // 先にマイク権限のウォームアップ（Chromeでポップアップを確実に出す）
      const granted = await warmupMic();
      const st = await getMicPermissionState();
      setMicPerm(st);
      if (st === 'denied') {
        setVoiceErr("このサイトのマイクが『ブロック』になっています。🔒→サイトの設定→マイクを『許可』にしてください。");
        setMicOn(false);
        // スキップしてもゲームは遊べます（タップ回答のみ）
        return;
      }
      if (!granted && st === 'prompt') {
        setVoiceErr("マイク権限の確認が必要です。🔒→サイトの設定→マイクを『許可』にしてください。");
      } else { setVoiceErr(""); }
      const ok = startVoice({
        lang: 'ja-JP',
        onResult: (r) => {
          // 前問の遅延イベントを遮断＆choices中だけUI更新
          if (idxRef.current !== idx || phaseRef.current !== "choices") return;
          setInterimText("");
          setVoiceErr("");
          setHeardInterim("");      // interim は確定でクリア
          setHeardFinal(r.text);    // 今の問の確定文字だけに上書き
          onVoice({ normalized: r.normalized, confidence: r.confidence, at: r.at });
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
    await start();
    speak(q.word, { lang: "ja-JP", rate: 0.95 });
    justStartedRef.current = true;
    setPhase("prompt");
    barBeatRef.current = 0;
  };

  const canAnswer = phase === "choices" && isRunning;

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
                {phase === "choices" && "選択肢をタップ！or 声で「1/2/3/4」や意味キーワード！"}
                {phase === "judge" && "判定中！"}
                {phase === "ready" && (reviewMode ? "復習対象から出題します" : "スタートを押してね")}
              </div>
              {/* 🎤マイクの聞き取り表示（常時・控えめ） */}
              <div
                className="text-xs mb-3 inline-flex items-center gap-2 px-2 py-1 rounded border border-[var(--border-strong)] bg-[var(--card)]"
                aria-live="polite"
              >
                <span>🎤</span>
                {micPerm === 'denied' ? (
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
                      <div className="mt-1">
                        tokens:
                        <ol className="list-decimal ml-5">
                          {matchInfo.tokensByChoice.map((toks, i) => (
                            <li key={i}>
                              {toks.map((t, j) => <code key={j} className="mr-1">{t}</code>)}
                              {matchInfo.matchedIndex === i && <span> ← match</span>}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  )}
                  <button
                    className="mt-1 px-2 py-0.5 rounded border"
                    onClick={async () => {
                      const ok = await warmupMic();
                      const st = await getMicPermissionState();
                      setMicPerm(st);
                      if (!ok && (st === 'denied' || st === 'prompt')) {
                        setVoiceErr("マイク許可を確認してください（🔒→サイト設定→マイク）。");
                      } else {
                        setVoiceErr("");
                      }
                    }}
                  >
                    権限を再チェック
                  </button>
                    {micPerm === 'denied' && (
                    <div className="mt-1 opacity-70">
                      ヒント: <b>http://127.0.0.1:3000</b> で開くと新規オリジンとして再確認できます。
                    </div>
                  )}
                </div>
              )}
              {debugRhythm && (
                <div className="text-xs mb-3 px-2 py-1 inline-flex gap-3 rounded border border-[var(--border-strong)] bg-[var(--card)]">
                  <span>判定センター(ms): {centerAtMs ?? "—"}</span>
                  <span>Δ(ms): {lastDeltaMs ?? "—"}</span>
                  <span>GRADE: {lastGrade ?? "—"}</span>
                </div>
              )}
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
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
