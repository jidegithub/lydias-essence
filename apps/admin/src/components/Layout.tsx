import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Flag, Home, Images, LogOut, Megaphone, Menu, Package, Settings2, Sparkles, Star, UserRound, X } from "lucide-react";
import { useConfirm } from "@lydias-essence/ui";
import { useAuth } from "../lib/auth";

const LINKS = [
  { group: "Overview", items: [{ to: "/", label: "Dashboard", icon: Home, end: true }] },
  { group: "Catalogue", items: [{ to: "/products", label: "Products", icon: Package }, { to: "/products/bulk", label: "Add many products", icon: Images }] },
  {
    group: "Storefront",
    items: [
      { to: "/featured/beauty-rules", label: "Your Beauty, Your Rules", icon: Sparkles },
      { to: "/featured/next-favourite", label: "Your Next Favourite", icon: Star },
      { to: "/settings/banner", label: "Announcement banner", icon: Megaphone },
      { to: "/settings/content", label: "Website content", icon: Flag },
      { to: "/settings/brand", label: "Brand & contact", icon: Settings2 }
    ]
  },
  { group: "Account", items: [{ to: "/account", label: "My account", icon: UserRound }] }
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const confirm = useConfirm();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const logout = () =>
    confirm({
      title: "Sign out?",
      message: "You’ll need to sign in again to manage the shop.",
      confirmLabel: "Sign out",
      run: signOut
    });

  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-label="Main navigation" id="sidebar">
        <NavLink to="/" className="brand">
          <strong>Lydia’s Essence</strong>
          <span>Shop manager</span>
        </NavLink>
        {LINKS.map((g) => (
          <nav className="nav-group" key={g.group} aria-label={g.group}>
            <div className="nav-label">{g.group}</div>
            {g.items.map(({ to, label, icon: Icon, ...rest }) => (
              <NavLink key={to} to={to} end={"end" in rest} className={({ isActive }) => `nav-link ${isActive && !(to === "/products" && location.pathname.startsWith("/products/bulk")) ? "active" : ""}`}>
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            ))}
          </nav>
        ))}
        <div className="sidebar-foot">
          <div className="who">Signed in as<br /><strong style={{ color: "var(--ink)" }}>{user?.email}</strong></div>
          <button type="button" className="btn btn-small" onClick={logout}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      {open && <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />}
      <div className="workspace">
        <div className="topbar">
          <NavLink to="/" className="brand"><strong>Lydia’s Essence</strong><span>Shop manager</span></NavLink>
          <button type="button" className="btn btn-icon" onClick={() => setOpen((v) => !v)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="sidebar">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
