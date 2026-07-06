// 双站门控与站点文案(§DESIGN 8):同一份代码按 NEXT_PUBLIC_SITE_NAME 构建两个站。
export const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "willsleep";
export const isWillsleep = siteName === "willsleep";

export const SITE_COPY: Record<string, { title: string; tagline: string }> = {
  willsleep: { title: "The Sleep Lab", tagline: "a space for dreaming" },
  yueqiao: { title: "Yueqiao Dev", tagline: "Coming soon" },
};

// 开场一晚一次的凭证(HOME-DESIGN §3.1);跳过也算看过,写在开始淡出时。
export const INTRO_SEEN_KEY = "sl.intro.seen";
