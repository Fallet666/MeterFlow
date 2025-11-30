import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="logo">MeterFlow</div>
          {authed && (
            <nav className="nav-links">
              <Link to="/">Дашборд</Link>
              <Link to="/properties">Объекты</Link>
              <Link to="/meters">Счётчики</Link>
              <Link to="/readings">Показания</Link>
              <Link to="/analytics">Аналитика</Link>
            </nav>
          )}
          {authed && (
            <div className="user-menu">
              <span>{user?.username}</span>
              <button onClick={logout}>Выйти</button>
            </div>
          )}
        </div>
      </header>
      <main className="content">
        <div className="page-container">
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
                  <MetersPage selectedProperty={selectedProperty} />
                ) : (
                  <Navigate to="/auth" />
                )
              }
            />
            <Route
              path="/readings"
              element={
                authed ? (
                  <ReadingsPage selectedProperty={selectedProperty} />
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
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
