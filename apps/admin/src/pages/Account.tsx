import { LogOut } from "lucide-react";
import { formatDateTime } from "@lydias-essence/utils";
import { PageHead } from "../components/ui";
import { useAuth } from "../lib/auth";
import { useConfirmedSignOut } from "./Status";

export function Account() {
  const { user } = useAuth();
  const signOut = useConfirmedSignOut();
  return (
    <>
      <PageHead title="My" emphasis="account" subtitle="You’re signed in as an administrator of this shop." />
      <section className="card" style={{ maxWidth: 560 }}>
        <dl style={{ margin: 0, display: "grid", gap: 14, fontSize: 14 }}>
          <div><dt className="help">Email</dt><dd style={{ margin: 0, fontWeight: 600 }}>{user?.email}</dd></div>
          <div><dt className="help">Last sign-in</dt><dd style={{ margin: 0 }}>{formatDateTime(user?.last_sign_in_at)}</dd></div>
        </dl>
        <p className="help" style={{ margin: "18px 0" }}>
          Need to change your password? Use “Forgot password” from your Supabase sign-in email, or ask your developer to reset it.
          Sessions end automatically after a period of inactivity, and you’ll be asked to sign in again.
        </p>
        <button className="btn" onClick={() => void signOut()}><LogOut size={16} /> Sign out</button>
      </section>
    </>
  );
}
