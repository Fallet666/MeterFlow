import { render, screen, waitFor } from "@testing-library/react";
import { AnalyticsPage } from "../pages/AnalyticsPage";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: { get: getMock },
}));

describe("AnalyticsPage", () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it("shows summary from analytics endpoint", async () => {
    getMock.mockResolvedValue({
      data: {
        period: { start_year: 2024, start_month: 1, end_year: 2024, end_month: 12 },
        monthly: [
          { month: "2024-01", total_amount: 100, total_consumption: 10, cumulative_amount: 100 },
          { month: "2024-02", total_amount: 150, total_consumption: 15, cumulative_amount: 250 },
        ],
        monthly_by_resource: [
          { month: "2024-01", resource_type: "electricity", consumption: 5, amount: 50 },
        ],
        summary: {
          total_amount: 250,
          total_consumption: 25,
          average_daily_amount: 5,
          peak_month: "2024-02",
          resources: [{ resource_type: "electricity", total_consumption: 5, total_amount: 50, unit: "kWh" }],
        },
        comparison: [{ property__id: 1, property__name: "Дом", total_amount: 250, total_consumption: 25 }],
        forecast_amount: 300,
      },
    });

    render(
      <AnalyticsPage
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
      />,
    );

    expect(await screen.findByText(/Аналитика/)).toBeInTheDocument();
    expect(await screen.findByText(/300/)).toBeInTheDocument();
    const resourceLabels = await screen.findAllByText(/Электричество/);
    expect(resourceLabels.length).toBeGreaterThan(0);
  });

  it("handles loading errors", async () => {
    getMock.mockRejectedValueOnce(new Error("fail"));

    render(
      <AnalyticsPage
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
      />,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(await screen.findByText(/Не удалось загрузить аналитику/)).toBeInTheDocument();
  });
});
