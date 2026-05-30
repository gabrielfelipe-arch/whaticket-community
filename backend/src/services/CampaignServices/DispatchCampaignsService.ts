import { Op } from "sequelize";

import Campaign from "../../models/Campaign";
import CampaignContact from "../../models/CampaignContact";
import Contact from "../../models/Contact";
import ScheduledMessage from "../../models/ScheduledMessage";
import CampaignRecipientLog from "../../models/CampaignRecipientLog";
import ScheduledMessageExecution from "../../models/ScheduledMessageExecution";
import { logger } from "../../utils/logger";
import { sendDirectMessage } from "./MessageDispatchService";
import { getNextIntervalSeconds } from "../../helpers/MessageQueueTiming";

let running = false;

const addSeconds = (date: Date, seconds: number): Date => {
  return new Date(date.getTime() + seconds * 1000);
};

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const timeToDate = (base: Date, time: string): Date => {
  const [hours, minutes] = String(time || "00:00").split(":").map(Number);
  const next = new Date(base);
  next.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return next;
};

const calculateNextRecurringRun = (schedule: ScheduledMessage, fromDate = new Date()): Date | null => {
  if (schedule.recurrenceType !== "weekly") return null;

  const weekdays = Array.isArray(schedule.weekdays) ? schedule.weekdays.map(Number) : [];
  const times = Array.isArray(schedule.times) ? schedule.times : [];
  if (!weekdays.length || !times.length) return null;

  const candidates: Date[] = [];
  for (let dayOffset = 0; dayOffset <= 14; dayOffset += 1) {
    const candidateDay = addDays(fromDate, dayOffset);
    if (!weekdays.includes(candidateDay.getDay())) continue;

    times.forEach(time => {
      const candidate = timeToDate(candidateDay, time);
      if (candidate.getTime() > fromDate.getTime()) candidates.push(candidate);
    });
  }

  const next = candidates.sort((a, b) => a.getTime() - b.getTime())[0] || null;
  if (next && schedule.endsAt && next.getTime() > schedule.endsAt.getTime()) return null;
  return next;
};

const finishCampaignIfDone = async (campaignId: number) => {
  const remaining = await CampaignContact.count({
    where: {
      campaignId,
      status: { [Op.in]: ["pending", "sending"] }
    }
  });

  if (remaining > 0) return;

  const failed = await CampaignContact.count({
    where: { campaignId, status: { [Op.in]: ["failed", "error"] } }
  });

  await Campaign.update(
    {
      status: failed > 0 ? "completed_with_errors" : "completed",
      completedAt: new Date()
    },
    { where: { id: campaignId } }
  );
};

const dispatchCampaignRecipient = async (recipient: CampaignContact) => {
  const campaign = recipient.campaign;
  const attemptNumber = recipient.attempts + 1;
  const attemptedAt = new Date();

  try {
    if (campaign.status === "scheduled") {
      await campaign.update({ status: "running", startedAt: campaign.startedAt || attemptedAt });
    }

    await recipient.update({ status: "sending", lockedAt: attemptedAt, lastAttemptAt: attemptedAt });

    await sendDirectMessage({
      contact: recipient.contact,
      body: campaign.message,
      whatsappId: campaign.whatsappId,
      mediaUrl: campaign.mediaUrl,
      mediaType: campaign.mediaType,
      mediaName: campaign.mediaName
    });

    const sentCount = await CampaignContact.count({
      where: { campaignId: campaign.id, status: "sent" }
    });

    const shouldPause =
      campaign.pauseAfter > 0 && (sentCount + 1) % campaign.pauseAfter === 0;

    await recipient.update({
      status: "sent",
      sentAt: new Date(),
      attempts: attemptNumber,
      errorMessage: null,
      errorAt: null,
      lockedAt: null
    });

    await CampaignRecipientLog.create({
      campaignId: campaign.id,
      campaignContactId: recipient.id,
      contactId: recipient.contactId,
      whatsappId: campaign.whatsappId,
      phoneNumber: recipient.contact?.number,
      message: campaign.message,
      status: "sent",
      attemptNumber,
      attemptedAt,
      sentAt: new Date()
    });

    const pending = await CampaignContact.findOne({
      where: { campaignId: campaign.id, status: "pending" },
      order: [["id", "ASC"]]
    });

    if (pending) {
      await pending.update({
        nextRunAt: addSeconds(
          new Date(),
          shouldPause
            ? campaign.pauseSeconds
            : getNextIntervalSeconds({
                intervalPattern: campaign.intervalPattern,
                fallbackSeconds: campaign.intervalSeconds,
                sentCount
              })
        )
      });
    } else {
      await finishCampaignIfDone(campaign.id);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await recipient.update({
      status: "failed",
      attempts: attemptNumber,
      errorMessage,
      errorAt: new Date(),
      lockedAt: null
    });
    await CampaignRecipientLog.create({
      campaignId: campaign.id,
      campaignContactId: recipient.id,
      contactId: recipient.contactId,
      whatsappId: campaign.whatsappId,
      phoneNumber: recipient.contact?.number,
      message: campaign.message,
      status: "failed",
      attemptNumber,
      attemptedAt,
      errorAt: new Date(),
      errorMessage
    });
    logger.error({ err, recipientId: recipient.id }, "Error dispatching campaign message");
    await finishCampaignIfDone(campaign.id);
  }
};

const dispatchScheduledMessage = async (schedule: ScheduledMessage) => {
  const attemptedAt = new Date();
  const execution = await ScheduledMessageExecution.create({
    scheduleId: schedule.id,
    contactId: schedule.contactId,
    whatsappId: schedule.whatsappId,
    scheduledFor: schedule.nextRunAt || schedule.scheduledAt,
    executedAt: attemptedAt,
    status: "sending",
    attempts: 1
  });

  try {
    await schedule.update({ status: "running" });

    await sendDirectMessage({
      contact: schedule.contact,
      body: schedule.message,
      whatsappId: schedule.whatsappId,
      mediaUrl: schedule.mediaUrl,
      mediaType: schedule.mediaType,
      mediaName: schedule.mediaName
    });

    const nextRecurringRun = calculateNextRecurringRun(schedule, new Date());

    await execution.update({
      status: "sent",
      executedAt: new Date()
    });

    await schedule.update({
      status: nextRecurringRun ? "scheduled" : "completed",
      sentAt: new Date(),
      lastRunAt: new Date(),
      nextRunAt: nextRecurringRun,
      errorMessage: null
    });

    if (schedule.batchId) {
      const sentCount = await ScheduledMessage.count({
        where: { batchId: schedule.batchId, status: { [Op.in]: ["sent", "completed"] } }
      });
      const shouldPause =
        schedule.pauseAfter > 0 && sentCount > 0 && sentCount % schedule.pauseAfter === 0;
      const nextSchedule = await ScheduledMessage.findOne({
        where: {
          batchId: schedule.batchId,
          status: "scheduled",
          nextRunAt: null
        },
        order: [["sequence", "ASC"], ["id", "ASC"]]
      });

      if (nextSchedule) {
        await nextSchedule.update({
          nextRunAt: addSeconds(
            new Date(),
            shouldPause
              ? schedule.pauseSeconds
              : getNextIntervalSeconds({
                  intervalPattern: schedule.intervalPattern,
                  fallbackSeconds: schedule.intervalSeconds,
                  sentCount
                })
          )
        });
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await execution.update({
      status: "failed",
      errorMessage,
      executedAt: new Date()
    });
    await schedule.update({
      status: "failed",
      errorMessage
    });
    logger.error({ err, scheduleId: schedule.id }, "Error dispatching scheduled message");
  }
};

const DispatchCampaignsService = async (): Promise<void> => {
  if (running) return;
  running = true;

  try {
    const now = new Date();

    const recipients = await CampaignContact.findAll({
      where: {
        status: "pending",
        nextRunAt: { [Op.lte]: now }
      },
      include: [
        { model: Contact, as: "contact" },
        { model: Campaign, as: "campaign", where: { status: { [Op.in]: ["scheduled", "running"] } } }
      ],
      order: [["nextRunAt", "ASC"], ["id", "ASC"]],
      limit: 1
    });

    for (const recipient of recipients) {
      await dispatchCampaignRecipient(recipient);
    }

    const schedules = await ScheduledMessage.findAll({
      where: {
        status: "scheduled",
        nextRunAt: { [Op.lte]: now }
      },
      include: [{ model: Contact, as: "contact" }],
      order: [["nextRunAt", "ASC"], ["sequence", "ASC"], ["id", "ASC"]],
      limit: 1
    });

    for (const schedule of schedules) {
      await dispatchScheduledMessage(schedule);
    }
  } finally {
    running = false;
  }
};

export const StartCampaignDispatcher = (): void => {
  setInterval(() => {
    DispatchCampaignsService().catch(err =>
      logger.error({ err }, "Error running campaign dispatcher")
    );
  }, 15000);
};

export default DispatchCampaignsService;
