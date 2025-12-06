import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthPage } from "../pages/AuthPage";


describe("AuthPage", () => {
  it("authenticates via login flow", async () => {
    const onLogin = vi.fn().mockResolvedValue({ access: "token123" });
    const onRegister = vi.fn();
    const onAuthenticated = vi.fn();

    render(
      <AuthPage onAuthenticated={onAuthenticated} onRegister={onRegister} onLogin={onLogin} />,
    );

    await userEvent.type(screen.getByLabelText(/Логин/i), "alice");
    await userEvent.type(screen.getByLabelText(/Пароль/i), "secret");
    await userEvent.click(screen.getByRole("button", { name: /Войти/i }));

    await screen.findByRole("button", { name: /Нет аккаунта/i });
    expect(onAuthenticated).toHaveBeenCalledWith({ access: "token123" });
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("shows backend error", async () => {
    const onLogin = vi.fn().mockRejectedValue({ response: { data: { detail: "Неверные данные" } } });
    const onAuthenticated = vi.fn();

    render(
      <AuthPage onAuthenticated={onAuthenticated} onRegister={vi.fn()} onLogin={onLogin} />,
    );

    await userEvent.type(screen.getByLabelText(/Логин/i), "alice");
    await userEvent.type(screen.getByLabelText(/Пароль/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /Войти/i }));

    expect(await screen.findByText(/Неверные данные/)).toBeInTheDocument();
    expect(onAuthenticated).not.toHaveBeenCalled();
  });
});
