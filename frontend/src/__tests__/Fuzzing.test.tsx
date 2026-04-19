import { cleanup, render, screen, waitFor } from "@testing-library/react";
import fc from "fast-check";
import App from "../App";
import { AnalyticsPage } from "../pages/AnalyticsPage";
import { Dashboard } from "../pages/Dashboard";
import { parseFavoriteCharts, parsePositiveInt, parseStoredUser } from "../safety";

const getMock = vi.hoisted(() => vi.fn());

vi.mock("../api", () => ({
  __esModule: true,
  default: { get: getMock },
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
}));

describe("fuzz resilience", () => {
  beforeEach(() => {
    getMock.mockReset();
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("parses arbitrary localStorage strings without throwing", () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        expect(() => parseStoredUser(value)).not.toThrow();
        expect(() => parseFavoriteCharts(value)).not.toThrow();
        expect(() => parsePositiveInt(value)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it("keeps only structurally valid favorite charts", () => {
    fc.assert(
      fc.property(fc.jsonValue(), (value) => {
        const parsed = parseFavoriteCharts(JSON.stringify(value));
        parsed.forEach((favorite) => {
          expect(favorite.id).toEqual(expect.any(String));
          expect(favorite.name).toEqual(expect.any(String));
          expect(favorite.properties.every((id) => Number.isInteger(id) && id > 0)).toBe(true);
          expect(["year", "half", "two"]).toContain(favorite.rangePreset);
        });
      }),
      { numRuns: 100 },
    );
  });

  it("boots with corrupted localStorage values", async () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (userValue, activePropertyValue) => {
        cleanup();
        window.localStorage.clear();
        window.localStorage.setItem("user", userValue);
        window.localStorage.setItem("activeProperty", activePropertyValue);
        getMock.mockResolvedValue({ data: [] });

        expect(() => render(<App />)).not.toThrow();
      }),
      { numRuns: 30 },
    );
  });

  it("renders dashboard with malformed API payloads", async () => {
    getMock.mockImplementation((url) => {
      if (url.includes("forecast")) return Promise.resolve({ data: { forecast_amount: "not-a-number" } });
      if (url.startsWith("readings/")) return Promise.resolve({ data: { items: "not-array" } });
      return Promise.resolve({ data: { monthly: null, summary: null, comparison: null } });
    });

    render(
      <Dashboard
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
        onSelectProperty={vi.fn()}
      />,
    );

    await waitFor(() => expect(getMock).toHaveBeenCalled());
    expect(screen.getByText(/Последние показания/)).toBeInTheDocument();
  });

  it("renders analytics with malformed API payloads and favorites", async () => {
    window.localStorage.setItem(
      "mf_favorite_charts",
      JSON.stringify([
        { id: "valid", name: "Valid", properties: [1], resourceType: "", rangePreset: "year" },
        { id: 1, properties: "bad", rangePreset: "bad" },
      ]),
    );
    getMock.mockResolvedValue({ data: { monthly: {}, summary: { total_amount: null }, comparison: null } });

    render(
      <AnalyticsPage
        selectedProperty={1}
        properties={[{ id: 1, name: "Дом", address: "Адрес" }]}
      />,
    );

    expect(await screen.findByText(/Аналитика/)).toBeInTheDocument();
    expect((await screen.findAllByText(/0.00 ₽/)).length).toBeGreaterThan(0);
  });
});
