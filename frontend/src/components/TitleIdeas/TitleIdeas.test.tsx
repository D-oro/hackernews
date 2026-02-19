import {render, screen, within} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import TitleIdeas from "./TitleIdeas";

describe("TitleIdeas", () => {
  it("renders an empty list when ideas is empty", () => {
    render(<TitleIdeas ideas={[]} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });

  it("renders each idea with index, title, and rationale", () => {
    render(
      <TitleIdeas
        ideas={[
          {title: "Ship it", rationale: "Short and action-oriented."},
          {title: "What I learned", rationale: "Sets expectation for a write-up."},
        ]}
      />,
    );

    const list = screen.getByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    expect(within(items[0]).getByText("01")).toBeInTheDocument();
    expect(within(items[0]).getByRole("heading", {level: 2, name: "Ship it"}))
      .toBeInTheDocument();
    expect(within(items[0]).getByText("Short and action-oriented."))
      .toBeInTheDocument();

    expect(within(items[1]).getByText("02")).toBeInTheDocument();
    expect(
      within(items[1]).getByRole("heading", {level: 2, name: "What I learned"}),
    ).toBeInTheDocument();
    expect(within(items[1]).getByText("Sets expectation for a write-up."))
      .toBeInTheDocument();
  });

  it("renders an empty list when ideas is null", () => {
    render(<TitleIdeas ideas={null} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.queryAllByRole("listitem")).toHaveLength(0);
  });
});
