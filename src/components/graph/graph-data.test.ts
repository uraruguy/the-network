import { describe, expect, it } from "vitest";
import { carryPositions } from "./graph-data";

describe("carryPositions", () => {
  it("keeps the position and velocity of nodes that stay", () => {
    const prev = [
      { id: "me", x: 0, y: 0, vx: 0, vy: 0 },
      { id: "a", x: 10, y: -4, vx: 0.5, vy: -0.2 },
      { id: "gone", x: 99, y: 99 },
    ];
    const next = carryPositions([{ id: "me" }, { id: "a" }, { id: "new" }], prev);
    expect(next).toEqual([{ id: "me", x: 0, y: 0, vx: 0, vy: 0 }, { id: "a", x: 10, y: -4, vx: 0.5, vy: -0.2 }, { id: "new" }]);
  });

  it("leaves nodes the simulation hasn't placed yet alone", () => {
    expect(carryPositions([{ id: "a" }], [{ id: "a" }])).toEqual([{ id: "a" }]);
  });
});
