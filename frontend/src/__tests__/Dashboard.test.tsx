import { render, screen, waitFor } from "@testing-library/react";
import { Dashboard } from "../pages/Dashboard";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: { get: getMock },
}));

describe("Dashboard", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("renders forecast and latest readings", async () => {
    getMock.mockImplementation((url) => {
      if (url.includes("forecast")) {
        return Promise.resolve({ data: { forecast_amount: 1234.56 } });
      }
      if (url.startsWith("readings/")) {
        return Promise.resolve({
          data: [
            {
              id: 1,
              meter_detail: { resource_type: "electricity", serial_number: "SN-1", unit: "kWh" },
              value: "10.5",
              amount_value: 70,
              reading_date: "2024-01-01",
            },
          ],
        });
      }
      return Promise.resolve({
        data: {
          monthly: [
            { month: "2024-01", total_amount: 50, total_consumption: 5, cumulative_amount: 50 },
            { month: "2024-02", total_amount: 60, total_consumption: 6, cumulative_amount: 110 },
          ],
          monthly_by_resource: [],
          summary: { total_amount: 110, total_consumption: 11, resources: [] },
          comparison: [],
          forecast_amount: 0,
        },
      });
    });

    render(
      <Dashboard
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
        onSelectProperty={vi.fn()}
      />,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalledWith("analytics/", expect.anything()));
    const forecasts = await screen.findAllByText(/1234.56 ₽/);
    expect(forecasts.length).toBeGreaterThan(0);
    expect(screen.getByText(/Последние показания/)).toBeInTheDocument();
    expect(screen.getByText(/SN-1/)).toBeInTheDocument();
  });
});
