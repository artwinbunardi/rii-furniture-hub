export type NavItem = { href: string; key: string; icon: string; perm?: string | string[] };
export type NavGroup = { key?: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    items: [
      { href: "/app/dashboard", key: "nav_dashboard", icon: "LayoutDashboard", perm: "dashboard.view" },
      { href: "/app/reservations", key: "nav_reservations", icon: "CalendarRange", perm: "reservation.view_all" },
      { href: "/app/projects", key: "nav_projects", icon: "FolderKanban", perm: ["project.manage", "project.create"] },
    ],
  },
  {
    key: "nav_group_operations",
    items: [
      { href: "/app/warehouse", key: "nav_warehouse", icon: "Warehouse", perm: "warehouse.pick" },
      { href: "/app/warehouse/checkout", key: "nav_checkout", icon: "PackageCheck", perm: "warehouse.checkout" },
      { href: "/app/warehouse/returns", key: "nav_returns", icon: "Undo2", perm: "warehouse.checkin" },
      { href: "/app/warehouse/damaged", key: "nav_damaged", icon: "Hammer", perm: ["warehouse.damage_report", "inventory.repair"] },
      { href: "/app/warehouse/adjustments", key: "nav_adjustments", icon: "SlidersHorizontal", perm: ["inventory.adjust_request", "inventory.adjust_approve"] },
      { href: "/app/warehouse/discrepancies", key: "nav_discrepancies", icon: "AlertTriangle", perm: "inventory.view" },
      { href: "/app/warehouse/scan", key: "nav_scan", icon: "ScanLine", perm: "inventory.view" },
    ],
  },
  {
    key: "nav_group_catalog",
    items: [
      { href: "/app/inventory", key: "nav_inventory", icon: "Boxes", perm: "inventory.view" },
      { href: "/app/inventory/movements", key: "nav_movements", icon: "History", perm: "inventory.view" },
      { href: "/app/categories", key: "nav_categories", icon: "Tags", perm: "category.manage" },
      { href: "/app/collections", key: "nav_collections", icon: "LayoutGrid", perm: "category.manage" },
      { href: "/app/locations", key: "nav_locations", icon: "MapPin", perm: ["location.manage", "inventory.view"] },
      { href: "/app/reports", key: "nav_reports", icon: "BarChart3", perm: "reports.view" },
    ],
  },
  {
    key: "nav_group_website",
    items: [
      { href: "/app/builder", key: "nav_builder", icon: "PanelsTopLeft", perm: "website.edit" },
      { href: "/app/builder/media", key: "nav_media", icon: "Images", perm: "media.manage" },
    ],
  },
  {
    key: "nav_group_admin",
    items: [
      { href: "/app/users", key: "nav_users", icon: "Users", perm: "users.manage" },
      { href: "/app/audit", key: "nav_audit", icon: "ScrollText", perm: "audit.view" },
      { href: "/app/settings", key: "nav_settings", icon: "Settings", perm: "settings.manage" },
    ],
  },
];
