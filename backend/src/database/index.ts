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
import KnowledgeBaseChunk from "../models/KnowledgeBaseChunk";
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
import QueueDistributionLog from "../models/QueueDistributionLog";
import QualificationForm from "../models/QualificationForm";
import QualificationFormQuestion from "../models/QualificationFormQuestion";
import QualificationFormResponse from "../models/QualificationFormResponse";
import QualificationFormAnswer from "../models/QualificationFormAnswer";
import AiTicketContext from "../models/AiTicketContext";
import AiLead from "../models/AiLead";
import AiCalendarConnection from "../models/AiCalendarConnection";
import AiToolExecution from "../models/AiToolExecution";
import CommercialService from "../models/CommercialService";
import CommercialIncludedItem from "../models/CommercialIncludedItem";
import CommercialPriceRule from "../models/CommercialPriceRule";
import CommercialQuoteSimulation from "../models/CommercialQuoteSimulation";


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
  KnowledgeBaseChunk,
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
  ScheduledMessageExecution,
  QueueDistributionLog,
  QualificationForm,
  QualificationFormQuestion,
  QualificationFormResponse,
  QualificationFormAnswer,
  AiTicketContext,
  AiLead,
  AiCalendarConnection,
  AiToolExecution,
  CommercialService,
  CommercialIncludedItem,
  CommercialPriceRule,
  CommercialQuoteSimulation
];

sequelize.addModels(models);

export default sequelize;


