/* eslint-disable @next/next/no-img-element */
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
type UiLanguage = "en" | "ar" | "zh";
type LearningLanguage = "en" | "zh";
type NavigationSection = "dashboard" | "vocabulary" | "search" | "review" | "analytics" | "settings";

const navigationSections: NavigationSection[] = [
  "dashboard",
  "vocabulary",
  "search",
  "review",
  "analytics",
  "settings",
];


type VocabularyCardEntry = {
  id: string;
  word: string;
  pronunciation: string | null;
  part_of_speech: string | null;
  meaning: string;
  example_sentence: string;
  translated_example: string;
  source_name: string;
  source_title?: string | null;
  source_url: string;
  source_image_url?: string | null;
  source_image_description?: string | null;
  source_favicon_url?: string | null;
  source_verified: boolean;
  review_status: string;
};

type DashboardEntry = VocabularyCardEntry & {
  learning_language: LearningLanguage;
  explanation_language: UiLanguage;
  created_at: string;
};

type DashboardResponse = {
  connected: boolean;
  totals: {
    vocabularyEntries: number;
    agentRuns: number;
    learningHistory: number;
  };
  recentEntries: DashboardEntry[];
  recentAgentRuns: Array<{
    id: string;
    workflow_status: string;
  }>;
};

type AgentSearchResponse = {
  success: boolean;
  verified?: boolean;
  message?: string;
  entry?: VocabularyCardEntry;
  error?: string;
};

const languageLabels: Record<UiLanguage, Record<UiLanguage, string>> = {
  en: {
    en: "English",
    ar: "Arabic",
    zh: "Chinese",
  },
  ar: {
    en: "الإنجليزية",
    ar: "العربية",
    zh: "الصينية",
  },
  zh: {
    en: "英语",
    ar: "阿拉伯语",
    zh: "中文",
  },
};

const learningLabels: Record<
  UiLanguage,
  Record<LearningLanguage, string>
> = {
  en: {
    en: "English Vocabulary",
    zh: "Chinese Vocabulary",
  },
  ar: {
    en: "مفردات إنجليزية",
    zh: "مفردات صينية",
  },
  zh: {
    en: "英语词汇",
    zh: "汉语词汇",
  },
};

const translations = {
  en: {
    direction: "ltr",
    brandSubtitle: "Multilingual AI Learning",
    nav: [
      "Dashboard",
      "My Vocabulary",
      "AI Example Search",
      "Review Center",
      "Progress Analytics",
      "Settings",
    ],
    openClaw: "OpenClaw Connection",
    connected: "Telegram Connected",
    botDescription:
      "Your Telegram bot is ready to receive AI vocabulary commands.",
    finalProject: "Final Project Workspace",
    pageLabel: "AI-NATIVE LANGUAGE PLATFORM",
    pageTitle: "Learning Dashboard",
    interfaceLanguage: "Interface",
    learningLanguage: "Learning",
    explanationLanguage: "Explain in",
    requiredBadge: "REQUIRED FLOW: ENGLISH → CHINESE",
    innovationBadge: "ARABIC • ENGLISH • 中文",
    heroTitleStart: "Learn vocabulary from",
    heroTitleHighlight: " authentic context.",
    heroDescription:
      "Search real examples, understand words in your preferred language, and build a verified multilingual vocabulary library.",
    inputLabel: "New vocabulary search",
    inputPlaceholderEnglish: "Enter an English word",
    inputPlaceholderChinese: "Enter a Chinese word",
    searchButton: "Search Example",
    telegramCommand: "Planned Telegram Command",
    previewTitle: "Agent Result Preview",
    previewOnly: "UI PREVIEW — LIVE SOURCE CONNECTED LATER",
    word: "Word",
    meaning: "Meaning",
    example: "Example Preview",
    translation: "Translation",
    source: "Verified Source",
    sourcePending: "Waiting for live Agent search",
    sourceButton: "Open original article",
    sourceDisabled: "Available after search",
    statusReady: "Interface ready. Database and live search are the next stage.",
    statusQueued:
      "Preview request received. The real external search Agent will be connected next.",
    stats: [
      { title: "Interface Languages", value: "03", note: "Arabic • English • Chinese" },
      { title: "Learning Targets", value: "02", note: "English and Chinese" },
      { title: "Source Records", value: "00", note: "Added after Agent setup" },
      { title: "Gateway Status", value: "ON", note: "Telegram connected" },
    ],
    libraryLabel: "VOCABULARY LIBRARY",
    libraryTitle: "Multilingual card preview",
    previewMarker: "Preview",
    agentLabel: "CORE AGENT WORKFLOW",
    agentTitle: "How verified examples are saved",
    workflow: [
      {
        title: "Search",
        description: "Find a real article from an authentic language source.",
      },
      {
        title: "Extract",
        description: "Select a sentence containing the requested word.",
      },
      {
        title: "Explain",
        description: "Generate meaning and translation in the chosen language.",
      },
      {
        title: "Store",
        description: "Save the sentence, source name and original URL.",
      },
    ],
    sampleSentenceEnglish:
      "A live English sentence containing the searched word will appear here after external search is connected.",
    sampleSentenceChinese:
      "连接真实语料检索后，这里将显示包含目标词语的真实中文例句。",
    sampleTranslationEnglish:
      "The translation will be generated in your selected explanation language.",
    sampleTranslationArabic:
      "سيتم هنا عرض الترجمة باللغة التي يختارها المتعلم بعد تشغيل البحث الحقيقي.",
    sampleTranslationChinese:
      "连接真实检索后，系统将在这里生成所选语言的翻译。",
  },
  ar: {
    direction: "rtl",
    brandSubtitle: "تعلم لغات بالذكاء الاصطناعي",
    nav: [
      "لوحة التحكم",
      "مفرداتي",
      "البحث الذكي عن الأمثلة",
      "مركز المراجعة",
      "تحليل التقدم",
      "الإعدادات",
    ],
    openClaw: "اتصال OpenClaw",
    connected: "تيليجرام متصل",
    botDescription:
      "البوت جاهز لاستقبال أوامر تعلم المفردات عبر تيليجرام.",
    finalProject: "مساحة المشروع النهائي",
    pageLabel: "منصة لغات مدعومة بالذكاء الاصطناعي",
    pageTitle: "لوحة التعلم",
    interfaceLanguage: "لغة الواجهة",
    learningLanguage: "لغة الدراسة",
    explanationLanguage: "لغة الشرح",
    requiredBadge: "المطلوب: الإنجليزية ← الصينية",
    innovationBadge: "العربية • English • 中文",
    heroTitleStart: "تعلّم المفردات من",
    heroTitleHighlight: " سياقات حقيقية.",
    heroDescription:
      "ابحث عن أمثلة أصلية، وافهم المفردات بلغتك المفضلة، وابنِ مكتبة تعلم موثقة ومتعددة اللغات.",
    inputLabel: "البحث عن مفردة جديدة",
    inputPlaceholderEnglish: "اكتب كلمة إنجليزية",
    inputPlaceholderChinese: "اكتب كلمة صينية",
    searchButton: "البحث عن مثال",
    telegramCommand: "أمر تيليجرام المخطط",
    previewTitle: "معاينة نتيجة الذكاء الاصطناعي",
    previewOnly: "معاينة تصميم — سيتم ربط المصادر الحقيقية لاحقاً",
    word: "الكلمة",
    meaning: "المعنى",
    example: "معاينة المثال",
    translation: "الترجمة",
    source: "المصدر الموثق",
    sourcePending: "بانتظار ربط البحث الحقيقي",
    sourceButton: "فتح المقال الأصلي",
    sourceDisabled: "متاح بعد البحث",
    statusReady: "الواجهة جاهزة. الخطوة التالية هي قاعدة البيانات والبحث الحقيقي.",
    statusQueued:
      "تم استقبال طلب المعاينة. سنربط وكيل البحث الخارجي الحقيقي في الخطوة التالية.",
    stats: [
      { title: "لغات الواجهة", value: "03", note: "العربية • الإنجليزية • الصينية" },
      { title: "لغات الدراسة", value: "02", note: "الإنجليزية والصينية" },
      { title: "المصادر المحفوظة", value: "00", note: "تُضاف بعد ربط الوكيل" },
      { title: "حالة الاتصال", value: "ON", note: "تيليجرام متصل" },
    ],
    libraryLabel: "مكتبة المفردات",
    libraryTitle: "معاينة البطاقات متعددة اللغات",
    previewMarker: "معاينة",
    agentLabel: "سير عمل الوكيل الأساسي",
    agentTitle: "كيف يتم حفظ الأمثلة الموثقة",
    workflow: [
      {
        title: "البحث",
        description: "العثور على مقال حقيقي من مصدر لغوي موثوق.",
      },
      {
        title: "الاستخراج",
        description: "اختيار جملة أصلية تحتوي على المفردة المطلوبة.",
      },
      {
        title: "الشرح",
        description: "توليد المعنى والترجمة باللغة التي يختارها الطالب.",
      },
      {
        title: "الحفظ",
        description: "حفظ الجملة واسم المصدر والرابط الأصلي.",
      },
    ],
    sampleSentenceEnglish:
      "ستظهر هنا جملة إنجليزية حقيقية تحتوي على الكلمة بعد ربط البحث الخارجي.",
    sampleSentenceChinese:
      "بعد ربط البحث الحقيقي، ستظهر هنا جملة صينية أصلية تحتوي على الكلمة المطلوبة.",
    sampleTranslationEnglish:
      "سيتم إنشاء الترجمة باللغة التي يحددها المتعلم.",
    sampleTranslationArabic:
      "سيتم هنا عرض الترجمة العربية بعد تشغيل البحث الحقيقي.",
    sampleTranslationChinese:
      "سيتم هنا عرض الترجمة الصينية بعد تشغيل البحث الحقيقي.",
  },
  zh: {
    direction: "ltr",
    brandSubtitle: "多语言智能学习",
    nav: [
      "学习面板",
      "我的词库",
      "智能例句检索",
      "复习中心",
      "学习分析",
      "系统设置",
    ],
    openClaw: "OpenClaw 连接状态",
    connected: "Telegram 已连接",
    botDescription: "你的机器人已准备好通过 Telegram 接收词汇学习命令。",
    finalProject: "期末项目工作区",
    pageLabel: "AI 原生语言学习平台",
    pageTitle: "学习面板",
    interfaceLanguage: "界面语言",
    learningLanguage: "学习语言",
    explanationLanguage: "解释语言",
    requiredBadge: "必做流程：英语 → 中文",
    innovationBadge: "العربية • English • 中文",
    heroTitleStart: "从",
    heroTitleHighlight: "真实语境中学习词汇。",
    heroDescription:
      "检索真实例句，使用你熟悉的语言理解词汇，并建立带有原文链接的多语言词库。",
    inputLabel: "检索新词",
    inputPlaceholderEnglish: "输入一个英语单词",
    inputPlaceholderChinese: "输入一个中文词语",
    searchButton: "搜索真实例句",
    telegramCommand: "计划使用的 Telegram 命令",
    previewTitle: "智能体结果预览",
    previewOnly: "界面预览 — 下一阶段连接真实来源",
    word: "词语",
    meaning: "释义",
    example: "例句预览",
    translation: "翻译",
    source: "真实来源",
    sourcePending: "等待连接实时智能检索",
    sourceButton: "打开原文页面",
    sourceDisabled: "检索后可用",
    statusReady: "界面已准备完成。下一阶段将连接数据库和真实检索。",
    statusQueued: "已收到预览请求。下一阶段将接入真实外部检索智能体。",
    stats: [
      { title: "界面语言", value: "03", note: "阿拉伯语 • 英语 • 中文" },
      { title: "学习语言", value: "02", note: "英语和中文" },
      { title: "来源记录", value: "00", note: "接入智能体后保存" },
      { title: "连接状态", value: "ON", note: "Telegram 已连接" },
    ],
    libraryLabel: "个人词库",
    libraryTitle: "多语言词卡预览",
    previewMarker: "预览",
    agentLabel: "核心智能体工作流",
    agentTitle: "真实例句如何保存",
    workflow: [
      {
        title: "检索",
        description: "从可靠语言来源查找包含目标词的真实文章。",
      },
      {
        title: "提取",
        description: "选择一条包含目标词语的真实例句。",
      },
      {
        title: "解释",
        description: "使用学习者选择的语言生成释义和翻译。",
      },
      {
        title: "存储",
        description: "保存例句、来源名称和原始网页链接。",
      },
    ],
    sampleSentenceEnglish:
      "接入外部真实检索后，这里将显示包含目标单词的真实英语例句。",
    sampleSentenceChinese:
      "接入外部真实检索后，这里将显示包含目标词语的真实中文例句。",
    sampleTranslationEnglish:
      "系统将根据学习者选择的解释语言生成翻译。",
    sampleTranslationArabic:
      "接入真实检索后，系统将在这里生成阿拉伯语翻译。",
    sampleTranslationChinese:
      "接入真实检索后，系统将在这里生成中文翻译。",
  },
} as const;

const agentCopy: Record<
  UiLanguage,
  {
    searching: string;
    searchingHeader: string;
    saved: string;
    loaded: string;
    failed: string;
    verified: string;
    buttonWorking: string;
    liveResult: string;
    storedResult: string;
  }
> = {
  en: {
    searching: "Searching authentic sources, generating an explanation and verifying the saved result...",
    searchingHeader: "LIVE AGENT — SEARCHING AND VERIFYING",
    saved: "Verified result saved to your vocabulary library.",
    loaded: "Showing a verified result saved in your vocabulary library.",
    failed: "Agent search failed. Please run the search again.",
    verified: "Verified and saved",
    buttonWorking: "Searching...",
    liveResult: "LIVE AGENT — VERIFIED SOURCE",
    storedResult: "SAVED RESULT — VERIFIED SOURCE",
  },
  ar: {
    searching: "جارٍ البحث في مصادر حقيقية وتوليد الشرح والتحقق من النتيجة المحفوظة...",
    searchingHeader: "الوكيل المباشر — جارٍ البحث والتحقق",
    saved: "تم حفظ النتيجة الموثقة في مكتبة المفردات.",
    loaded: "يتم عرض نتيجة موثقة محفوظة في مكتبة المفردات.",
    failed: "فشل بحث الوكيل. أعد تشغيل البحث.",
    verified: "موثق ومحفوظ",
    buttonWorking: "جارٍ البحث...",
    liveResult: "نتيجة مباشرة — مصدر موثق",
    storedResult: "نتيجة محفوظة — مصدر موثق",
  },
  zh: {
    searching: "正在检索真实来源、生成释义并验证保存结果……",
    searchingHeader: "实时智能体 — 正在检索并验证",
    saved: "已将验证结果保存到个人词库。",
    loaded: "当前显示的是个人词库中已保存的验证结果。",
    failed: "智能体检索失败，请重新运行检索。",
    verified: "已验证并保存",
    buttonWorking: "检索中……",
    liveResult: "实时智能体 — 已验证来源",
    storedResult: "已保存结果 — 已验证来源",
  },
};

const pendingResultCopy: Record<
  UiLanguage,
  {
    meaning: string;
    partOfSpeech: string;
    example: string;
    translation: string;
  }
> = {
  en: {
    meaning: "Search to generate a verified meaning in the selected language.",
    partOfSpeech: "Pending",
    example: "A verified example sentence will appear after a successful search.",
    translation: "The translation will be generated after the search succeeds.",
  },
  ar: {
    meaning: "ابحث لتوليد معنى موثق باللغة التي اخترتها.",
    partOfSpeech: "بانتظار البحث",
    example: "ستظهر جملة موثقة بعد نجاح البحث.",
    translation: "ستظهر الترجمة بعد نجاح البحث.",
  },
  zh: {
    meaning: "请搜索以生成所选语言的已验证释义。",
    partOfSpeech: "等待检索",
    example: "成功检索后，将在此显示经过验证的真实例句。",
    translation: "检索成功后，将生成所选语言的翻译。",
  },
};

const quizCopy: Record<
  UiLanguage,
  {
    label: string;
    title: string;
    description: string;
    noCards: string;
    noCardsHint: string;
    question: string;
    instruction: string;
    check: string;
    next: string;
    finish: string;
    restart: string;
    correct: string;
    incorrect: string;
    source: string;
    progress: string;
    score: string;
    accuracy: string;
    resultTitle: string;
    excellent: string;
    good: string;
    practice: string;
  }
> = {
  en: {
    label: "REVIEW QUIZ",
    title: "Multiple-choice vocabulary exam",
    description: "Choose the missing word from a verified authentic sentence and receive an instant score.",
    noCards: "No verified vocabulary cards are available for this language pair.",
    noCardsHint: "Save at least one successful Agent result first, then start the quiz.",
    question: "Which word correctly completes this sentence?",
    instruction: "Choose one answer:",
    check: "Submit answer",
    next: "Next question",
    finish: "Finish exam",
    restart: "Restart quiz",
    correct: "Correct answer.",
    incorrect: "Incorrect. The correct answer is:",
    source: "Verified source",
    progress: "Question",
    score: "Marks",
    accuracy: "Accuracy",
    resultTitle: "Quiz result",
    excellent: "Excellent work. Your vocabulary recall is strong.",
    good: "Good result. Review the saved examples once more.",
    practice: "Continue practising with your saved authentic examples.",
  },
  ar: {
    label: "اختبار المراجعة",
    title: "اختبار مفردات متعدد الخيارات",
    description: "اختر الكلمة الناقصة من جملة حقيقية موثقة واحصل على درجتك مباشرة.",
    noCards: "لا توجد بطاقات مفردات موثقة لهذه اللغة بعد.",
    noCardsHint: "احفظ نتيجة ناجحة من الوكيل أولاً، ثم ابدأ الاختبار.",
    question: "ما الكلمة التي تكمل هذه الجملة بشكل صحيح؟",
    instruction: "اختر إجابة واحدة:",
    check: "إرسال الإجابة",
    next: "السؤال التالي",
    finish: "إنهاء الاختبار",
    restart: "إعادة الاختبار",
    correct: "إجابة صحيحة.",
    incorrect: "إجابة غير صحيحة. الإجابة الصحيحة هي:",
    source: "المصدر الموثق",
    progress: "السؤال",
    score: "الدرجة",
    accuracy: "النسبة",
    resultTitle: "نتيجة الاختبار",
    excellent: "ممتاز. قدرتك على تذكر المفردات قوية.",
    good: "نتيجة جيدة. راجع الأمثلة المحفوظة مرة أخرى.",
    practice: "استمر في التدريب باستخدام الأمثلة الحقيقية المحفوظة.",
  },
  zh: {
    label: "复习测验",
    title: "多项选择词汇考试",
    description: "根据已验证的真实例句选择缺失单词，并立即获得分数。",
    noCards: "此语言组合还没有已验证的词卡。",
    noCardsHint: "请先成功检索并保存至少一个词语，然后开始测验。",
    question: "哪一个单词可以正确补全这个句子？",
    instruction: "请选择一个答案：",
    check: "提交答案",
    next: "下一题",
    finish: "完成考试",
    restart: "重新开始",
    correct: "回答正确。",
    incorrect: "回答错误。正确答案是：",
    source: "验证来源",
    progress: "题目",
    score: "得分",
    accuracy: "正确率",
    resultTitle: "测验结果",
    excellent: "非常好，你对这些词汇掌握得很牢固。",
    good: "成绩不错，请再复习一次保存的例句。",
    practice: "请继续使用真实例句练习词汇。",
  },
};

function escapeRegularExpression(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatVisibleSourceUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    const visiblePath = url.pathname === "/" ? "" : url.pathname;
    const combined = `${host}${visiblePath}`;

    return combined.length > 62 ? `${combined.slice(0, 59)}…` : combined;
  } catch {
    return value;
  }
}

function createQuizSentence(entry: DashboardEntry, language: LearningLanguage) {
  if (language === "zh") {
    return entry.example_sentence.replace(entry.word, "______");
  }

  const expression = new RegExp(
    `\\b${escapeRegularExpression(entry.word)}\\b`,
    "gi",
  );

  return entry.example_sentence.replace(expression, "______");
}

function buildQuizOptions(
  correctEntry: DashboardEntry,
  entries: DashboardEntry[],
  questionIndex: number,
) {
  const verifiedWords = Array.from(
    new Set(
      entries
        .filter((entry) => entry.source_verified && entry.word.trim() !== "")
        .map((entry) => entry.word),
    ),
  );

  const options = [
    correctEntry.word,
    ...verifiedWords.filter((word) => word !== correctEntry.word),
  ].slice(0, 4);

  if (options.length < 2) {
    return options;
  }

  const rotation = (questionIndex + correctEntry.word.length) % options.length;
  return [...options.slice(rotation), ...options.slice(0, rotation)];
}

function MenuIcon({ index }: { index: number }) {
  const icons = ["▣", "A", "◎", "✓", "▥", "⚙"];
  return <span className="menu-icon">{icons[index]}</span>;
}


export default function Home() {
  const [uiLanguage, setUiLanguage] = useState<UiLanguage>("en");
  const [learningLanguage, setLearningLanguage] =
    useState<LearningLanguage>("en");
  const [explanationLanguage, setExplanationLanguage] =
    useState<UiLanguage>("zh");
  const [queryWord, setQueryWord] = useState("sanction");
  const [dashboardData, setDashboardData] = useState<DashboardResponse | null>(
    null,
  );
  const [databaseLoading, setDatabaseLoading] = useState(true);
  const [databaseError, setDatabaseError] = useState(false);
  const [agentResult, setAgentResult] = useState<VocabularyCardEntry | null>(
    null,
  );
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentSuccess, setAgentSuccess] = useState(false);
  const [activeSection, setActiveSection] = useState<NavigationSection>("dashboard");
  const [quizChoice, setQuizChoice] = useState<string | null>(null);
  const [quizChecked, setQuizChecked] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizCorrectAnswers, setQuizCorrectAnswers] = useState(0);
  const [quizAnswered, setQuizAnswered] = useState(0);

  const loadDashboardData = useCallback(async () => {
    setDatabaseLoading(true);

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store",
      });

      const result = (await response.json()) as DashboardResponse;

      if (!response.ok || !result.connected) {
        throw new Error("Dashboard database request failed.");
      }

      setDashboardData(result);
      setDatabaseError(false);
    } catch {
      setDatabaseError(true);
    } finally {
      setDatabaseLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/dashboard", {
      cache: "no-store",
    })
      .then(async (response) => {
        const result = (await response.json()) as DashboardResponse;

        if (!response.ok || !result.connected) {
          throw new Error("Dashboard database request failed.");
        }

        return result;
      })
      .then((result) => {
        if (!cancelled) {
          setDashboardData(result);
          setDatabaseError(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDatabaseError(true);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDatabaseLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const t = translations[uiLanguage];
  const agentUi = agentCopy[uiLanguage];
  function resetAgentPanel() {
    setAgentResult(null);
    setAgentError(null);
    setAgentSuccess(false);
  }

  function resetQuiz() {
    setQuizChoice(null);
    setQuizChecked(false);
    setQuizIndex(0);
    setQuizCorrectAnswers(0);
    setQuizAnswered(0);
  }

  function changeLearningLanguage(language: LearningLanguage) {
    setLearningLanguage(language);
    setQueryWord(language === "en" ? "sanction" : "学习");
    resetAgentPanel();
    resetQuiz();
  }

  function changeExplanationLanguage(language: UiLanguage) {
    setExplanationLanguage(language);
    resetAgentPanel();
    resetQuiz();
  }

  function scrollToSection(section: NavigationSection) {
    setActiveSection(section);
    document.getElementById(section)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function isRetryableSearchError(message: string) {
    return /terminated|fetch failed|network|temporar|rate[- ]?limit|provider returned error|\b429\b|\b503\b/i.test(
      message,
    );
  }

  function wait(milliseconds: number) {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  async function submitAgentSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const word = queryWord.trim();

    if (agentLoading || word.length < 2) {
      return;
    }

    setActiveSection("search");
    setAgentLoading(true);
    setAgentError(null);
    setAgentSuccess(false);
    setAgentResult(null);

    let lastMessage = agentUi.failed;

    try {
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          const response = await fetch("/api/agent/search", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              word,
              learningLanguage,
              explanationLanguage,
              channel: "web",
            }),
          });

          const result = (await response.json()) as AgentSearchResponse;

          if (!response.ok || !result.success || !result.entry) {
            throw new Error(result.error || agentUi.failed);
          }

          setAgentResult(result.entry);
          setAgentSuccess(true);
          await loadDashboardData();
          return;
        } catch (error) {
          lastMessage =
            error instanceof Error && error.message
              ? error.message
              : agentUi.failed;

          if (attempt < 2 && isRetryableSearchError(lastMessage)) {
            await wait(3000);
            continue;
          }

          throw new Error(lastMessage);
        }
      }
    } catch {
      setAgentError(lastMessage);
    } finally {
      setAgentLoading(false);
    }
  }

  const command = `add ${
    queryWord || (learningLanguage === "en" ? "sanction" : "学习")
  } --learn ${learningLanguage} --explain ${explanationLanguage}`;

  const liveEntries =
    dashboardData?.recentEntries.filter(
      (entry) =>
        entry.learning_language === learningLanguage &&
        entry.explanation_language === explanationLanguage,
    ) ?? [];

  const normalizedQuery =
    learningLanguage === "en" ? queryWord.trim().toLowerCase() : queryWord.trim();

  const storedMatchingEntry =
    liveEntries.find((entry) => {
      const storedWord =
        learningLanguage === "en" ? entry.word.toLowerCase() : entry.word;

      return storedWord === normalizedQuery;
    }) ?? null;

  const displayedResult = agentResult ?? storedMatchingEntry;
  const isLiveResult = Boolean(displayedResult?.source_verified);
  const panelIsNewResult = Boolean(agentResult?.source_verified);
  const pendingResult = pendingResultCopy[uiLanguage];

  const displayWord = displayedResult?.word ?? (queryWord.trim() || "—");
  const displayPronunciation = displayedResult?.pronunciation ?? "—";
  const displayPartOfSpeech =
    displayedResult?.part_of_speech ?? pendingResult.partOfSpeech;
  const displayMeaning = displayedResult?.meaning ?? pendingResult.meaning;
  const displayExample =
    displayedResult?.example_sentence ?? pendingResult.example;
  const displayTranslation =
    displayedResult?.translated_example ?? pendingResult.translation;

  const liveStats = t.stats.map((stat, index) => {
    if (index === 2) {
      return {
        ...stat,
        value: databaseLoading
          ? "--"
          : String(dashboardData?.totals.vocabularyEntries ?? 0).padStart(
              2,
              "0",
            ),
      };
    }

    if (index === 3) {
      return {
        ...stat,
        value: databaseError
          ? "OFF"
          : dashboardData?.connected
            ? "ON"
            : "--",
      };
    }

    return stat;
  });

  const libraryText = {
    en: {
      emptyTitle: "No saved vocabulary yet",
      emptyDescription:
        "Authentic Agent results will appear here after they are saved to Supabase.",
      loading: "Loading vocabulary records...",
      saved: "Saved",
    },
    ar: {
      emptyTitle: "لا توجد مفردات محفوظة بعد",
      emptyDescription:
        "ستظهر نتائج الوكيل الحقيقية هنا بعد حفظها في قاعدة البيانات.",
      loading: "جارٍ تحميل المفردات...",
      saved: "محفوظ",
    },
    zh: {
      emptyTitle: "还没有保存的词汇",
      emptyDescription: "智能体检索并保存真实例句后，记录将显示在这里。",
      loading: "正在加载词汇记录...",
      saved: "已保存",
    },
  }[uiLanguage];

  const statusClass = agentError
    ? "failed"
    : agentLoading
      ? "requested"
      : isLiveResult
        ? "success"
        : "";

  const statusText = agentError
    ? agentError
    : agentLoading
      ? agentUi.searching
      : agentSuccess
        ? agentUi.saved
        : isLiveResult
          ? agentUi.loaded
          : t.statusReady;

  const currentQuizCopy = quizCopy[uiLanguage];
  const quizEntries = liveEntries.filter(
    (entry) => entry.example_sentence && entry.word,
  );
  const quizFinished = quizEntries.length > 0 && quizIndex >= quizEntries.length;
  const currentQuizEntry =
    !quizFinished && quizEntries.length > 0 ? quizEntries[quizIndex] : null;
  const quizSentence = currentQuizEntry
    ? createQuizSentence(currentQuizEntry, learningLanguage)
    : "";
  const quizOptions = currentQuizEntry
    ? buildQuizOptions(currentQuizEntry, quizEntries, quizIndex)
    : [];
  const expectedQuizAnswer = currentQuizEntry?.word ?? "";
  const quizIsCorrect = quizChecked && quizChoice === expectedQuizAnswer;
  const isLastQuizQuestion = quizIndex === quizEntries.length - 1;
  const quizAccuracy =
    quizAnswered === 0 ? 0 : Math.round((quizCorrectAnswers / quizAnswered) * 100);
  const finalQuizMessage =
    quizAccuracy >= 80
      ? currentQuizCopy.excellent
      : quizAccuracy >= 50
        ? currentQuizCopy.good
        : currentQuizCopy.practice;

  function submitQuizAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentQuizEntry || !quizChoice || quizChecked) {
      return;
    }

    setQuizChecked(true);
    setQuizAnswered((current) => current + 1);

    if (quizChoice === expectedQuizAnswer) {
      setQuizCorrectAnswers((current) => current + 1);
    }
  }

  function moveToNextQuiz() {
    if (!quizChecked || quizEntries.length === 0) {
      return;
    }

    setQuizChoice(null);
    setQuizChecked(false);
    setQuizIndex((current) => current + 1);
  }


  return (
    <main
      className={`application ${uiLanguage === "ar" ? "arabic-layout" : ""}`}
      dir={t.direction}
      lang={uiLanguage}
    >
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-symbol">L</div>
          <div>
            <h1>LexiAgent</h1>
            <p>{t.brandSubtitle}</p>
          </div>
        </div>

        <nav className="menu" aria-label="Primary navigation">
          {t.nav.map((item, index) => {
            const section = navigationSections[index];

            return (
              <button
                className={`menu-item ${activeSection === section ? "selected" : ""}`}
                type="button"
                key={item}
                onClick={() => scrollToSection(section)}
              >
                <MenuIcon index={index} />
                <span>{item}</span>
              </button>
            );
          })}
        </nav>

        <div className="connection-card">
          <p className="minor-label">{t.openClaw}</p>
          <div className="connection-title">
            <span className="online-dot" />
            <strong>{t.connected}</strong>
          </div>
          <p>{t.botDescription}</p>
          <div className="bot-chip">@maduoclawbot</div>
        </div>

        <div className="account-card">
          <div className="account-avatar">M</div>
          <div>
            <strong>LexiAgent</strong>
            <p>{t.finalProject}</p>
          </div>
        </div>
      </aside>

      <section className="workspace" id="dashboard">
        <header className="topbar">
          <div className="page-heading">
            <p className="minor-label">{t.pageLabel}</p>
            <h2>{t.pageTitle}</h2>
          </div>

          <div className="language-controls" id="settings">
            <label className="select-control">
              <span>{t.interfaceLanguage}</span>
              <select
                value={uiLanguage}
                onChange={(event) =>
                  setUiLanguage(event.target.value as UiLanguage)
                }
              >
                <option value="en">{languageLabels[uiLanguage].en}</option>
                <option value="ar">{languageLabels[uiLanguage].ar}</option>
                <option value="zh">{languageLabels[uiLanguage].zh}</option>
              </select>
            </label>

            <label className="select-control">
              <span>{t.learningLanguage}</span>
              <select
                value={learningLanguage}
                onChange={(event) =>
                  changeLearningLanguage(
                    event.target.value as LearningLanguage,
                  )
                }
              >
                <option value="en">{learningLabels[uiLanguage].en}</option>
                <option value="zh">{learningLabels[uiLanguage].zh}</option>
              </select>
            </label>

            <label className="select-control">
              <span>{t.explanationLanguage}</span>
              <select
                value={explanationLanguage}
                onChange={(event) =>
                  changeExplanationLanguage(event.target.value as UiLanguage)
                }
              >
                <option value="en">{languageLabels[uiLanguage].en}</option>
                <option value="ar">{languageLabels[uiLanguage].ar}</option>
                <option value="zh">{languageLabels[uiLanguage].zh}</option>
              </select>
            </label>
          </div>
        </header>

        <section className="hero-grid">
          <article className="hero-panel" id="search">
            <div className="badges">
              <span className="required-badge">{t.requiredBadge}</span>
              <span className="innovation-badge">{t.innovationBadge}</span>
            </div>

            <h3>
              {t.heroTitleStart}
              <span>{t.heroTitleHighlight}</span>
            </h3>

            <p className="hero-description">{t.heroDescription}</p>

            <form className="search-form" onSubmit={submitAgentSearch}>
              <label htmlFor="word-input">{t.inputLabel}</label>

              <div className="search-row">
                <input
                  id="word-input"
                  type="text"
                  value={queryWord}
                  onChange={(event) => {
                    setQueryWord(event.target.value);
                    resetAgentPanel();
                  }}
                  placeholder={
                    learningLanguage === "en"
                      ? t.inputPlaceholderEnglish
                      : t.inputPlaceholderChinese
                  }
                  disabled={agentLoading}
                />
                <button
                  type="submit"
                  disabled={agentLoading || queryWord.trim().length < 2}
                >
                  {agentLoading ? agentUi.buttonWorking : t.searchButton}
                </button>
              </div>
            </form>

            <div className="telegram-command">
              <div>
                <p>{t.telegramCommand}</p>
                <code>{command}</code>
              </div>
              <span className="telegram-tag">Telegram</span>
            </div>

            <p className={`system-status ${statusClass}`}>
              <span />
              {statusText}
            </p>
          </article>

          <article className="preview-panel">
            <div className="preview-header">
              <div className="agent-live">
                <span />
                {t.previewTitle}
              </div>
              <p>
                {agentLoading
                  ? agentUi.searchingHeader
                  : isLiveResult
                    ? panelIsNewResult
                      ? agentUi.liveResult
                      : agentUi.storedResult
                    : t.previewOnly}
              </p>
            </div>

            <div className="featured-word">
              <div>
                <p>{t.word}</p>
                <h3>{displayWord}</h3>
              </div>
              <span>{displayPronunciation}</span>
            </div>

            <div className="meaning-box">
              <p>{t.meaning}</p>
              <strong>{displayMeaning}</strong>
              <span>{displayPartOfSpeech}</span>
            </div>

            <div className="example-box">
              <p>{t.example}</p>
              <strong>{displayExample}</strong>
              <div className="translation-line">
                <span>{t.translation}</span>
                <p>{displayTranslation}</p>
              </div>
            </div>

            {isLiveResult && displayedResult ? (
              <div className="source-preview-card">
                {displayedResult.source_image_url ? (
                  <img
                    className="source-preview-image"
                    src={displayedResult.source_image_url}
                    alt={
                      displayedResult.source_image_description ??
                      displayedResult.source_title ??
                      `${displayedResult.source_name} article image`
                    }
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="source-image-fallback">
                    <span>{displayedResult.source_name}</span>
                  </div>
                )}

                <div className="source-preview-content">
                  <div className="source-publisher">
                    {displayedResult.source_favicon_url ? (
                      <img
                        className="source-favicon"
                        src={displayedResult.source_favicon_url}
                        alt=""
                        width={22}
                        height={22}
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <div>
                      <p>{t.source}</p>
                      <strong>{displayedResult.source_name}</strong>
                    </div>
                  </div>

                  <h4 className="source-article-title">
                    {displayedResult.source_title ?? displayedResult.source_name}
                  </h4>

                  <p className="source-visible-url">
                    {formatVisibleSourceUrl(displayedResult.source_url)}
                  </p>

                  <a
                    className="source-result-link source-open-link"
                    href={displayedResult.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.sourceButton}
                    <span>{agentUi.verified} ↗</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="source-box">
                <div>
                  <p>{t.source}</p>
                  <strong>{t.sourcePending}</strong>
                </div>
                <button type="button" disabled>
                  {t.sourceButton}
                  <span>{t.sourceDisabled}</span>
                </button>
              </div>
            )}
          </article>
        </section>

        <section className="stats-row" id="analytics">
          {liveStats.map((stat) => (
            <article className="stat-panel" key={stat.title}>
              <p>{stat.title}</p>
              <strong>{stat.value}</strong>
              <span>{stat.note}</span>
            </article>
          ))}
        </section>

        <section className="lower-grid">
          <article className="library-panel" id="vocabulary">
            <div className="panel-title">
              <div>
                <p className="minor-label">{t.libraryLabel}</p>
                <h3>{t.libraryTitle}</h3>
              </div>
              <span
                className={`preview-pill ${
                  dashboardData?.connected ? "live-database" : ""
                }`}
              >
                {dashboardData?.connected ? "LIVE DB" : t.previewMarker}
              </span>
            </div>

            <div className="cards-table">
              {databaseLoading ? (
                <div className="empty-library">
                  <strong>{libraryText.loading}</strong>
                </div>
              ) : liveEntries.length === 0 ? (
                <div className="empty-library">
                  <strong>{libraryText.emptyTitle}</strong>
                  <p>{libraryText.emptyDescription}</p>
                </div>
              ) : (
                liveEntries.map((entry) => (
                  <div className="vocabulary-row" key={entry.id}>
                    <div className="vocabulary-word">
                      <strong>{entry.word}</strong>
                      <span>{entry.pronunciation ?? "—"}</span>
                      <a
                        href={entry.source_url}
                        target="_blank"
                        rel="noreferrer"
                        title={entry.source_title ?? entry.source_name}
                      >
                        {entry.source_name} ↗
                      </a>
                    </div>

                    <p>{entry.part_of_speech ?? "—"}</p>

                    <p className="translated-meaning">{entry.meaning}</p>

                    <span className="saved-pill">{libraryText.saved}</span>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="workflow-panel" id="review">
            <div className="panel-title">
              <div>
                <p className="minor-label">{currentQuizCopy.label}</p>
                <h3>{currentQuizCopy.title}</h3>
              </div>
            </div>

            <p className="quiz-description">{currentQuizCopy.description}</p>

            {quizEntries.length < 2 ? (
              <div className="empty-library quiz-empty">
                <strong>{currentQuizCopy.noCards}</strong>
                <p>{currentQuizCopy.noCardsHint}</p>
              </div>
            ) : quizFinished ? (
              <div className="quiz-result-card">
                <p className="minor-label">{currentQuizCopy.resultTitle}</p>
                <strong className="quiz-final-score">
                  {quizCorrectAnswers} / {quizEntries.length}
                </strong>
                <p className="quiz-final-percentage">{quizAccuracy}%</p>
                <p className="quiz-final-message">{finalQuizMessage}</p>
                <button type="button" className="quiz-restart" onClick={resetQuiz}>
                  {currentQuizCopy.restart}
                </button>
              </div>
            ) : currentQuizEntry ? (
              <div className="quiz-shell">
                <div className="quiz-scoreboard">
                  <div className="quiz-score-item">
                    <span>{currentQuizCopy.progress}</span>
                    <strong>
                      {quizIndex + 1} / {quizEntries.length}
                    </strong>
                  </div>
                  <div className="quiz-score-item">
                    <span>{currentQuizCopy.score}</span>
                    <strong>{quizCorrectAnswers}</strong>
                  </div>
                  <div className="quiz-score-item">
                    <span>{currentQuizCopy.accuracy}</span>
                    <strong>{quizAccuracy}%</strong>
                  </div>
                </div>

                <div className="quiz-meta">
                  <span>{currentQuizCopy.source}</span>
                  <a
                    href={currentQuizEntry.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {currentQuizEntry.source_name} ↗
                  </a>
                </div>

                <p className="quiz-question">{currentQuizCopy.question}</p>
                <div className="quiz-sentence">{quizSentence}</div>

                <form className="quiz-form" onSubmit={submitQuizAnswer}>
                  <p className="quiz-option-instruction">{currentQuizCopy.instruction}</p>
                  <div className="quiz-options">
                    {quizOptions.map((option, optionIndex) => {
                      const selected = quizChoice === option;
                      const correct = quizChecked && option === expectedQuizAnswer;
                      const incorrect = quizChecked && selected && option !== expectedQuizAnswer;

                      return (
                        <button
                          className={`quiz-option ${selected ? "selected" : ""} ${correct ? "correct" : ""} ${incorrect ? "incorrect" : ""}`}
                          key={option}
                          type="button"
                          disabled={quizChecked}
                          onClick={() => setQuizChoice(option)}
                        >
                          <span>{String.fromCharCode(65 + optionIndex)}</span>
                          <strong>{option}</strong>
                        </button>
                      );
                    })}
                  </div>

                  <div className="quiz-actions">
                    <button type="submit" disabled={!quizChoice || quizChecked}>
                      {currentQuizCopy.check}
                    </button>
                    {quizChecked ? (
                      <button
                        className="secondary-action"
                        type="button"
                        onClick={moveToNextQuiz}
                      >
                        {isLastQuizQuestion
                          ? currentQuizCopy.finish
                          : currentQuizCopy.next}
                      </button>
                    ) : null}
                  </div>
                </form>

                {quizChecked ? (
                  <p
                    className={`quiz-feedback ${quizIsCorrect ? "correct" : "incorrect"}`}
                  >
                    {quizIsCorrect
                      ? currentQuizCopy.correct
                      : `${currentQuizCopy.incorrect} ${expectedQuizAnswer}`}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="workflow compact-workflow">
              {t.workflow.map((step, index) => (
                <div className="workflow-card" key={step.title}>
                  <span className="step-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

