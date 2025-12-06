import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";

const getMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: { get: getMock, post: postMock },
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

describe("App navigation", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    window.localStorage.clear();
  });

  it("navigates between pages when authenticated", async () => {
    window.localStorage.setItem("access", "token");
    window.localStorage.setItem("user", JSON.stringify({ username: "alice" }));
    window.localStorage.setItem("activeProperty", "1");
    window.history.pushState({}, "", "/readings");

    getMock.mockImplementation((url) => {
      if (url.startsWith("properties/")) {
        return Promise.resolve({ data: [{ id: 1, name: "Дом", address: "Адрес" }] });
      }
      if (url.startsWith("meters/")) {
        return Promise.resolve({ data: [{ id: 10, resource_type: "electricity", serial_number: "M-1" }] });
      }
      if (url.startsWith("readings/")) {
        return Promise.resolve({ data: [{ id: 1, meter_detail: { resource_type: "electricity", serial_number: "M-1", unit: "kWh" }, value: "5", reading_date: "2024-01-01" }] });
      }
      if (url.startsWith("analytics/")) {
        return Promise.resolve({
          data: {
            period: { start_year: 2024, start_month: 1, end_year: 2024, end_month: 12 },
            monthly: [],
            monthly_by_resource: [],
            summary: { total_amount: 0, total_consumption: 0, resources: [] },
            comparison: [],
            forecast_amount: 0,
          },
        });
      }
      return Promise.resolve({ data: [] });
    });

    render(<App />);

    const readingsTitles = await screen.findAllByText(/Показания/);
    expect(readingsTitles.length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole("link", { name: /Аналитика/ }));
    const analyticsTitles = await screen.findAllByText(/Аналитика/);
    expect(analyticsTitles.length).toBeGreaterThan(0);
  });
});
