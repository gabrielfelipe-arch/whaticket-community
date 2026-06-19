import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  buildGoogleCalendarAuthUrl,
  buildGoogleCalendarErrorRedirect,
  handleGoogleCalendarCallback
} from "../services/CalendarServices/GoogleCalendarOAuthService";
import { logger } from "../utils/logger";

export const googleAuth = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") throw new AppError("ERR_NO_PERMISSION", 403);

  const authUrl = await buildGoogleCalendarAuthUrl({
    userId: Number(req.user.id),
    connectionId: req.query.connectionId ? Number(req.query.connectionId) : null,
    name: req.query.name ? String(req.query.name) : null
  });

  return res.status(200).json({ authUrl });
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      throw new AppError(`Google OAuth recusado: ${String(error)}`, 400);
    }

    const { redirectUrl } = await handleGoogleCalendarCallback({
      code: String(code || ""),
      state: String(state || "")
    });

    res.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao conectar Google Agenda.";
    logger.warn({ err: message }, "Google Calendar OAuth callback failed");
    res.redirect(buildGoogleCalendarErrorRedirect(message));
  }
};
