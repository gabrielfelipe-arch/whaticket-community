jest.mock("../../../models/User", () => ({
  __esModule: true,
  default: { findAll: jest.fn() }
}));

import User from "../../../models/User";
import ListTransferUsersService from "../../../services/TicketServices/ListTransferUsersService";

const mockedFindAll = User.findAll as jest.Mock;

describe("ListTransferUsersService", () => {
  beforeEach(() => jest.clearAllMocks());

  it("does not query for searches shorter than three characters", async () => {
    expect(await ListTransferUsersService({ searchParam: "Sa" })).toEqual([]);
    expect(mockedFindAll).not.toHaveBeenCalled();
  });

  it("returns only minimal transfer recipient fields", async () => {
    mockedFindAll.mockResolvedValue([{ id: 7, name: "Samara", operationalStatus: "online" }]);

    const users = await ListTransferUsersService({
      searchParam: "Sam",
      excludedUserId: 2
    });

    expect(users).toHaveLength(1);
    expect(mockedFindAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ["id", "name", "active", "operationalStatus"],
      limit: 20
    }));
  });
});
