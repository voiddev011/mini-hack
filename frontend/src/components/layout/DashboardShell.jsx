import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { DashboardDataProvider } from "../../contexts/DashboardDataContext";
import { CorporateIntelligenceProvider } from "../../contexts/CorporateIntelligenceContext";
import { useDashboardData } from "../../hooks/useDashboardData";

const NAV_GROUPS = [
  {
    title: "OVERVIEW",
    items: [{ label: "Overview", path: "/", end: true }],
  },
  {
    title: "EXPLORE",
    items: [
      { label: "Global Explorer", path: "/explore/global" },
      { label: "India Intelligence", path: "/explore/india" },
      { label: "Industries", path: "/explore/industries" },
    ],
  },
  {
    title: "INTELLIGENCE",
    items: [
      { label: "Analysis Engine", path: "/intelligence/analysis" },
      { label: "Anomalies", path: "/intelligence/anomalies" },
      { label: "Carbon Insights", path: "/intelligence/insights" },
      { label: "What-If Simulator", path: "/intelligence/simulator" },
      { label: "Carbon Time Machine", path: "/intelligence/time-machine" },
    ],
  },
  {
    title: "CORPORATE",
    items: [
      { label: "Company Monitor", path: "/corporate/monitor" },
      { label: "BRSR", path: "/corporate/brsr" },
      { label: "Compliance Radar", path: "/corporate/compliance" },
      { label: "Green Credit", path: "/corporate/green-credit" },
    ],
  },
  {
    title: "DATA",
    items: [
      { label: "Data Sources", path: "/data/sources" },
      { label: "Trust Scores", path: "/data/trust-scores" },
      { label: "Connection Checks", path: "/data/system" },
    ],
  },
];

function DashboardWorkspace() {
  const { user, profile, signOut } = useAuth();
  const { years, selectedYear, setSelectedYear, playing, setPlaying } =
    useDashboardData();
  const location = useLocation();
  const [logoutError, setLogoutError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    setLogoutError("");
    try {
      await signOut();
    } catch (error) {
      setLogoutError(error.message || "Unable to sign out. Please try again.");
    }
  };

  return (
    <div className="tc-shell">
      <aside className="tc-sidebar">
        <Link to="/" className="tc-brand" aria-label="TrustCarbon overview">
          <span className="tc-brand-mark">
            <img src="/assets/trustcarbon-fingerprint.png" alt="" />
          </span>
          <span>
            <strong>TrustCarbon</strong>
            <small>Measure. Reduce. Sustain.</small>
          </span>
        </Link>

        <button
          type="button"
          className="tc-mobile-menu"
          aria-expanded={menuOpen}
          aria-controls="dashboard-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "Close navigation" : "Open navigation"}
        </button>
        <nav
          id="dashboard-navigation"
          className={`tc-navigation${menuOpen ? " tc-navigation-open" : ""}`}
          aria-label="Dashboard navigation"
        >
          {NAV_GROUPS.map((group) => (
            <section
              className="tc-nav-group"
              key={group.title}
              aria-label={group.title}
            >
              <h2>{group.title}</h2>
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  end={item.end}
                  className={({ isActive }) =>
                    `tc-nav-link${isActive ? " active" : ""}`
                  }
                >
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>

        <div className="tc-sidebar-foot">
          <div className="tc-data-status">
            <i /> Historical data workspace
          </div>
          <div className="tc-account">
            {user ? (
              <>
                <span className="tc-avatar">
                  {(profile?.full_name || user.email || "T")
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
                <span className="tc-account-name">
                  <strong>{profile?.full_name || user.email}</strong>
                  <small>
                    {profile?.role === "admin" ? "Administrator" : "Account"}
                  </small>
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                >
                  ↗
                </button>
              </>
            ) : (
              <Link to="/login" className="tc-sign-in">
                Sign in to your account <span>→</span>
              </Link>
            )}
          </div>
          {logoutError && (
            <p className="tc-inline-error" role="alert">
              {logoutError}
            </p>
          )}
          {user && (
            <div className="tc-account-links">
              <Link to="/dashboard">Personal dashboard</Link>
              {profile?.role === "admin" && (
                <Link to="/admin">Dataset administration</Link>
              )}
            </div>
          )}
          <p className="tc-sidebar-legal">
            Historical data · Sources cited in context
          </p>
        </div>
      </aside>

      <div className="tc-workspace">
        <header className="tc-topbar">
          <label
            className="tc-search"
            aria-label="Search the climate data workspace"
          >
            <span aria-hidden="true">⌕</span>
            <input placeholder="Search countries, industries, emissions data..." />
            <kbd>Ctrl K</kbd>
          </label>
          <div className="tc-topbar-meta">
            {years.length > 0 &&
              location.pathname !== "/intelligence/time-machine" && (
                <div className="tc-global-year-control">
                  <button
                    type="button"
                    onClick={() => setPlaying(!playing)}
                    aria-label={
                      playing
                        ? "Pause historical year playback"
                        : "Play historical year playback"
                    }
                  >
                    {playing ? "Ⅱ" : "▶"}
                  </button>
                  <span>{years[0]}</span>
                  <input
                    type="range"
                    aria-label="Selected historical year"
                    min="0"
                    max={years.length - 1}
                    value={Math.max(0, years.indexOf(selectedYear))}
                    onChange={(event) =>
                      setSelectedYear(years[Number(event.target.value)])
                    }
                  />
                  <strong>{selectedYear ?? years.at(-1)}</strong>
                </div>
              )}
            <Link className="tc-dashboard-button" to="/dashboard">
              Dashboard
            </Link>
            <span className="tc-profile-status" aria-label="System online">
              <i />
            </span>
          </div>
        </header>
        <div className="tc-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default function DashboardShell() {
  return (
    <DashboardDataProvider>
      <CorporateIntelligenceProvider>
        <DashboardWorkspace />
      </CorporateIntelligenceProvider>
    </DashboardDataProvider>
  );
}
