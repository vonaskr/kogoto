"use client";

import { useState } from "react";
import { Container } from "@/components/layout/container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { startVoice, stopVoice, voiceSupported } from "@/lib/voice";

export default function VoiceTranscribePage() {
  const [listening, setListening] = useState(false);
  const [result, setResult] = useState<string>("");
  const [interim, setInterim] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleStart = () => {
    if (!voiceSupported()) {
      setError("このブラウザは音声認識に対応していません。");
      return;
    }
    setError("");
    setResult("");
    setInterim("");
    const ok = startVoice({
      lang: "ja-JP",
      onResult: (r) => {
        setResult(r.text);
        setInterim("");
      },
      onInterim: (txt) => setInterim(txt),
      onError: (msg) => setError(msg),
    });
    if (ok) setListening(true);
  };

  const handleStop = () => {
    stopVoice();
    setListening(false);
  };

  return (
    <Container>
      <Card>
        <CardContent className="p-6 md:p-8">
          <h1 className="h1-fluid mb-4">日本語音声 → 文字起こし</h1>
          <p className="mb-6 opacity-80">マイクで話した内容がリアルタイムで文字になります。</p>
          <div className="flex gap-2 mb-4">
            {!listening ? (
              <Button onClick={handleStart}>音声認識スタート</Button>
            ) : (
              <Button variant="accent" onClick={handleStop}>ストップ</Button>
            )}
          </div>
          {error && <div className="text-red-600 font-semibold mb-2">{error}</div>}
          <div className="mb-2 text-xs opacity-70">途中経過: {interim}</div>
          <div className="mb-2 text-lg font-bold">結果: {result}</div>
        </CardContent>
      </Card>
    </Container>
  );
}
