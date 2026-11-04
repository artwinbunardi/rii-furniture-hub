export function statusTone(s: string): "gray" | "amber" | "green" | "red" | "blue" | "violet" | "teal" | "slate" {
  switch (s) {
    case "draft": return "gray";
    case "pending_approval": return "amber";
    case "approved": return "green";
    case "rejected": return "red";
    case "preparing": return "blue";
    case "ready_for_dispatch": return "violet";
    case "checked_out": return "teal";
    case "partially_returned": return "amber";
    case "returned": return "blue";
    case "completed": return "slate";
    case "cancelled": return "red";
    default: return "gray";
  }
}


export const PROJECT_STATUS: Record<string, [string, string]> = {
  planning: ["Perencanaan", "Planning"], active: ["Aktif", "Active"], completed: ["Selesai", "Completed"], cancelled: ["Dibatalkan", "Cancelled"],
};
