/**
 * Unit tests for readToken()
 *
 * Because readToken() reads window.location.hash and calls appProcess,
 * we mock both at the module level.
 */

// ---- Mock @canva/platform ----
jest.mock("@canva/platform", () => ({
  appProcess: {
    current: {
      getInfo: jest.fn(),
    },
  },
}));

import { appProcess } from "@canva/platform";
import { readToken } from "../importer/token";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetInfo = appProcess.current.getInfo as jest.MockedFunction<any>;

// jsdom does not allow redefining window.location, but does allow
// setting window.location.hash via the hash setter.
function setHash(hash: string) {
  // Remove leading # if present — window.location.hash setter adds it back
  const bare = hash.startsWith("#") ? hash.slice(1) : hash;
  window.location.hash = bare ? `#${bare}` : "";
}

beforeEach(() => {
  mockGetInfo.mockReset();
  // Reset hash to empty before each test
  window.location.hash = "";
});

describe("readToken", () => {
  it("reads token from hash fragment with leading #", () => {
    setHash("#t=abc123");
    expect(readToken()).toBe("abc123");
  });

  it("reads token from hash fragment with other params present", () => {
    setHash("#foo=bar&t=mytoken&baz=qux");
    expect(readToken()).toBe("mytoken");
  });

  it("returns null when hash has no t param and appProcess returns no launchParams token", () => {
    setHash("#foo=bar");
    mockGetInfo.mockReturnValue({ surface: "object_panel", processId: "p1", launchParams: undefined });
    expect(readToken()).toBeNull();
  });

  it("returns null when hash is empty and appProcess returns no token", () => {
    setHash("");
    mockGetInfo.mockReturnValue({ surface: "object_panel", processId: "p1", launchParams: {} });
    expect(readToken()).toBeNull();
  });

  it("falls back to appProcess launchParams when hash has no token", () => {
    setHash("#other=value");
    mockGetInfo.mockReturnValue({
      surface: "object_panel",
      processId: "p1",
      launchParams: { token: "fallback-token" },
    });
    expect(readToken()).toBe("fallback-token");
  });

  it("returns null when appProcess throws", () => {
    setHash("");
    mockGetInfo.mockImplementation(() => {
      throw new Error("Not in app context");
    });
    expect(readToken()).toBeNull();
  });
});
