const requestUseMock = vi.hoisted(() => vi.fn());
const postMock = vi.hoisted(() => vi.fn());

vi.mock("axios", () => ({
  __esModule: true,
  default: {
    create: vi.fn(() => ({
      interceptors: { request: { use: requestUseMock } },
      post: postMock,
    })),
  },
}));

import { authApi } from "../api";

describe("api client", () => {
  beforeEach(() => {
    postMock.mockReset();
    window.localStorage.clear();
  });

  it("adds access token to outgoing requests", () => {
    window.localStorage.setItem("access", "token-123");
    const handler = requestUseMock.mock.calls[0][0];

    const config = handler({});

    expect(config.headers.Authorization).toBe("Bearer token-123");
  });

  it("posts auth payloads and returns response data", async () => {
    postMock.mockResolvedValue({ data: { access: "access-token" } });

    await expect(authApi.login("alice", "password")).resolves.toEqual({ access: "access-token" });
    expect(postMock).toHaveBeenCalledWith("auth/login/", { username: "alice", password: "password" });

    postMock.mockResolvedValue({ data: { user: { username: "bob" } } });
    await expect(authApi.register("bob", "password", "bob@example.com")).resolves.toEqual({ user: { username: "bob" } });
    expect(postMock).toHaveBeenCalledWith("auth/register/", {
      username: "bob",
      password: "password",
      email: "bob@example.com",
    });
  });
});
