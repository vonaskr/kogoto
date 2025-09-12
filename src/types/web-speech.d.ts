// src/types/web-speech.d.ts
// Web Speech API の最小宣言（使う範囲だけ）
// これで TypeScript が SpeechRecognition を認識できるようになります。

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

// ブラウザごとの実装（Chrome は webkit 前置が主）
declare var SpeechRecognition: {
  new(): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  new(): SpeechRecognition;
};

// window への補助プロパティ宣言
interface Window {
  SpeechRecognition?: typeof SpeechRecognition;
  webkitSpeechRecognition?: typeof webkitSpeechRecognition;
}
