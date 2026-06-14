"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useSyncExternalStore } from "react";

export type InterfaceLanguage = "en" | "zh" | "ar";
export type InterfaceTheme = "light" | "dark";

export type LexiAgentPreferences = {
  language: InterfaceLanguage;
  theme: InterfaceTheme;
};

type AppShellProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  children: ReactNode;
};

const PREFERENCES_KEY = "lexiagent-interface-preferences";

const DEFAULT_PREFERENCES: LexiAgentPreferences = {
  language: "en",
  theme: "light",
};

const navigation = [
  { href: "/dashboard", key: "dashboard", icon: "D" },
  { href: "/search", key: "search", icon: "S" },
  { href: "/story", key: "story", icon: "T" },
  { href: "/vocabulary", key: "vocabulary", icon: "V" },
  { href: "/quiz", key: "quiz", icon: "Q" },
  { href: "/audio-review", key: "audio", icon: "A" },
  { href: "/analytics", key: "analytics", icon: "P" },
  { href: "/settings", key: "settings", icon: "C" },
] as const;

type NavigationKey = (typeof navigation)[number]["key"];

const routeDefaults: Record<
  string,
  { eyebrow: string; title: string; description: string }
> = {
  "/dashboard": {
    eyebrow: "AI-NATIVE LANGUAGE PLATFORM",
    title: "Learning Dashboard",
    description:
      "Track saved vocabulary, verified sources, quiz readiness, and the Telegram/OpenClaw learning workflow.",
  },
  "/search": {
    eyebrow: "AGENT SEARCH",
    title: "AI Example Search",
    description:
      "Add new vocabulary by searching authentic web sources, generating multilingual explanation, and saving the result to Supabase.",
  },
  "/story": {
    eyebrow: "AI STORY BUILDER",
    title: "AI vocabulary paragraph practice",
    description:
      "Enter one word or many words. LexiAgent will generate a clean learner paragraph using all selected words, translate it, and provide audio review.",
  },
  "/vocabulary": {
    eyebrow: "VOCABULARY LIBRARY",
    title: "My Vocabulary",
    description:
      "Review all saved words, inspect examples, listen to audio, and open verified source links.",
  },
  "/quiz": {
    eyebrow: "REVIEW QUIZ",
    title: "Multiple-choice vocabulary exam",
    description:
      "Practice meanings and sentence questions using your saved LexiAgent vocabulary library.",
  },
  "/audio-review": {
    eyebrow: "AUDIO REVIEW",
    title: "Hands-free vocabulary review",
    description:
      "Listen to saved words, reveal meanings, review examples, and practice vocabulary one by one.",
  },
  "/analytics": {
    eyebrow: "PROGRESS ANALYTICS",
    title: "Learning analytics",
    description:
      "Track saved vocabulary, verified sources, review progress, language coverage, and recent learning activity.",
  },
  "/settings": {
    eyebrow: "SYSTEM SETTINGS",
    title: "Settings",
    description:
      "Review language defaults, Telegram commands, OpenClaw status, API configuration, and final project setup.",
  },
};

const shellText = {
  en: {
    brandSubtitle: "Multilingual AI Learning",
    headerPill: "Final Project Workspace",
    legacy: "Open legacy working app",
    openclawLabel: "OPENCLAW CONNECTION",
    openclawTitle: "Telegram Connected",
    openclawText: "Your bot is ready to receive vocabulary commands.",
    nav: {
      dashboard: "Dashboard",
      search: "AI Search",
      story: "Story Builder",
      vocabulary: "Vocabulary",
      quiz: "Review Quiz",
      audio: "Audio Review",
      analytics: "Analytics",
      settings: "Settings",
    },
    eyebrows: {
      "AI-NATIVE LANGUAGE PLATFORM": "AI-NATIVE LANGUAGE PLATFORM",
      "AGENT SEARCH": "AGENT SEARCH",
      "AI STORY BUILDER": "AI STORY BUILDER",
      "VOCABULARY LIBRARY": "VOCABULARY LIBRARY",
      "REVIEW QUIZ": "REVIEW QUIZ",
      "AUDIO REVIEW": "AUDIO REVIEW",
      "PROGRESS ANALYTICS": "PROGRESS ANALYTICS",
      "SYSTEM SETTINGS": "SYSTEM SETTINGS",
      "LEXIAGENT WORKSPACE": "LEXIAGENT WORKSPACE",
    },
    titles: {
      "Learning Dashboard": "Learning Dashboard",
      "AI Example Search": "AI Example Search",
      "AI vocabulary paragraph practice": "AI vocabulary paragraph practice",
      "My Vocabulary": "My Vocabulary",
      "Multiple-choice vocabulary exam": "Multiple-choice vocabulary exam",
      "Hands-free vocabulary review": "Hands-free vocabulary review",
      "Learning analytics": "Learning analytics",
      Settings: "Settings",
    },
    descriptions: {
      "Learning Dashboard":
        "Track saved vocabulary, verified sources, quiz readiness, and the Telegram/OpenClaw learning workflow.",
      "AI Example Search":
        "Add new vocabulary by searching authentic web sources, generating multilingual explanation, and saving the result to Supabase.",
      "AI vocabulary paragraph practice":
        "Enter one word or many words. LexiAgent will generate a clean learner paragraph using all selected words, translate it, and provide audio review.",
      "My Vocabulary":
        "Review all saved words, inspect examples, listen to audio, and open verified source links.",
      "Multiple-choice vocabulary exam":
        "Practice meanings and sentence questions using your saved LexiAgent vocabulary library.",
      "Hands-free vocabulary review":
        "Listen to saved words, reveal meanings, review examples, and practice vocabulary one by one.",
      "Learning analytics":
        "Track saved vocabulary, verified sources, review progress, language coverage, and recent learning activity.",
      Settings:
        "Review language defaults, Telegram commands, OpenClaw status, API configuration, and final project setup.",
    },
  },
  zh: {
    brandSubtitle: "多语言 AI 学习",
    headerPill: "期末项目工作区",
    legacy: "打开旧版应用",
    openclawLabel: "OPENCLAW 连接",
    openclawTitle: "Telegram 已连接",
    openclawText: "机器人已准备接收词汇命令。",
    nav: {
      dashboard: "仪表盘",
      search: "AI搜索",
      story: "故事",
      vocabulary: "词汇",
      quiz: "测验",
      audio: "听力",
      analytics: "分析",
      settings: "设置",
    },
    eyebrows: {
      "AI-NATIVE LANGUAGE PLATFORM": "AI 原生语言平台",
      "AGENT SEARCH": "智能搜索",
      "AI STORY BUILDER": "AI 故事生成",
      "VOCABULARY LIBRARY": "词汇库",
      "REVIEW QUIZ": "复习测验",
      "AUDIO REVIEW": "听力复习",
      "PROGRESS ANALYTICS": "学习分析",
      "SYSTEM SETTINGS": "系统设置",
      "LEXIAGENT WORKSPACE": "LEXIAGENT 工作区",
    },
    titles: {
      "Learning Dashboard": "学习仪表盘",
      "AI Example Search": "AI 例句搜索",
      "AI vocabulary paragraph practice": "AI 词汇段落练习",
      "My Vocabulary": "我的词汇",
      "Multiple-choice vocabulary exam": "多选词汇测验",
      "Hands-free vocabulary review": "免手动听力复习",
      "Learning analytics": "学习分析",
      Settings: "设置",
    },
    descriptions: {
      "Learning Dashboard":
        "查看已保存词汇、真实来源、测验准备情况以及 Telegram/OpenClaw 学习流程。",
      "AI Example Search":
        "搜索真实网页来源，生成多语言解释，并将词汇结果保存到 Supabase。",
      "AI vocabulary paragraph practice":
        "输入一个或多个词汇，LexiAgent 会生成学习段落、翻译内容并提供音频复习。",
      "My Vocabulary":
        "复习已保存词汇，查看例句，播放音频，并打开真实来源链接。",
      "Multiple-choice vocabulary exam":
        "使用已保存的 LexiAgent 词汇练习词义题和句子填空题。",
      "Hands-free vocabulary review":
        "逐个播放已保存词汇，显示词义，复习例句并进行听力练习。",
      "Learning analytics":
        "跟踪已保存词汇、真实来源、复习进度、语言覆盖和最近学习活动。",
      Settings:
        "查看语言默认值、Telegram 命令、OpenClaw 状态、API 配置和项目设置。",
    },
  },
  ar: {
    brandSubtitle: "تعلم ذكي متعدد اللغات",
    headerPill: "مساحة مشروع التخرج",
    legacy: "فتح النسخة القديمة",
    openclawLabel: "اتصال OPENCLAW",
    openclawTitle: "Telegram متصل",
    openclawText: "البوت جاهز لاستقبال أوامر المفردات.",
    nav: {
      dashboard: "الرئيسية",
      search: "بحث AI",
      story: "القصص",
      vocabulary: "المفردات",
      quiz: "الاختبار",
      audio: "الصوت",
      analytics: "التحليل",
      settings: "الإعدادات",
    },
    eyebrows: {
      "AI-NATIVE LANGUAGE PLATFORM": "منصة تعلم لغات بالذكاء الاصطناعي",
      "AGENT SEARCH": "بحث ذكي",
      "AI STORY BUILDER": "منشئ القصص",
      "VOCABULARY LIBRARY": "مكتبة المفردات",
      "REVIEW QUIZ": "اختبار المراجعة",
      "AUDIO REVIEW": "المراجعة الصوتية",
      "PROGRESS ANALYTICS": "تحليل التقدم",
      "SYSTEM SETTINGS": "إعدادات النظام",
      "LEXIAGENT WORKSPACE": "مساحة عمل LEXIAGENT",
    },
    titles: {
      "Learning Dashboard": "لوحة تعلم المفردات",
      "AI Example Search": "بحث الأمثلة بالذكاء الاصطناعي",
      "AI vocabulary paragraph practice": "تدريب فقرة بالمفردات",
      "My Vocabulary": "مفرداتي",
      "Multiple-choice vocabulary exam": "اختبار مفردات متعدد الخيارات",
      "Hands-free vocabulary review": "مراجعة صوتية بدون استخدام اليدين",
      "Learning analytics": "تحليل التقدم",
      Settings: "الإعدادات",
    },
    descriptions: {
      "Learning Dashboard":
        "تابع المفردات المحفوظة، والمصادر الموثقة، وجاهزية الاختبار، وسير عمل Telegram/OpenClaw.",
      "AI Example Search":
        "أضف مفردات جديدة عبر البحث في مصادر حقيقية، وتوليد شرح متعدد اللغات، وحفظ النتيجة في Supabase.",
      "AI vocabulary paragraph practice":
        "أدخل كلمة واحدة أو عدة كلمات، وسيولد LexiAgent فقرة تعليمية مع ترجمة ومراجعة صوتية.",
      "My Vocabulary":
        "راجع الكلمات المحفوظة، وافحص الأمثلة، واستمع إلى الصوت، وافتح روابط المصادر الموثقة.",
      "Multiple-choice vocabulary exam":
        "تدرّب على معاني الكلمات وأسئلة الجمل باستخدام مكتبة مفردات LexiAgent.",
      "Hands-free vocabulary review":
        "استمع إلى الكلمات المحفوظة، واكشف المعاني، وراجع الأمثلة كلمة بكلمة.",
      "Learning analytics":
        "تابع المفردات المحفوظة، والمصادر الموثقة، وتقدم المراجعة، وتغطية اللغات.",
      Settings:
        "راجع إعدادات اللغة، وأوامر Telegram، وحالة OpenClaw، وإعدادات API وتجهيزات المشروع.",
    },
  },
} as const;

function normalizePreferences(value: unknown): LexiAgentPreferences {
  if (!value || typeof value !== "object") {
    return DEFAULT_PREFERENCES;
  }

  const candidate = value as Partial<LexiAgentPreferences>;

  return {
    language:
      candidate.language === "zh" || candidate.language === "ar"
        ? candidate.language
        : "en",
    theme: candidate.theme === "dark" ? "dark" : "light",
  };
}

function readPreferenceRaw() {
  if (typeof window === "undefined") {
    return JSON.stringify(DEFAULT_PREFERENCES);
  }

  return (
    window.localStorage.getItem(PREFERENCES_KEY) ??
    JSON.stringify(DEFAULT_PREFERENCES)
  );
}

function parsePreferenceRaw(raw: string): LexiAgentPreferences {
  try {
    return normalizePreferences(JSON.parse(raw));
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

function subscribeToPreferences(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("lexiagent-preferences-changed", callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener("lexiagent-preferences-changed", callback);
    window.removeEventListener("storage", callback);
  };
}

export function applyLexiAgentPreferences(preferences: LexiAgentPreferences) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.dataset.theme = preferences.theme;
  document.documentElement.dataset.interfaceLanguage = preferences.language;
  document.documentElement.lang = preferences.language;

  document.body.dataset.theme = preferences.theme;
  document.body.dataset.interfaceLanguage = preferences.language;
}

export function saveLexiAgentPreferences(preferences: LexiAgentPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizePreferences(preferences);

  window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(normalized));
  applyLexiAgentPreferences(normalized);
  window.dispatchEvent(new Event("lexiagent-preferences-changed"));
}

export function useLexiAgentPreferences() {
  const raw = useSyncExternalStore(
    subscribeToPreferences,
    readPreferenceRaw,
    () => JSON.stringify(DEFAULT_PREFERENCES),
  );

  return useMemo(() => parsePreferenceRaw(raw), [raw]);
}

function routeDefault(pathname: string) {
  const match = Object.keys(routeDefaults).find((route) =>
    pathname === route || pathname.startsWith(`${route}/`),
  );

  return match ? routeDefaults[match] : routeDefaults["/dashboard"];
}

function translateValue<T extends Record<string, string>>(
  record: T,
  value: string,
) {
  return record[value as keyof T] ?? value;
}

export function AppShell({
  eyebrow,
  title,
  description,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const preferences = useLexiAgentPreferences();

  useEffect(() => {
    applyLexiAgentPreferences(preferences);
  }, [preferences]);

  const pageDefault = routeDefault(pathname);
  const effectiveEyebrow = eyebrow ?? pageDefault.eyebrow;
  const effectiveTitle = title ?? pageDefault.title;
  const effectiveDescription = description ?? pageDefault.description;

  const text = shellText[preferences.language];

  const localizedEyebrow = translateValue(text.eyebrows, effectiveEyebrow);
  const localizedTitle = translateValue(text.titles, effectiveTitle);
  const localizedDescription =
    translateValue(text.descriptions, effectiveTitle) ?? effectiveDescription;

  return (
    <div
      className={`multi-shell lang-${preferences.language} theme-${preferences.theme}`}
      data-interface-language={preferences.language}
      data-theme={preferences.theme}
    >
      <aside className="multi-sidebar">
        <Link href="/dashboard" className="multi-brand" prefetch>
          <span className="multi-brand-mark">L</span>
          <span>
            <strong>LexiAgent</strong>
            <small>{text.brandSubtitle}</small>
          </span>
        </Link>

        <nav className="multi-nav" aria-label="Main navigation">
          {navigation.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                className={active ? "multi-nav-link active" : "multi-nav-link"}
                aria-current={active ? "page" : undefined}
              >
                <span className="multi-nav-icon">{item.icon}</span>
                <span className="multi-nav-text">
                  {text.nav[item.key as NavigationKey]}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="multi-status-card">
          <p className="status-label">{text.openclawLabel}</p>
          <strong>{text.openclawTitle}</strong>
          <span>{text.openclawText}</span>
          <code>@maduoclawbot</code>
        </div>

        <Link href="/legacy" className="legacy-link" prefetch>
          {text.legacy}
        </Link>
      </aside>

      <main className="multi-main">
        <header className="multi-header">
          <div>
            <p className="multi-eyebrow">{localizedEyebrow}</p>
            <h1>{localizedTitle}</h1>
            <p>{localizedDescription}</p>
          </div>

          <span className="header-pill">{text.headerPill}</span>
        </header>

        <section className="multi-content">{children}</section>
      </main>
    </div>
  );
}