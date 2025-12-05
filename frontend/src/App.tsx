import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import api, { authApi } from "./api";
import {
  AnalyticsPage,
  AuthPage,
  Dashboard,
  MetersPage,
  PropertiesPage,
  ReadingsPage,
} from "./pages";
import ErrorBoundary from "./components/ErrorBoundary";
import "./App.css";

export type Property = { id: number; name: string; address: string };
export type Meter = {
  id: number;
  property: number;
  resource_type: string;
  unit: string;
  serial_number: string;
  installed_at?: string;
  is_active: boolean;
};

function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [access, setAccess] = useState<string | null>(localStorage.getItem("access"));
  const [user, setUser] = useState<any>(() => {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  });
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<number | null>(() => {
    const stored = localStorage.getItem("activeProperty");
    return stored ? Number(stored) : null;
  });
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (access) {
      api.get("properties/").then(({ data }) => {
        setProperties(data);
        if (!selectedProperty && data.length > 0) {
          setSelectedProperty(data[0].id);
          localStorage.setItem("activeProperty", String(data[0].id));
        }
      });
    }
  }, [access]);

  const handleAuth = (tokens: any) => {
    setAccess(tokens.access);
    setUser(tokens.user || {});
    localStorage.setItem("access", tokens.access);
    if (tokens.refresh) localStorage.setItem("refresh", tokens.refresh);
    if (tokens.user) localStorage.setItem("user", JSON.stringify(tokens.user));
    navigate("/");
  };

  const logout = () => {
    setAccess(null);
    setUser(null);
    localStorage.clear();
    navigate("/auth");
  };

  const authed = useMemo(() => !!access, [access]);
  const navigation = [
    { to: "/", label: "Дашборд" },
    { to: "/properties", label: "Объекты" },
    { to: "/meters", label: "Счётчики" },
    { to: "/readings", label: "Показания" },
    { to: "/analytics", label: "Аналитика" },
  ];

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">MeterFlow</div>
        {authed && (
          <>
            <button className="icon-button mobile-toggle" onClick={() => setNavOpen((v) => !v)} aria-label="Навигация">
              <span />
              <span />
              <span />
            </button>
            <nav className={`nav-links ${navOpen ? "open" : ""}`}>
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ||
                    location.pathname.startsWith(`${item.to}/`) ||
                    (item.to === "/" && location.pathname.startsWith("/dashboard"))
                      ? "active"
                      : undefined
                  }
                  end={item.to === "/"}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </>
        )}
        {authed && (
          <div className="user-menu">
            <div className="user-chip">
              <div className="user-avatar">{(user?.username || "").slice(0, 2).toUpperCase()}</div>
              <span>{user?.username}</span>
            </div>
            <button onClick={logout}>Выйти</button>
          </div>
        )}
      </header>
      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}
      <main className="content">
        <div className="page-wrapper">
          <Routes>
            <Route
              path="/auth"
              element={<AuthPage onAuthenticated={handleAuth} onRegister={authApi.register} onLogin={authApi.login} />}
            />
            <Route
              path="/"
              element={
                authed ? (
                  <Dashboard
                    selectedProperty={selectedProperty}
                    onSelectProperty={(id) => {
                      setSelectedProperty(id);
                      localStorage.setItem("activeProperty", String(id));
                    }}
                    properties={properties}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                authed ? (
                  <Dashboard
                    selectedProperty={selectedProperty}
                    onSelectProperty={(id) => {
                      setSelectedProperty(id);
                      localStorage.setItem("activeProperty", String(id));
                    }}
                    properties={properties}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/properties"
              element={
                authed ? (
                  <PropertiesPage
                    properties={properties}
                    onUpdated={setProperties}
                    selectedProperty={selectedProperty}
                    user={user}
                    onSelect={(id) => {
                      setSelectedProperty(id);
                      localStorage.setItem("activeProperty", String(id));
                    }}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/meters"
              element={
                authed ? (
                  <MetersPage
                    selectedProperty={selectedProperty}
                    properties={properties}
                    onSelectProperty={(id) => {
                      setSelectedProperty(id);
                      localStorage.setItem("activeProperty", String(id));
                    }}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/readings"
              element={
                authed ? (
                  <ReadingsPage
                    selectedProperty={selectedProperty}
                    properties={properties}
                    onSelectProperty={(id) => {
                      setSelectedProperty(id);
                      localStorage.setItem("activeProperty", String(id));
                    }}
                  />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/analytics"
              element={
                authed ? (
                  <AnalyticsPage selectedProperty={selectedProperty} properties={properties} />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route path="*" element={<Navigate to={authed ? "/" : "/auth"} replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const basename = import.meta.env.BASE_URL || "/";

  return (
    <ErrorBoundary>
      <BrowserRouter basename={basename}>
        <AppShell />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
