import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import InputForm from "./InputForm";

describe("InputForm", () => {
  it("submits the input value", () => {
    const handleSubmit = vi.fn();
    render(<InputForm onSubmit={handleSubmit} />);

    const urlInput = screen.getByLabelText(/Generate titles for this URL:/i);
    expect(urlInput).toHaveAttribute("type", "url");

    fireEvent.change(urlInput, {
      target: {value: "https://example.com"},
    });

    fireEvent.click(screen.getByRole("button", {name: /generate/i}));

    expect(handleSubmit).toHaveBeenCalledWith("https://example.com");
  });

  it("disables the button while loading", () => {
    const handleSubmit = vi.fn();
    render(<InputForm onSubmit={handleSubmit} isLoading />);

    expect(screen.getByRole("button")).toBeDisabled();
  });
});
