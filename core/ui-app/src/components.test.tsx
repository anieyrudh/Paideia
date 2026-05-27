// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import {
  CurriculumSearch,
  HomeLink,
  MasteryStatusToggle,
  ModuleTabs,
  StatusBadge,
} from "./components.js";

afterEach(() => {
  cleanup();
});

describe("@paideia/ui-app components", () => {
  it("renders a global home link with an accessible route label", () => {
    render(<HomeLink currentLabel="A-Level Physics" href="/Paideia/" label="All curricula" />);

    const link = screen.getByRole("link", { name: "All curricula: A-Level Physics" });
    expect(link.getAttribute("href")).toBe("/Paideia/");
  });

  it("renders status badges with semantic tone data for shell styling", () => {
    render(<StatusBadge label="Ready to practise" tone="ready" />);

    expect(screen.getByText("Ready to practise").getAttribute("data-tone")).toBe("ready");
  });

  it("keeps curriculum search controlled and announces result counts", () => {
    const onChange = vi.fn();
    render(
      <CurriculumSearch
        label="Search curriculum"
        onChange={onChange}
        placeholder="vector, force..."
        resultSummary={{ visible: 2, total: 7, label: "2 of 7 containers" }}
        value="vec"
      />,
    );

    expect(screen.getByRole("status").textContent).toBe("2 of 7 containers");
    fireEvent.change(screen.getByLabelText("Search curriculum"), {
      target: { value: "force" },
    });
    expect(onChange).toHaveBeenCalledWith("force");
  });

  it("renders module tabs as controlled buttons", () => {
    const onChange = vi.fn();
    render(
      <ModuleTabs
        label="Subject modules"
        modules={["Mechanics", "Statistics"]}
        onChange={onChange}
        selectedModule="Mechanics"
      />,
    );

    expect(screen.getByRole("button", { name: "Mechanics" }).getAttribute("aria-pressed"))
      .toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Statistics" }));
    expect(onChange).toHaveBeenCalledWith("Statistics");
    fireEvent.click(screen.getByRole("button", { name: "All modules" }));
    expect(onChange).toHaveBeenLastCalledWith("all");
  });

  it("renders mastery status controls without owning persistence", () => {
    const onChange = vi.fn();
    render(
      <MasteryStatusToggle
        containerId="physics/scalars"
        label="Scalars and Vectors mastery"
        onChange={onChange}
        value="practicing"
      />,
    );

    expect(screen.getByRole("group", { name: "Scalars and Vectors mastery" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Practice" }).getAttribute("aria-pressed"))
      .toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Mastered" }));
    expect(onChange).toHaveBeenCalledWith("physics/scalars", "mastered");
  });
});
