import { render, screen } from "@testing-library/react";
import ErrorBoundary from "../components/ErrorBoundary";

function BrokenChild(): JSX.Element {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  it("renders fallback UI when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText(/Произошла ошибка/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Перезагрузить/i })).toBeInTheDocument();

    consoleError.mockRestore();
  });
});
