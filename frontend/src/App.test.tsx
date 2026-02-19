import {fireEvent, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import App from "./App";

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {promise, resolve, reject};
}

describe("App", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the header and input form", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<App />);

    expect(
      screen.getByRole("heading", {level: 1, name: /hacker news title generator/i}),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/generate titles for this url:/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", {name: /generate/i})).toBeDisabled();
  });

  it("submits a URL, calls the API, and renders ideas on success", async () => {
    const ideas = [
      {title: "Ship it", reason: "Short and action-oriented."},
      {title: "What I learned", reason: "Sets expectation for a write-up."},
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue(ideas),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const urlInput = screen.getByLabelText(/generate titles for this url:/i);
    fireEvent.change(urlInput, {target: {value: "https://example.com"}});
    fireEvent.click(screen.getByRole("button", {name: /generate/i}));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({url: "https://example.com"}),
      }),
    );

    expect(await screen.findByRole("heading", {level: 2, name: "Ship it"}))
      .toBeInTheDocument();
    expect(
      screen.getByRole("heading", {level: 2, name: "What I learned"}),
    ).toBeInTheDocument();
    expect(screen.getByText("01")).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("disables the form while loading", async () => {
    const deferred = createDeferred<{
      ok: boolean;
      json: () => Promise<unknown>;
    }>();
    const fetchMock = vi.fn().mockReturnValue(deferred.promise);
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    const urlInput = screen.getByLabelText(/generate titles for this url:/i);
    fireEvent.change(urlInput, {target: {value: "https://example.com"}});
    fireEvent.click(screen.getByRole("button", {name: /generate/i}));

    expect(screen.getByRole("button", {name: /generating/i})).toBeDisabled();
    expect(urlInput).toBeDisabled();

    deferred.resolve({
      ok: true,
      json: async () => [{title: "Done", reason: "Resolved."}],
    });

    expect(await screen.findByRole("heading", {level: 2, name: "Done"}))
      .toBeInTheDocument();
    expect(screen.getByRole("button", {name: /generate/i})).toBeEnabled();
  });

  it("shows an error message when the API returns a non-OK response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({error: "Nope"}),
      }),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText(/generate titles for this url:/i), {
      target: {value: "https://example.com"},
    });
    fireEvent.click(screen.getByRole("button", {name: /generate/i}));

    expect(await screen.findByText("Nope")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows an error message when the API response is not an array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({not: "an array"}),
      }),
    );

    render(<App />);

    fireEvent.change(screen.getByLabelText(/generate titles for this url:/i), {
      target: {value: "https://example.com"},
    });
    fireEvent.click(screen.getByRole("button", {name: /generate/i}));

    expect(
      await screen.findByText("Unexpected response shape (expected an array)."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

