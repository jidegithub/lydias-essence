import { Navigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { useConfirm } from "@lydias-essence/ui";
import { Loading } from "../components/ui";
import { useAuth } from "../lib/auth";

export function NotConfigured() {
  return (
    <div className="center-screen">
      <div className="card login-card">
        <div className="brand"><strong>Lydia’s Essence</strong><span>Shop manager</span></div>
        <h1>Almost ready</h1>
        <p className="lead">
          This dashboard isn’t connected to your shop’s database yet. Whoever set up the website needs to add two settings
          to this site: <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>. The README explains where to find them.
        </p>
      </div>
    </div>
  );
}

export function NoAccess() {
  const { user, signOut } = useAuth();
  return (
    <div className="center-screen">
      <div className="card login-card">
        <div className="brand"><strong>Lydia’s Essence</strong><span>Shop manager</span></div>
        <h1>No admin access</h1>
        <p className="lead">
          You’re signed in as <strong>{user?.email}</strong>, but this account hasn’t been set up as an administrator, so
          nothing here can be viewed or changed. Ask the site owner to add you, then sign in again.
        </p>
        <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => void signOut()}>Sign out</button>
      </div>
    </div>
  );
}

/** Gate for every admin page: unauthenticated visitors never see (or fetch) admin content. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <div className="center-screen"><Loading label="Checking your sign-in…" /></div>;
  if (status === "signedOut") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (status === "noAccess") return <NoAccess />;
  return <>{children}</>;
}

export function NotFound() {
  return (
    <div className="empty">
      <h3>That page doesn’t exist</h3>
      <p>The link may be old or mistyped.</p>
      <Link className="btn btn-primary" to="/">Back to the dashboard</Link>
    </div>
  );
}

export function useConfirmedSignOut() {
  const { signOut } = useAuth();
  const confirm = useConfirm();
  return () => confirm({ title: "Sign out?", message: "You’ll need to sign in again to manage the shop.", confirmLabel: "Sign out", run: signOut });
}
