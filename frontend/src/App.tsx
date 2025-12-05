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

  const navItems = [
    { to: "/", label: "Дашборд" },
    { to: "/properties", label: "Объекты" },
    { to: "/meters", label: "Счётчики" },
    { to: "/readings", label: "Показания" },
    { to: "/analytics", label: "Аналитика" },
  ];

  return (
    <div className="app-shell">
      {authed && (
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark" aria-hidden>
              EB
            </div>
            <div>
              <div className="brand-name">EnergoBoard</div>
              <div className="brand-tagline">Контроль энергии</div>
            </div>
          </div>
          <nav className="nav-links">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}> 
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-note">Управляйте объектами, счётчиками и аналитикой в одном месте.</div>
        </aside>
      )}
      <div className="main-area">
        <header className="app-header">
          <div className="logo-slot" aria-hidden>
            Логотип
          </div>
          {authed && (
            <div className="user-menu">
              <div className="user-name">{user?.username}</div>
              <button className="ghost" onClick={logout}>
                Выйти
              </button>
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
