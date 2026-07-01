import StatusBadge from "./StatusBadge";

function AdminTable({ data, actions = ["상세", "보기"] }) {
  return (
    <section className="admin-card table-card">
      <div className="table-card-header">
        <h2>
          {data.tableTitle} <span>(총 {data.total}건)</span>
        </h2>
        <button type="button">⇩ 엑셀 다운로드</button>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {data.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row[0]}>
                {row.map((cell, index) => {
                  const isStatus = ["상태", "처리 상태"].includes(data.columns[index]);
                  const isManage = data.columns[index] === "관리";

                  if (isManage) {
                    return (
                      <td key={`${row[0]}-${data.columns[index]}`} className="table-actions">
                        {actions.map((action) => (
                          <button type="button" key={action}>
                            {action}
                          </button>
                        ))}
                      </td>
                    );
                  }

                  return (
                    <td key={`${row[0]}-${data.columns[index]}`}>
                      {isStatus ? <StatusBadge status={cell} /> : cell}
                    </td>
                  );
                })}
                {!data.columns.includes("관리") ? (
                  <td className="table-actions">
                    {actions.map((action) => (
                      <button type="button" key={action}>
                        {action}
                      </button>
                    ))}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-pagination">
        <button type="button">‹</button>
        <button className="is-active" type="button">1</button>
        <button type="button">2</button>
        <button type="button">3</button>
        <button type="button">4</button>
        <button type="button">5</button>
        <span>...</span>
        <button type="button">159</button>
        <button type="button">›</button>
        <select defaultValue="10">
          <option value="10">10개씩 보기</option>
          <option value="20">20개씩 보기</option>
        </select>
      </div>
    </section>
  );
}

export default AdminTable;
