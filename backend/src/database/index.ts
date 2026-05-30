import { Sequelize } from "sequelize-typescript";
import User from "../models/User";
import Setting from "../models/Setting";
import Contact from "../models/Contact";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import ContactCustomField from "../models/ContactCustomField";
import Message from "../models/Message";
import Queue from "../models/Queue";
import WhatsappQueue from "../models/WhatsappQueue";
import UserQueue from "../models/UserQueue";
import QuickAnswer from "../models/QuickAnswer";
import WppKey from "../models/WppKey";
import TicketCategory from "../models/TicketCategory";
import ClosingReason from "../models/ClosingReason";
import UraFlow from "../models/UraFlow";
import UraOption from "../models/UraOption";
import AiSetting from "../models/AiSetting";
import KnowledgeBaseArticle from "../models/KnowledgeBaseArticle";
import Campaign from "../models/Campaign";
import CampaignContact from "../models/CampaignContact";
import ScheduledMessage from "../models/ScheduledMessage";
import Tag from "../models/Tag";
import ContactTag from "../models/ContactTag";
import AiTaggerHistory from "../models/AiTaggerHistory";
import SatisfactionSurvey from "../models/SatisfactionSurvey";
import SatisfactionSurveyResponse from "../models/SatisfactionSurveyResponse";
import AuditLog from "../models/AuditLog";
import AiInteractionLog from "../models/AiInteractionLog";
import CampaignRecipientLog from "../models/CampaignRecipientLog";
import ScheduledMessageExecution from "../models/ScheduledMessageExecution";


// eslint-disable-next-line
const dbConfig = require("../config/database");
// import dbConfig from "../config/database";

const sequelize = new Sequelize(dbConfig);

const models = [
  User,
  Contact,
  Ticket,
  Message,
  Whatsapp,
  ContactCustomField,
  Setting,
  Queue,
  WhatsappQueue,
  UserQueue,
  QuickAnswer,
  WppKey,
  TicketCategory,
  ClosingReason,
  UraFlow,
  UraOption,
  AiSetting,
  KnowledgeBaseArticle,
  Campaign,
  CampaignContact,
  ScheduledMessage,
  Tag,
  ContactTag,
  AiTaggerHistory,
  SatisfactionSurvey,
  SatisfactionSurveyResponse,
  AuditLog,
  AiInteractionLog,
  CampaignRecipientLog,
  ScheduledMessageExecution
];

sequelize.addModels(models);

export default sequelize;


