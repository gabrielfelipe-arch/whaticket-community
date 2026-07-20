import { Request, Response } from "express";
import AppError from "../errors/AppError";
import UserPushSubscription from "../models/UserPushSubscription";

export const publicKey = async (_req: Request, res: Response): Promise<Response> => {
  return res.json({
    publicKey: process.env.VAPID_PUBLIC_KEY || ""
  });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { endpoint, keys } = req.body || {};
  const p256dh = keys?.p256dh;
  const auth = keys?.auth;

  if (!endpoint || !p256dh || !auth) {
    throw new AppError("Push subscription invalida.", 400);
  }

  const [subscription] = await UserPushSubscription.findOrCreate({
    where: { endpoint },
    defaults: {
      endpoint,
      p256dh,
      auth,
      userId: Number(req.user.id),
      userAgent: req.headers["user-agent"] || "",
      lastSeenAt: new Date()
    }
  });

  await subscription.update({
    p256dh,
    auth,
    userId: Number(req.user.id),
    userAgent: req.headers["user-agent"] || "",
    lastSeenAt: new Date()
  });

  return res.status(200).json({ ok: true });
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { endpoint } = req.body || {};

  if (!endpoint) {
    return res.status(200).json({ ok: true });
  }

  await UserPushSubscription.destroy({
    where: {
      endpoint,
      userId: Number(req.user.id)
    }
  });

  return res.status(200).json({ ok: true });
};
