export const ROLES = [
  { code: "decor", name_id: "Tim Dekor", name_en: "Decor Team", sort: 1, description: "Browse catalog and request reservations for projects." },
  { code: "warehouse_staff", name_id: "Staf Gudang", name_en: "Warehouse Staff", sort: 2, description: "Picking, dispatch, returns and damage reporting." },
  { code: "warehouse_manager", name_id: "Manajer Gudang", name_en: "Warehouse Manager", sort: 3, description: "Approvals, adjustments, repairs and warehouse reports." },
  { code: "management", name_id: "Manajemen", name_en: "Management", sort: 4, description: "Dashboards, reports and monitoring." },
  { code: "admin", name_id: "Administrator Sistem", name_en: "System Administrator", sort: 5, description: "Full access including users, settings and website builder." },
] as const;

export type RoleCode = (typeof ROLES)[number]["code"];

export const PERMISSIONS: Record<string, { module: string; description: string }> = {
  "catalog.view": { module: "catalog", description: "Browse catalog and product details" },
  "favorites.manage": { module: "catalog", description: "Favorites and personal wishlists" },
  "reservation.create": { module: "reservations", description: "Create and submit own reservations" },
  "reservation.view_all": { module: "reservations", description: "View all reservations" },
  "reservation.approve": { module: "reservations", description: "Approve or reject reservations" },
  "reservation.cancel_any": { module: "reservations", description: "Cancel any reservation" },
  "project.create": { module: "projects", description: "Create projects" },
  "project.manage": { module: "projects", description: "Edit and close projects" },
  "inventory.view": { module: "inventory", description: "View inventory balances and movements" },
  "warehouse.pick": { module: "warehouse", description: "Prepare picking lists" },
  "warehouse.checkout": { module: "warehouse", description: "Dispatch (check-out) items" },
  "warehouse.checkin": { module: "warehouse", description: "Register returns (check-in)" },
  "warehouse.inspect": { module: "warehouse", description: "Inspect returned items" },
  "warehouse.damage_report": { module: "warehouse", description: "Report damaged or missing items" },
  "warehouse.relocate": { module: "warehouse", description: "Update storage locations" },
  "inventory.adjust_request": { module: "inventory", description: "Request stock adjustments" },
  "inventory.adjust_approve": { module: "inventory", description: "Approve stock adjustments / discrepancies" },
  "inventory.receive": { module: "inventory", description: "Receive new stock" },
  "inventory.repair": { module: "inventory", description: "Manage repairs and release damaged stock" },
  "product.manage": { module: "catalog", description: "Create and edit products" },
  "category.manage": { module: "catalog", description: "Manage categories and collections" },
  "location.manage": { module: "warehouse", description: "Manage warehouses and storage locations" },
  "dashboard.view": { module: "reports", description: "View management dashboard" },
  "reports.view": { module: "reports", description: "View reports" },
  "reports.export": { module: "reports", description: "Export reports (CSV)" },
  "users.manage": { module: "admin", description: "Manage users and roles" },
  "settings.manage": { module: "admin", description: "Manage application settings" },
  "audit.view": { module: "admin", description: "View audit logs" },
  "website.edit": { module: "website", description: "Edit website drafts" },
  "website.publish": { module: "website", description: "Publish website" },
  "media.manage": { module: "website", description: "Manage media library" },
};

const STAFF = [
  "catalog.view", "reservation.view_all", "inventory.view", "warehouse.pick", "warehouse.checkout",
  "warehouse.checkin", "warehouse.inspect", "warehouse.damage_report", "warehouse.relocate", "inventory.adjust_request",
];

export const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  decor: ["catalog.view", "favorites.manage", "reservation.create", "project.create"],
  warehouse_staff: STAFF,
  warehouse_manager: [
    ...STAFF, "reservation.approve", "reservation.cancel_any", "inventory.adjust_approve", "inventory.receive",
    "inventory.repair", "location.manage", "dashboard.view", "reports.view", "reports.export", "project.manage",
  ],
  management: [
    "catalog.view", "reservation.view_all", "inventory.view", "dashboard.view", "reports.view", "reports.export",
    "audit.view", "project.create", "project.manage",
  ],
  admin: ["*", ...Object.keys(PERMISSIONS)],
};

export function hasPerm(perms: string[], p: string) {
  return perms.includes("*") || perms.includes(p);
}

export function roleHome(roles: string[]): string {
  if (roles.includes("admin") || roles.includes("management")) return "/app/dashboard";
  if (roles.includes("warehouse_manager")) return "/app/reservations?status=pending_approval";
  if (roles.includes("warehouse_staff")) return "/app/warehouse";
  return "/";
}
