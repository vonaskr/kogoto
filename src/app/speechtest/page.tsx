
'use client';
import React, { useState, useRef } from 'react';

const SpeechTestPage: React.FC = () => {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecognition = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('このブラウザは音声認識に対応していません');
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let text = '';
      for (let i = 0; i < event.results.length; ++i) {
        text += event.results[i][0].transcript;
      }
      setTranscript(text);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopRecognition = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  return (
    <div style={{ padding: 32 }}>
      <h1>音声認識テスト（日本語）</h1>
      <button onClick={isRecording ? stopRecognition : startRecognition}>
        {isRecording ? '停止' : '録音開始'}
      </button>
      <div style={{ marginTop: 24, border: '1px solid #ccc', padding: 16 }}>
        <strong>書き起こし結果:</strong>
        <p>{transcript}</p>
      </div>
    </div>
  );
};

export default SpeechTestPage;
