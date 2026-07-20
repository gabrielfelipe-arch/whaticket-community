import webpush from "web-push";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import UserPushSubscription from "../../models/UserPushSubscription";
import UserQueue from "../../models/UserQueue";
import { logger } from "../../utils/logger";

let configured = false;

const configureWebPush = (): boolean => {
  if (configured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) return false;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@whaticket.com",
    publicKey,
    privateKey
  );
  configured = true;
  return true;
};

const targetUserIdsForTicket = async (ticket: Ticket): Promise<number[]> => {
  if (ticket.userId) return [Number(ticket.userId)];

  if (!ticket.queueId) return [];

  const queueUsers = await UserQueue.findAll({
    where: { queueId: ticket.queueId },
    attributes: ["userId"]
  });

  return [...new Set(queueUsers.map(item => Number(item.userId)).filter(Boolean))];
};

const truncate = (value: string, max = 160): string => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
};

const SendPushNotificationService = async ({
  message,
  ticket,
  contact
}: {
  message: Message;
  ticket: Ticket;
  contact?: Contact | null;
}): Promise<void> => {
  if (!configureWebPush()) return;
  if (message.fromMe || message.read || ticket.isGroup) return;

  const userIds = await targetUserIdsForTicket(ticket);
  if (!userIds.length) return;

  const subscriptions = await UserPushSubscription.findAll({
    where: { userId: { [Op.in]: userIds } }
  });

  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title: `Nova mensagem de ${contact?.name || ticket.contact?.name || "contato"}`,
    body: truncate(message.body || "Nova mensagem recebida"),
    icon: contact?.profilePicUrl || "/android-chrome-192x192.png",
    badge: "/android-chrome-192x192.png",
    tag: `ticket-${ticket.id}`,
    url: `/tickets/${ticket.id}`,
    ticketId: ticket.id
  });

  await Promise.all(
    subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          payload
        );
      } catch (err: any) {
        const statusCode = err?.statusCode;
        if ([404, 410].includes(Number(statusCode))) {
          await subscription.destroy();
          return;
        }
        logger.warn({ err, userId: subscription.userId }, "Failed to send web push notification");
      }
    })
  );
};

export default SendPushNotificationService;
