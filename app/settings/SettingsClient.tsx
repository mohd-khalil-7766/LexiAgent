"use client";

import { useState } from "react";
import {
  saveLexiAgentPreferences,
  useLexiAgentPreferences,
  type InterfaceLanguage,
  type InterfaceTheme,
} from "@/components/AppShell";
import styles from "./SettingsClient.module.css";

export type SettingsProfile = {
  id: string;
  display_name: string;
  interface_language: string | null;
  default_learning_language: string | null;
  default_explanation_language: string | null;
  telegram_bot: string | null;
};

export type IntegrationStatus = {
  name: string;
  description: string;
  configured: boolean;
  detail: string;
};

type SettingsClientProps = {
  profile: SettingsProfile;
  integrations: IntegrationStatus[];
};

type SettingsCopy = {
  workspaceControls: string;
  preferences: string;
  preferencesDesc: string;
  theme: string;
  light: string;
  dark: string;
  language: string;
  english: string;
  chinese: string;
  arabic: string;
  previewTitle: string;
  previewText: string;
  profile: string;
  profileDescription: string;
  configuration: string;
  servicesDetected: (ready: number, total: number) => string;
  services: string;
  systemConnections: string;
  noSecrets: string;
  ready: string;
  missing: string;
  commands: string;
  telegramCommands: string;
  copied: string;
  copy: string;
  interface: string;
  learning: string;
  explanation: string;
  telegramBot: string;
  notSet: string;
  commandExamples: string;
};

const text: Record<InterfaceLanguage, SettingsCopy> = {
  en: {
    workspaceControls: "Workspace Controls",
    preferences: "Interface preferences",
    preferencesDesc:
      "Change the workspace appearance and navigation language. The setting is saved in this browser.",
    theme: "Theme mode",
    light: "Light mode",
    dark: "Dark mode",
    language: "Interface language",
    english: "English",
    chinese: "Chinese",
    arabic: "Arabic",
    previewTitle: "Live preview",
    previewText: "Your interface preference is now active.",
    profile: "Learner Profile",
    profileDescription:
      "This profile controls the default language direction and the main workspace settings used by LexiAgent.",
    configuration: "Configuration Score",
    servicesDetected: (ready, total) =>
      `${ready} of ${total} required services are detected.`,
    services: "API and service status",
    systemConnections: "System Connections",
    noSecrets: "No secrets shown",
    ready: "Ready",
    missing: "Missing",
    commands: "OpenClaw command format",
    telegramCommands: "Telegram Commands",
    copied: "Copied",
    copy: "Copy",
    interface: "Interface",
    learning: "Learning",
    explanation: "Explanation",
    telegramBot: "Telegram Bot",
    notSet: "Not set",
    commandExamples: "Command examples",
  },
  zh: {
    workspaceControls: "工作区控制",
    preferences: "界面偏好设置",
    preferencesDesc: "切换工作区外观和导航语言。设置会保存在当前浏览器中。",
    theme: "主题模式",
    light: "白天模式",
    dark: "夜间模式",
    language: "界面语言",
    english: "英语",
    chinese: "中文",
    arabic: "阿拉伯语",
    previewTitle: "实时预览",
    previewText: "你的界面偏好设置已生效。",
    profile: "学习者资料",
    profileDescription:
      "此资料用于管理 LexiAgent 的默认语言方向和主要工作区设置。",
    configuration: "配置完成度",
    servicesDetected: (ready, total) => `已检测到 ${ready}/${total} 项必要服务。`,
    services: "API 与服务状态",
    systemConnections: "系统连接",
    noSecrets: "不显示密钥",
    ready: "已就绪",
    missing: "缺失",
    commands: "OpenClaw 命令格式",
    telegramCommands: "Telegram 命令",
    copied: "已复制",
    copy: "复制",
    interface: "界面",
    learning: "学习语言",
    explanation: "解释语言",
    telegramBot: "Telegram 机器人",
    notSet: "未设置",
    commandExamples: "命令示例",
  },
  ar: {
    workspaceControls: "إعدادات مساحة العمل",
    preferences: "تفضيلات الواجهة",
    preferencesDesc:
      "غيّر مظهر مساحة العمل ولغة التنقل. سيتم حفظ الإعداد في هذا المتصفح.",
    theme: "وضع المظهر",
    light: "الوضع النهاري",
    dark: "الوضع الليلي",
    language: "لغة الواجهة",
    english: "الإنجليزية",
    chinese: "الصينية",
    arabic: "العربية",
    previewTitle: "معاينة مباشرة",
    previewText: "تم تفعيل إعدادات الواجهة الآن.",
    profile: "ملف المتعلم",
    profileDescription:
      "يتحكم هذا الملف في اتجاه اللغة الافتراضي وإعدادات مساحة العمل الرئيسية في LexiAgent.",
    configuration: "درجة الإعداد",
    servicesDetected: (ready, total) =>
      `تم اكتشاف ${ready} من أصل ${total} خدمات مطلوبة.`,
    services: "حالة API والخدمات",
    systemConnections: "اتصالات النظام",
    noSecrets: "لا يتم عرض المفاتيح",
    ready: "جاهز",
    missing: "ناقص",
    commands: "صيغة أوامر OpenClaw",
    telegramCommands: "أوامر Telegram",
    copied: "تم النسخ",
    copy: "نسخ",
    interface: "الواجهة",
    learning: "لغة التعلم",
    explanation: "لغة الشرح",
    telegramBot: "بوت Telegram",
    notSet: "غير محدد",
    commandExamples: "أمثلة الأوامر",
  },
};

const integrationCopy: Record<
  InterfaceLanguage,
  Record<string, { name: string; description: string; detail: string }>
> = {
  en: {},
  zh: {
    "Supabase Database": {
      name: "Supabase 数据库",
      description: "存储学习者资料、词汇、来源和复习次数。",
      detail: "已检测到项目 URL",
    },
    "Supabase Service Key": {
      name: "Supabase 服务密钥",
      description: "允许服务器保存词汇并更新复习进度。",
      detail: "已检测到服务器密钥",
    },
    "OpenRouter AI": {
      name: "OpenRouter AI",
      description: "生成词义、翻译、例句和智能回复。",
      detail: "AI 模型密钥状态",
    },
    "Tavily Search": {
      name: "Tavily 搜索",
      description: "在保存词汇前搜索真实网页来源。",
      detail: "搜索 API 状态",
    },
    "Telegram / OpenClaw": {
      name: "Telegram / OpenClaw",
      description: "接收 Telegram 命令并发送到本地 LexiAgent 应用。",
      detail: "Telegram 连接状态",
    },
  },
  ar: {
    "Supabase Database": {
      name: "قاعدة بيانات Supabase",
      description: "تخزن ملف المتعلم والمفردات والمصادر وعدد المراجعات.",
      detail: "تم اكتشاف رابط المشروع",
    },
    "Supabase Service Key": {
      name: "مفتاح خدمة Supabase",
      description: "يسمح للخادم بحفظ المفردات وتحديث تقدم المراجعة.",
      detail: "تم اكتشاف مفتاح الخادم",
    },
    "OpenRouter AI": {
      name: "OpenRouter AI",
      description: "ينشئ المعاني والترجمات والأمثلة وردود الوكيل.",
      detail: "حالة مفتاح نموذج الذكاء الاصطناعي",
    },
    "Tavily Search": {
      name: "بحث Tavily",
      description: "يبحث في مصادر ويب حقيقية قبل حفظ المفردات.",
      detail: "حالة Search API",
    },
    "Telegram / OpenClaw": {
      name: "Telegram / OpenClaw",
      description: "يستقبل أوامر Telegram ويرسلها إلى تطبيق LexiAgent المحلي.",
      detail: "حالة اتصال Telegram",
    },
  },
};

function languageLabel(value: string | null, language: InterfaceLanguage) {
  const labels: Record<InterfaceLanguage, Record<string, string>> = {
    en: {
      en: "English",
      zh: "Chinese",
      ar: "Arabic",
    },
    zh: {
      en: "英语",
      zh: "中文",
      ar: "阿拉伯语",
    },
    ar: {
      en: "الإنجليزية",
      zh: "الصينية",
      ar: "العربية",
    },
  };

  return value ? labels[language][value] ?? value : text[language].notSet;
}

export function SettingsClient({ profile, integrations }: SettingsClientProps) {
  const preferences = useLexiAgentPreferences();
  const [copiedCommand, setCopiedCommand] = useState("");

  const t = text[preferences.language];
  const configuredCount = integrations.filter((item) => item.configured).length;
  const configurationScore = Math.round(
    (configuredCount / integrations.length) * 100,
  );

  const telegramCommands = [
    "add university --learn en --explain zh",
    "add love --learn en --explain ar",
    "add 学校 --learn zh --explain en",
    "add water --learn en --explain ar",
  ];

  function updateTheme(theme: InterfaceTheme) {
    saveLexiAgentPreferences({
      ...preferences,
      theme,
    });
  }

  function updateLanguage(language: InterfaceLanguage) {
    saveLexiAgentPreferences({
      ...preferences,
      language,
    });
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedCommand(value);

      window.setTimeout(() => {
        setCopiedCommand("");
      }, 1600);
    } catch {
      setCopiedCommand("Copy failed");
    }
  }

  return (
    <section
      className={styles.settingsLayout}
      dir={preferences.language === "ar" ? "rtl" : "ltr"}
    >
      <article className={styles.preferenceCard}>
        <div className={styles.cardIntro}>
          <p className={styles.kicker}>{t.workspaceControls}</p>
          <h2>{t.preferences}</h2>
          <p>{t.preferencesDesc}</p>
        </div>

        <div className={styles.preferenceGrid}>
          <section>
            <span>{t.theme}</span>

            <div className={styles.optionRow}>
              <button
                type="button"
                className={
                  preferences.theme === "light" ? styles.activeOption : ""
                }
                onClick={() => updateTheme("light")}
              >
                {t.light}
              </button>

              <button
                type="button"
                className={
                  preferences.theme === "dark" ? styles.activeOption : ""
                }
                onClick={() => updateTheme("dark")}
              >
                {t.dark}
              </button>
            </div>
          </section>

          <section>
            <span>{t.language}</span>

            <div className={styles.optionRow}>
              <button
                type="button"
                className={
                  preferences.language === "en" ? styles.activeOption : ""
                }
                onClick={() => updateLanguage("en")}
              >
                {t.english}
              </button>

              <button
                type="button"
                className={
                  preferences.language === "zh" ? styles.activeOption : ""
                }
                onClick={() => updateLanguage("zh")}
              >
                {t.chinese}
              </button>

              <button
                type="button"
                className={
                  preferences.language === "ar" ? styles.activeOption : ""
                }
                onClick={() => updateLanguage("ar")}
              >
                {t.arabic}
              </button>
            </div>
          </section>
        </div>

        <div className={styles.previewBox}>
          <strong>{t.previewTitle}</strong>
          <p>{t.previewText}</p>
        </div>
      </article>

      <div className={styles.topGrid}>
        <article className={styles.heroCard}>
          <div className={styles.cardIntro}>
            <p className={styles.kicker}>{t.profile}</p>
            <h2>{profile.display_name}</h2>
            <p>{t.profileDescription}</p>
          </div>

          <div className={styles.profileGrid}>
            <div>
              <span>{t.interface}</span>
              <strong>
                {languageLabel(profile.interface_language, preferences.language)}
              </strong>
            </div>

            <div>
              <span>{t.learning}</span>
              <strong>
                {languageLabel(
                  profile.default_learning_language,
                  preferences.language,
                )}
              </strong>
            </div>

            <div>
              <span>{t.explanation}</span>
              <strong>
                {languageLabel(
                  profile.default_explanation_language,
                  preferences.language,
                )}
              </strong>
            </div>

            <div>
              <span>{t.telegramBot}</span>
              <strong>{profile.telegram_bot ?? t.notSet}</strong>
            </div>
          </div>
        </article>

        <article className={styles.scoreCard}>
          <p className={styles.kicker}>{t.configuration}</p>
          <h2>{configurationScore}%</h2>
          <p>{t.servicesDetected(configuredCount, integrations.length)}</p>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressFill}
              style={{ width: `${configurationScore}%` }}
            />
          </div>
        </article>
      </div>

      <div className={styles.mainGrid}>
        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <p className={styles.kicker}>{t.systemConnections}</p>
              <h2>{t.services}</h2>
            </div>

            <span className={styles.livePill}>{t.noSecrets}</span>
          </div>

          <div className={styles.integrationList}>
            {integrations.map((integration) => {
              const translated =
                integrationCopy[preferences.language][integration.name];

              return (
                <div className={styles.integrationItem} key={integration.name}>
                  <div>
                    <strong>{translated?.name ?? integration.name}</strong>
                    <p>{translated?.description ?? integration.description}</p>
                    <small>{translated?.detail ?? integration.detail}</small>
                  </div>

                  <span
                    className={
                      integration.configured
                        ? styles.readyPill
                        : styles.missingPill
                    }
                  >
                    {integration.configured ? t.ready : t.missing}
                  </span>
                </div>
              );
            })}
          </div>
        </article>

        <article className={styles.panelCard}>
          <div className={styles.panelHeader}>
            <div className={styles.panelTitleGroup}>
              <p className={styles.kicker}>{t.telegramCommands}</p>
              <h2>{t.commands}</h2>
            </div>

            <span className={styles.livePill}>
              {profile.telegram_bot ?? "Telegram"}
            </span>
          </div>

          <div className={styles.commandList}>
            {telegramCommands.map((command) => (
              <button
                type="button"
                className={styles.commandButton}
                key={command}
                onClick={() => void copyText(command)}
              >
                <code>{command}</code>
                <span>{copiedCommand === command ? t.copied : t.copy}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
