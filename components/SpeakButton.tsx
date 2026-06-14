"use client";

type SpeechLanguage = "en" | "zh" | "ar";

type SpeakButtonProps = {
  text: string;
  language: SpeechLanguage;
  label: string;
};

const speechLanguageMap: Record<SpeechLanguage, string[]> = {
  en: ["en-US", "en-GB", "en"],
  zh: ["zh-CN", "zh-Hans", "zh"],
  ar: ["ar-SA", "ar-EG", "ar-AE", "ar"],
};

function cleanSpeechText(text: string) {
  return text
    .replace(/[؛;]/g, ". ")
    .replace(/\s+/g, " ")
    .trim();
}

function waitForVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      resolve([]);
      return;
    }

    const existingVoices = window.speechSynthesis.getVoices();

    if (existingVoices.length > 0) {
      resolve(existingVoices);
      return;
    }

    const timer = window.setTimeout(() => {
      resolve(window.speechSynthesis.getVoices());
    }, timeoutMs);

    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

function chooseVoice(
  voices: SpeechSynthesisVoice[],
  language: SpeechLanguage,
) {
  const preferredCodes = speechLanguageMap[language].map((code) =>
    code.toLowerCase(),
  );

  const exactVoice = voices.find((voice) =>
    preferredCodes.includes(voice.lang.toLowerCase()),
  );

  if (exactVoice) {
    return exactVoice;
  }

  const familyVoice = voices.find((voice) =>
    preferredCodes.some((code) =>
      voice.lang.toLowerCase().startsWith(code.split("-")[0]),
    ),
  );

  if (familyVoice) {
    return familyVoice;
  }

  return voices[0] ?? null;
}

export function SpeakButton({ text, language, label }: SpeakButtonProps) {
  async function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      alert("Speech is not supported in this browser.");
      return;
    }

    const cleanText = cleanSpeechText(text);

    if (!cleanText) {
      return;
    }

    window.speechSynthesis.cancel();

    const voices = await waitForVoices();
    const selectedVoice = chooseVoice(voices, language);
    const fallbackLang = speechLanguageMap[language][0];

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = selectedVoice?.lang ?? fallbackLang;
    utterance.voice = selectedVoice;
    utterance.rate = language === "ar" ? 0.78 : 0.85;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onerror = () => {
      console.warn("Speech synthesis failed.", {
        text: cleanText,
        requestedLanguage: language,
        selectedVoice: selectedVoice?.name,
        selectedLang: selectedVoice?.lang,
      });
    };

    window.speechSynthesis.speak(utterance);
  }

  return (
    <button className="speech-button button-reset" type="button" onClick={speak}>
      {label}
    </button>
  );
}
