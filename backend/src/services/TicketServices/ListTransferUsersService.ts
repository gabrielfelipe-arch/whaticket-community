import { Op } from "sequelize";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  excludedUserId?: number | null;
}

const ListTransferUsersService = async ({
  searchParam = "",
  excludedUserId
}: Request): Promise<User[]> => {
  const normalizedSearch = String(searchParam).trim();
  if (normalizedSearch.length < 3) return [];

  return User.findAll({
    where: {
      active: true,
      name: { [Op.iLike]: `%${normalizedSearch}%` },
      ...(excludedUserId ? { id: { [Op.ne]: excludedUserId } } : {})
    },
    attributes: ["id", "name", "active", "operationalStatus"],
    order: [["name", "ASC"]],
    limit: 20
  });
};

export default ListTransferUsersService;
