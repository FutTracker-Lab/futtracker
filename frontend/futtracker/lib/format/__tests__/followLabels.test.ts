import { describe, expect, it } from "vitest";

import {
  followSuccessMessage,
  followerCountLabel,
  unfollowButtonLabel,
  unfollowSuccessMessage,
} from "@/lib/format/followLabels";

describe("followLabels", () => {
  it("contador en singular y plural", () => {
    expect(followerCountLabel(0)).toBe("0 seguidores");
    expect(followerCountLabel(1)).toBe("1 seguidor");
    expect(followerCountLabel(2)).toBe("2 seguidores");
    expect(followerCountLabel(1500)).toBe("1.500 seguidores");
  });

  it("nombra al equipo", () => {
    expect(followSuccessMessage("Los Pumas")).toBe("Ahora seguís a Los Pumas.");
    expect(unfollowSuccessMessage("Los Pumas")).toBe("Dejaste de seguir a Los Pumas.");
    expect(unfollowButtonLabel("Los Pumas")).toBe("Dejar de seguir a Los Pumas");
  });
});
