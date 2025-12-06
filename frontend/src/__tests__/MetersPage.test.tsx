import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetersPage } from "../pages/MetersPage";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());
const patchMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: {
    get: getMock,
    post: postMock,
    patch: patchMock,
    delete: deleteMock,
  },
}));

describe("MetersPage", () => {
  const baseProps = {
    properties: [
      { id: 1, name: "Дом", address: "Адрес" },
      { id: 2, name: "Дача", address: "Деревня" },
    ],
    onSelectProperty: vi.fn(),
  };

  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    patchMock.mockReset();
    deleteMock.mockReset();
  });

  it("loads meters for selected property and allows creation", async () => {
    const existing = [
      { id: 10, resource_type: "electricity", unit: "kWh", serial_number: "EL-1", is_active: true },
    ];
    getMock.mockResolvedValue({ data: existing });
    postMock.mockResolvedValue({
      data: { id: 11, resource_type: "gas", unit: "m3", serial_number: "G-2", is_active: true },
    });

    render(
      <MetersPage
        {...baseProps}
        selectedProperty={1}
      />,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledWith("meters/", { params: { property: 1 } }));
    expect(await screen.findByText(/EL-1/)).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByDisplayValue(/Электричество/), "gas");
    await userEvent.clear(screen.getByPlaceholderText(/Единицы/));
    await userEvent.type(screen.getByPlaceholderText(/Единицы/), "m3");
    await userEvent.type(screen.getByPlaceholderText(/Серийный номер/), "G-2");
    await userEvent.click(screen.getByRole("button", { name: /Добавить/ }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith("meters/", {
        property: 1,
        resource_type: "gas",
        unit: "m3",
        serial_number: "G-2",
      }),
    );
  });

  it("requires serial number and allows toggling/deleting meters", async () => {
    const existing = [
      { id: 20, resource_type: "electricity", unit: "kWh", serial_number: "EL-20", is_active: true },
    ];
    getMock.mockResolvedValue({ data: existing });
    patchMock.mockResolvedValue({
      data: { ...existing[0], is_active: false },
    });

    render(
      <MetersPage
        {...baseProps}
        selectedProperty={1}
      />,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalled());
    await userEvent.click(screen.getByRole("button", { name: /Добавить/ }));
    expect(await screen.findByText(/Введите серийный номер/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Деактивировать/ }));
    await waitFor(() => expect(patchMock).toHaveBeenCalledWith("meters/20/", { is_active: false }));

    deleteMock.mockResolvedValue({ data: {} });
    await userEvent.click(screen.getByRole("button", { name: /Удалить/ }));
    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("meters/20/"));
  });
});
