import { Op, Sequelize } from "sequelize";
import QuickAnswer from "../../models/QuickAnswer";
import User from "../../models/User";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  userId: number;
  userProfile: string;
}

interface Response {
  quickAnswers: QuickAnswer[];
  count: number;
  hasMore: boolean;
}

const ListQuickAnswerService = async ({
  searchParam = "",
  pageNumber = "1",
  userId,
  userProfile
}: Request): Promise<Response> => {
  const search = `%${searchParam.toLowerCase().trim()}%`;
  const whereCondition = {
    [Op.and]: [
      {
        [Op.or]: [
          Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("message")), "LIKE", search),
          Sequelize.where(Sequelize.fn("LOWER", Sequelize.col("shortcut")), "LIKE", search)
        ]
      },
      userProfile === "admin"
        ? {}
        : {
            [Op.or]: [{ global: true }, { userId }]
          }
    ]
  };
  const limit = 20;
  const offset = limit * (+pageNumber - 1);

  const { count, rows: quickAnswers } = await QuickAnswer.findAndCountAll({
    where: whereCondition,
    include: [{ model: User, as: "user", attributes: ["id", "name"] }],
    limit,
    offset,
    order: [
      ["global", "DESC"],
      ["message", "ASC"]
    ]
  });

  const hasMore = count > offset + quickAnswers.length;

  return {
    quickAnswers,
    count,
    hasMore
  };
};

export default ListQuickAnswerService;
