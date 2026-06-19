import fs from "fs";
import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";
import AppError from "../../errors/AppError";
import Ticket from "../../models/Ticket";
import { whatsappProvider, ProviderMessage } from "../../providers/WhatsApp";

import formatBody from "../../helpers/Mustache";
import { logger } from "../../utils/logger";

const execFileAsync = promisify(execFile);

interface Request {
  media: Express.Multer.File;
  ticket: Ticket;
  body?: string;
}

const convertAudioToOgg = async (media: Express.Multer.File): Promise<Express.Multer.File> => {
  if (!media.mimetype.startsWith("audio/")) return media;
  if (/\.ogg$/i.test(media.filename) && media.mimetype.includes("ogg")) return media;

  const parsedPath = path.parse(media.path);
  const outputPath = path.join(parsedPath.dir, `${parsedPath.name}.ogg`);

  await execFileAsync("ffmpeg", [
    "-y",
    "-i",
    media.path,
    "-vn",
    "-c:a",
    "libopus",
    "-b:a",
    "32k",
    "-ar",
    "48000",
    "-ac",
    "1",
    outputPath
  ]);

  return {
    ...media,
    path: outputPath,
    filename: `${path.parse(media.filename).name}.ogg`,
    mimetype: "audio/ogg; codecs=opus"
  };
};

const SendWhatsAppMedia = async ({
  media,
  ticket,
  body
}: Request): Promise<ProviderMessage> => {
  try {
    if (!ticket.whatsappId) {
      throw new AppError("ERR_TICKET_NO_WHATSAPP");
    }

    const chatId = `${ticket.contact.number}@${ticket.isGroup ? "g" : "c"}.us`;

    const hasBody = body
      ? formatBody(body as string, ticket.contact)
      : undefined;

    const preparedMedia = await convertAudioToOgg(media);

    const mediaInput = {
      filename: preparedMedia.filename,
      mimetype: preparedMedia.mimetype,
      path: preparedMedia.path
    };

    const mediaOptions = {
      caption: hasBody,
      sendAudioAsVoice: true,
      sendMediaAsDocument:
        preparedMedia.mimetype.startsWith("image/") &&
        !/^.*\.(jpe?g|png|gif|webp)$/i.exec(preparedMedia.filename)
    };

    const sentMessage = await whatsappProvider.sendMedia(
      ticket.whatsappId,
      chatId,
      mediaInput,
      mediaOptions
    );

    await ticket.update({ lastMessage: body || media.filename });

    if (fs.existsSync(preparedMedia.path)) fs.unlinkSync(preparedMedia.path);
    if (preparedMedia.path !== media.path && fs.existsSync(media.path)) fs.unlinkSync(media.path);

    return sentMessage;
  } catch (err) {
    logger.error(
      { err, mimetype: media.mimetype, filename: media.filename },
      "Error sending WhatsApp media"
    );
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMedia;
