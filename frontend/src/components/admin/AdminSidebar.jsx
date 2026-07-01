import AdminIcon from "./AdminIcon";

const adminNavItems = [
  { id: "dashboard", label: "대시보드", path: "/admin/dashboard", icon: "home" },
  { id: "members", label: "회원관리", path: "/admin/members", icon: "user" },
  { id: "products", label: "상품관리", path: "/admin/products", icon: "tag" },
  { id: "reports", label: "신고관리", path: "/admin/reports", icon: "alert" },
  { id: "orders", label: "주문관리", path: "/admin/orders", icon: "cart" },
  { id: "inquiries", label: "문의관리", path: "/admin/inquiries", icon: "document" },
];

function AdminSidebar({ activePage, onNavigate }) {
  return (
    <aside className="admin-sidebar">
      <a className="admin-logo" href="/admin/dashboard" onClick={(event) => onNavigate(event, "/admin/dashboard")}>
        Nailed
      </a>
      <nav className="admin-nav" aria-label="관리자 메뉴">
        {adminNavItems.map((item) => (
          <a
            className={`admin-nav-item ${activePage === item.id ? "is-active" : ""}`}
            href={item.path}
            key={item.id}
            onClick={(event) => onNavigate(event, item.path)}
          >
            <AdminIcon name={item.icon} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default AdminSidebar;
