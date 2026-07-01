import AdminSidebar from "./AdminSidebar";
import AdminTopbar from "./AdminTopbar";

function AdminLayout({ activePage, children, onNavigate, pageMeta }) {
  return (
    <div className="admin-shell">
      <AdminSidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="admin-main-shell">
        <AdminTopbar pageMeta={pageMeta} />
        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

export default AdminLayout;
