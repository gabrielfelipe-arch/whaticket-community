import { Request, Response } from "express";
import AppError from "../errors/AppError";
import {
  buildGoogleCalendarAuthUrl,
  buildGoogleCalendarErrorRedirect,
  handleGoogleCalendarCallback
} from "../services/CalendarServices/GoogleCalendarOAuthService";
import { logger } from "../utils/logger";

export const googleAuth = async (req: Request, res: Response): Promise<Response> => {
  const authUrl = await buildGoogleCalendarAuthUrl({
    userId: Number(req.user.id)
  });

  if (!authUrl) {
    throw new AppError("Configuracao do Google Agenda incompleta.", 400);
  }

  return res.json({ authUrl });
};

export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { redirectUrl } = await handleGoogleCalendarCallback({
      code: req.query.code as string,
      state: req.query.state as string
    });

    res.redirect(redirectUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao conectar Google Agenda.";
    logger.warn({ err: message }, "Google Calendar OAuth callback failed");
    res.redirect(buildGoogleCalendarErrorRedirect(message));
  }
};
