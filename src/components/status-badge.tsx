import { Badge } from "@/components/ui/misc";
import { statusTone } from "@/lib/status";
import { tr, type Lang } from "@/lib/i18n/dict";

export function StatusBadge({ status, lang }: { status: string; lang: Lang }) {
  return <Badge tone={statusTone(status)} dot>{tr(lang, `st_${status}`)}</Badge>;
}
