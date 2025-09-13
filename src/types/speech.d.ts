// src/types/speech.d.ts
// Web Speech API / Permissions API 補完型

// Constructor 型を自前で定義
export type SpeechRecognitionConstructor = new () => SpeechRecognition;

declare global {
  interface Window {
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechRecognition?: SpeechRecognitionConstructor;
  }

  interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error?: string;
    message?: string;
    type: string;
  }
}

export {};
