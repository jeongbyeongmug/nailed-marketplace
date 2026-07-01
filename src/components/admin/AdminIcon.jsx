const icons = {
  home: "⌂",
  user: "♙",
  userPlus: "♙+",
  userCheck: "♙✓",
  userAlert: "♙△",
  userBlock: "♙×",
  tag: "◇",
  cart: "▱",
  alert: "△",
  bag: "▢",
  hide: "◉",
  box: "▣",
  card: "▤",
  truck: "▰",
  cancel: "⊗",
  download: "⇩",
  grid: "▦",
  document: "▤",
  check: "✓",
  megaphone: "☰",
  list: "☷",
  edit: "✎",
  search: "⌕",
  menu: "☰",
  bell: "♢",
  settings: "⚙",
};

function AdminIcon({ name }) {
  return (
    <span className="admin-icon" aria-hidden="true">
      {icons[name] || "•"}
    </span>
  );
}

export default AdminIcon;
