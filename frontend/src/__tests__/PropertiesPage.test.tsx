import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PropertiesPage } from "../pages/PropertiesPage";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: { get: getMock, post: postMock, delete: deleteMock },
  authApi: {
    login: loginMock,
  },
}));

describe("PropertiesPage", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
    loginMock.mockReset();
    window.localStorage.clear();
  });

  it("fetches properties on mount and allows adding new one", async () => {
    const fetched = [{ id: 5, name: "Дом", address: "Адрес" }];
    getMock.mockResolvedValue({ data: fetched });
    postMock.mockResolvedValue({ data: { id: 6, name: "Новый дом", address: "Новый адрес" } });
    const onUpdated = vi.fn();

    render(
      <PropertiesPage
        properties={[]}
        onUpdated={onUpdated}
        selectedProperty={null}
        onSelect={vi.fn()}
        user={{ username: "alice" }}
      />,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledWith("properties/"));
    await waitFor(() => expect(onUpdated).toHaveBeenCalledWith(fetched));

    await userEvent.type(screen.getByPlaceholderText(/Название/), "Новый дом");
    await userEvent.type(screen.getByPlaceholderText(/Адрес/), "Новый адрес");
    await userEvent.click(screen.getByRole("button", { name: /Добавить/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("properties/", { name: "Новый дом", address: "Новый адрес" }));
    expect(onUpdated).toHaveBeenLastCalledWith([{ id: 6, name: "Новый дом", address: "Новый адрес" }]);
  });

  it("requires password confirmation before deletion and surfaces auth errors", async () => {
    const properties = [{ id: 1, name: "Квартира", address: "Адрес" }];
    loginMock.mockRejectedValue({ response: { status: 401 } });
    const onUpdated = vi.fn();
    const onSelect = vi.fn();

    render(
      <PropertiesPage
        properties={properties}
        onUpdated={onUpdated}
        selectedProperty={1}
        onSelect={onSelect}
        user={{ username: "alice" }}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /Удалить/ }));
    const passwordInput = screen.getByLabelText(/Пароль/);
    await userEvent.type(passwordInput, "secret");
    await userEvent.click(screen.getByRole("button", { name: /Подтверждаю/ }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("alice", "secret"));
    expect(deleteMock).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
    expect(await screen.findByText(/Пароль неверный/)).toBeInTheDocument();
  });
});
