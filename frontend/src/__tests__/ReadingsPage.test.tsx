import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingsPage } from "../pages/ReadingsPage";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: { get: getMock, post: postMock },
}));

describe("ReadingsPage", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
  });

  it("loads meters and validates input", async () => {
    getMock.mockImplementation((url) => {
      if (url.startsWith("meters/")) {
        return Promise.resolve({ data: [{ id: 10, resource_type: "electricity", serial_number: "E-1" }] });
      }
      if (url.startsWith("readings/")) {
        return Promise.resolve({ data: [{ id: 1, meter_detail: { resource_type: "electricity", serial_number: "E-1", unit: "kWh" }, value: "5", reading_date: "2024-01-01" }] });
      }
      return Promise.resolve({ data: [] });
    });

    render(
      <ReadingsPage
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
        onSelectProperty={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Журнал показаний/)).toBeInTheDocument();
    const meterSelect = await screen.findByLabelText(/Счётчик/);
    await userEvent.selectOptions(meterSelect, "10");
    expect(screen.getByText(/5 kWh/)).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/Значение/i));
    await userEvent.type(screen.getByLabelText(/Значение/i), "0");
    await userEvent.click(screen.getByRole("button", { name: /Сохранить/i }));

    expect(await screen.findByText(/Введите корректное значение показания/)).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("posts valid readings and shows backend fallback errors", async () => {
    getMock.mockImplementation((url) => {
      if (url.startsWith("meters/")) {
        return Promise.resolve({ data: [{ id: 10, resource_type: "electricity", serial_number: "E-1" }] });
      }
      return Promise.resolve({ data: [] });
    });
    postMock
      .mockResolvedValueOnce({ data: { id: 2, meter: 10, value: "12.5", reading_date: "2024-01-02" } })
      .mockRejectedValueOnce({ response: { data: { detail: { nested: "error" } } } });

    render(
      <ReadingsPage
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
        onSelectProperty={vi.fn()}
      />,
    );

    await userEvent.type(await screen.findByLabelText(/Значение/i), "12.5");
    await userEvent.click(screen.getByRole("button", { name: /Сохранить/i }));
    expect(await screen.findByText(/Показание сохранено/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Значение/i), "13.5");
    await userEvent.click(screen.getByRole("button", { name: /Сохранить/i }));
    expect(await screen.findByText(/Не удалось сохранить показание/)).toBeInTheDocument();
  });
});
