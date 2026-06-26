import { useState, useEffect, useRef, useCallback } from 'react';

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionType {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
}

export function useSpeech() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Check browser support and load voices
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check SpeechRecognition
      const SpeechRecognition = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      
      setRecognitionSupported(!!SpeechRecognition);

      // Check SpeechSynthesis
      const synth = window.speechSynthesis;
      setSynthesisSupported(!!synth);

      if (synth) {
        const loadVoices = () => {
          setVoices(synth.getVoices());
        };
        loadVoices();
        if (synth.onvoiceschanged !== undefined) {
          synth.onvoiceschanged = loadVoices;
        }
      }
    }
  }, []);

  // Speech-to-Text (Recognition)
  const startListening = useCallback((
    lang: string,
    onResult: (text: string) => void,
    onError?: (error: string) => void
  ) => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = 
      (window as any).SpeechRecognition || 
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      if (onError) onError('Speech recognition is not supported in this browser.');
      return;
    }

    // Stop existing recognition if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {}
    }

    try {
      const recognition = new SpeechRecognition() as SpeechRecognitionType;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (onError) onError(`Speech recognition error: ${event.error}`);
      };

      recognition.onresult = (event) => {
        const resultText = event.results[0][0].transcript;
        onResult(resultText);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setIsListening(false);
      if (onError) onError(err.message || 'Failed to start speech recognition');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
    }
  }, []);

  // Text-to-Speech (Synthesis)
  const speak = useCallback((
    text: string,
    voiceName?: string,
    lang?: string,
    onEndCallback?: () => void
  ) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Stop current speaking
    window.speechSynthesis.cancel();
    setIsSpeaking(false);

    if (!text.trim()) return;

    // Clean markdown text for a smoother voice reading
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '[code block omitted]') // Skip code blocks
      .replace(/`([^`]+)`/g, '$1') // Strip backticks
      .replace(/[*#_~-]/g, '') // Strip markdown chars
      .trim();

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      if (lang) utterance.lang = lang;
      
      if (voiceName) {
        const selectedVoice = window.speechSynthesis
          .getVoices()
          .find((v) => v.name === voiceName);
        if (selectedVoice) utterance.voice = selectedVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        if (onEndCallback) onEndCallback();
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      setIsSpeaking(false);
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Cancel both on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    voices,
    recognitionSupported,
    synthesisSupported,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
  };
}
