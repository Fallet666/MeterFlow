import { FormEvent, useState } from "react";

interface Props {
  onAuthenticated: (data: any) => void;
  onRegister: (username: string, password: string, email?: string) => Promise<any>;
  onLogin: (username: string, password: string) => Promise<any>;
}

export function AuthPage({ onAuthenticated, onRegister, onLogin }: Props) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const payload = isRegister
        ? await onRegister(username, password, email)
        : await onLogin(username, password);
      onAuthenticated(payload);
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Ошибка авторизации");
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <div className="logo-pill" style={{ marginBottom: 14, width: "fit-content" }}>
          <div className="logo-mini" aria-hidden>
            <img src="/logo.svg" alt="Эмблема EnergoBoard" />
          </div>
          <div>
            <div className="brand-name">EnergoBoard</div>
            <div className="brand-tagline">Визуальная аналитика для энергоресурсов</div>
          </div>
        </div>
        <h1>Добро пожаловать</h1>
        <p className="subtitle">Единый кабинет для работы с объектами, приборами и показаниями.</p>
        <ul>
          <li>Собирайте данные и контролируйте начисления по каждому объекту.</li>
          <li>Сохраняйте любимые панели и наблюдайте тренды в реальном времени.</li>
          <li>Безопасный доступ и аккуратный интерфейс на любом устройстве.</li>
        </ul>
      </div>

      <div className="auth-card">
        <div className="auth-meta">
          <div>
            <p className="subtitle">{isRegister ? "Создайте аккаунт" : "Вход в кабинет"}</p>
            <h3 style={{ margin: 0 }}>{isRegister ? "Регистрация" : "Авторизация"}</h3>
          </div>
          <div className="auth-toggle">
            <span className="tag">Защищённый доступ</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Логин
            <input
              placeholder="Имя пользователя"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          {isRegister && (
            <label>
              Email
              <input
                type="email"
                placeholder="Для восстановления и уведомлений"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <label>
            Пароль
            <input
              type="password"
              placeholder="Минимум 8 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="error">{error}</div>}
          <div className="actions">
            <button type="submit">{isRegister ? "Создать аккаунт" : "Войти"}</button>
            <button className="ghost" type="button" onClick={() => setIsRegister((v) => !v)}>
              {isRegister ? "У меня уже есть аккаунт" : "Создать новый доступ"}
            </button>
          </div>
          <p className="subtitle">
            Авторизация проходит через сохранённые учётные данные. Доступ к API не меняется.
          </p>
        </form>
      </div>
    </div>
  );
}
