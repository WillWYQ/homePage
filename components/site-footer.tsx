import { cn } from "@/lib/utils";
import { isWillsleep } from "@/lib/site";
import { t, type Locale } from "@/lib/i18n/strings";

// 全站统一页脚(§DESIGN 3 / HOME-DESIGN §4.4):bottom center,mono,white/40。
// career 暗门是通往职业站的唯一入口(红线 2),文案与链接 2026-07-02 定稿不动。
// RSS 与语言切换分别随第 3 期 / 第 5 期加入,间隔符 `·`;在那之前不渲染占位。
//
// floating:走廊是单屏不滚动,页脚绝对定位贴底;房间页会滚动,页脚走正常流。

export function SiteFooter({
  locale = "canonical",
  floating = false,
}: {
  locale?: Locale;
  floating?: boolean;
}) {
  if (!isWillsleep) return null;

  return (
    <footer
      className={cn(
        "text-center font-mono text-xs text-white/40",
        floating ? "absolute inset-x-0 bottom-0 z-20 pb-8" : "px-6 py-12",
      )}
    >
      {t("footer.career", locale)}{" "}
      <a
        href="https://career.yueqiao.dev/?utm_source=willsleep.dev&utm_medium=referral&utm_campaign=personal-site"
        target="_blank"
        rel="noreferrer"
        className="text-white/60 underline underline-offset-4 transition-colors duration-200 hover:text-white focus-visible:text-white"
      >
        career.yueqiao.dev
      </a>
    </footer>
  );
}
