import PlatformMark from "./PlatformMark";
import { formatDay } from "@/lib/dates";
import { PLATFORM_INFO } from "@/lib/postTypes";
import { PILLARS, type PlanItem } from "@/lib/types";

/** One planned post as a line: day, platform, kind of post, topic and where it stands. */
export default function PlanRow({ item, themeName, actions }: { item: PlanItem; themeName: string; actions?: React.ReactNode }) {
  const type = PLATFORM_INFO[item.platform].postTypes.find((t) => t.id === item.postTypeId)?.label ?? item.postTypeId;
  const status = item.posted ? "Posted" : item.draftId ? "Written" : "To write";
  return (
    <li className="plan-row" data-p={item.platform}>
      <div className="plan-day">{formatDay(item.date)}</div>
      <PlatformMark platform={item.platform} small />
      <div className="plan-main">
        <div className="plan-topic">{item.topic}</div>
        <div className="plan-meta">
          {PLATFORM_INFO[item.platform].label} {type}
          {themeName ? ` · ${themeName}` : ""}
          {" · "}
          {PILLARS.find((p) => p.id === item.pillar)?.label}
        </div>
      </div>
      <span className={`status status-${item.posted ? "posted" : item.draftId ? "written" : "todo"}`}>{status}</span>
      {actions}
    </li>
  );
}
