import AdminTable from "../../components/admin/AdminTable";
import DonutChart from "../../components/admin/DonutChart";
import QuickPanel from "../../components/admin/QuickPanel";
import RecentList from "../../components/admin/RecentList";
import SearchFilterBar from "../../components/admin/SearchFilterBar";
import StatCard from "../../components/admin/StatCard";

function AdminManagementPage({ data, tableActions }) {
  return (
    <div className="admin-page">
      <div className="admin-page-title">
        <h1>{data.title}</h1>
        <p>{data.description}</p>
      </div>

      <div className="admin-content-grid">
        <div className="admin-content-main">
          <SearchFilterBar data={data} />
          <div className="admin-stat-grid">
            {data.stats.map((item) => (
              <StatCard item={item} key={item.label} />
            ))}
          </div>
          <AdminTable data={data} actions={tableActions} />
        </div>
        <aside className="admin-side-column">
          <QuickPanel items={data.quickActions} />
          <DonutChart title={data.chartTitle} center={data.chartCenter} items={data.chartItems} />
          <RecentList title={data.recentTitle} items={data.recent} />
        </aside>
      </div>
    </div>
  );
}

export default AdminManagementPage;
