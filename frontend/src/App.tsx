import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from "react-router-dom";
import api, { authApi } from "./api";
import {
  AnalyticsPage,
  AuthPage,
  Dashboard,
  MetersPage,
  PropertiesPage,
  ReadingsPage,
} from "./pages";
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

  const navSections = [
    {
      label: "Рабочее место",
      items: [
        { to: "/", label: "Дашборд" },
        { to: "/analytics", label: "Исследователь" },
      ],
    },
    {
      label: "Активы",
      items: [
        { to: "/properties", label: "Объекты" },
        { to: "/meters", label: "Приборы" },
      ],
    },
    {
      label: "Потоки данных",
      items: [
        { to: "/readings", label: "Лента показаний" },
      ],
    },
  ];

  return (
    <div className="app-shell">
      {authed && (
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden>
              <img src="/logo.svg" alt="Эмблема EnergoBoard" />
            </div>
            <div>
              <div className="brand-name">EnergoBoard</div>
              <div className="brand-tagline">Workspace · светлая аналитика</div>
            </div>
          </div>

          <div className="sidebar-section">
            <p className="section-title">Сессия</p>
            <div className="active-context">
              <div>
                <p className="subtitle">Активный пользователь</p>
                <strong>{user?.username}</strong>
              </div>
              <button className="ghost" onClick={logout}>
                Выйти
              </button>
            </div>
          </div>

          {navSections.map((section) => (
            <div key={section.label} className="sidebar-section">
              <p className="section-title">{section.label}</p>
              <nav className="nav-links">
                {section.items.map((item) => (
                  <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}
                    >
                    {item.label}
                  </NavLink>
                ))}
              </nav>
            </div>
          ))}
          <div className="sidebar-note">Рабочее место для энергии: объекты, приборы, лента показаний и гибкий исследователь.</div>
        </aside>
      )}
      <div className="main-area">
        <header className="app-header">
          <div className="workspace-switcher" aria-hidden>
            <span className="dot" />
            EnergoBoard Studio
          </div>
          {authed && (
            <div className="user-menu">
              <span className="pill muted">Свежие данные · API</span>
            </div>
          )}
        </header>
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
                path="/properties"
                element={
                  authed ? (
                    <PropertiesPage
                      properties={properties}
                      onUpdated={setProperties}
                      selectedProperty={selectedProperty}
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
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
