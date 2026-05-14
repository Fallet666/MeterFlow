import { render, screen } from "@testing-library/react";
import { Footer } from "../components/Footer";

describe("Footer", () => {
  it("links to the public GitHub repository", () => {
    render(<Footer />);

    expect(screen.getByRole("link", { name: /GitHub/i })).toHaveAttribute(
      "href",
      "https://github.com/Fallet666/MeterFlow",
    );
  });
});
