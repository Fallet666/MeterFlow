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
      <h1>{isRegister ? "Регистрация" : "Вход"}</h1>
      <form onSubmit={handleSubmit} className="card">
        <label>
          Логин
          <input value={username} onChange={(e) => setUsername(e.target.value)} required />
        </label>
        {isRegister && (
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        )}
        <label>
          Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <div className="error">{error}</div>}
        <button type="submit">{isRegister ? "Создать аккаунт" : "Войти"}</button>
      </form>
      <button className="link" onClick={() => setIsRegister((v) => !v)}>
        {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрируйтесь"}
      </button>
    </div>
  );
}
