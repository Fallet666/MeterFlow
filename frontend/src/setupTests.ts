import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Recharts relies on DOM measurements; replace with light stubs for unit tests.
vi.mock("recharts", () => {
  const React = require("react");
  const Mock = ({ children }: any) => React.createElement("div", null, children);
  return {
    ResponsiveContainer: Mock,
    LineChart: Mock,
    Line: Mock,
    CartesianGrid: Mock,
    XAxis: Mock,
    YAxis: Mock,
    Tooltip: Mock,
    Legend: Mock,
    BarChart: Mock,
    Bar: Mock,
  };
});
