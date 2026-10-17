import { Request, Response } from "express";
import crypto from "node:crypto";
import {
  VenueError,
  VenueRepo,
  SpaceDetails,
  VenueDetails,
  defaultSlotPolicy,
} from "../models/venueRepo.js";
import { moneyToMinor } from '../utils/bookingPolicy.js';
import { Sport, CourtStatus } from "../models/supabaseRepo.js";
import { supabaseAdmin } from "../lib/supabase.js";

const sports: Sport[] = ["cricket", "football", "padel", "badminton"];
const formats: Record<Sport, string[]> = {
  cricket: ["Net practice", "Tape-ball", "Hard-ball", "Indoor cricket"],
  football: ["5-a-side", "7-a-side", "11-a-side", "Futsal"],
  padel: ["Singles", "Doubles"],
  badminton: ["Singles", "Doubles"],
};
function text(
  value: unknown,
  label: string,
  max: number,
  required = false,
): string {
  if (value == null && !required) return "";
  if (
    typeof value !== "string" ||
    value.trim().length > max ||
    (required && !value.trim())
  )
    throw new VenueError(
      400,
      `${label} is required and must be at most ${max} characters.`,
    );
  return value.trim();
}
function photos(value: unknown, ownerId: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.length > 6)
    throw new VenueError(400, "Use up to six photos.");
  const prefix = `${process.env.SUPABASE_URL}/storage/v1/object/public/hub-photos/${ownerId}/`;
  if (
    value.some(
      (url) =>
        typeof url !== "string" || !url.startsWith(prefix) || url.length > 600,
    )
  )
    throw new VenueError(400, "Select photos uploaded to your venue account.");
  return [...new Set(value)];
}
export function parseSpace(body: any, ownerId: string) {
  const sport = body.sport as Sport;
  if (!sports.includes(sport))
    throw new VenueError(400, "Choose a supported sport.");
  const status: CourtStatus = body.status || "AVAILABLE";
  if (!["AVAILABLE", "LIMITED", "UNAVAILABLE"].includes(status))
    throw new VenueError(400, "Invalid playing space status.");
  const playFormat = text(body.playFormat, "Playing format", 40);
  if (playFormat && !formats[sport].includes(playFormat))
    throw new VenueError(400, "Choose a playing format for this sport.");
  if (body.isIndoor !== undefined && typeof body.isIndoor !== "boolean")
    throw new VenueError(400, "Indoor must be true or false.");
  const playerCapacity =
    body.playerCapacity === null || body.playerCapacity === undefined
      ? null
      : Number(body.playerCapacity);
  if (
    playerCapacity !== null &&
    (!Number.isInteger(playerCapacity) ||
      playerCapacity < 1 ||
      playerCapacity > 50)
  )
    throw new VenueError(400, "Player capacity must be 1–50.");
  const details: SpaceDetails = {
    areaName: text(body.areaName, "Ground / hall", 80),
    playFormat,
    surface: text(body.surface, "Surface", 60),
    isIndoor: body.isIndoor ?? false,
    playerCapacity,
    photoUrls: photos(body.photoUrls, ownerId),
  };
  return {
    name: text(body.name, "Playing space name", 80, true),
    sport,
    status,
    ...details,
  };
}
export function parseVenue(body: any, ownerId: string) {
  const latitude = body.latitude == null ? null : Number(body.latitude);
  const longitude = body.longitude == null ? null : Number(body.longitude);
  if (
    (latitude === null) !== (longitude === null) ||
    (latitude !== null &&
      (!Number.isFinite(latitude) || Math.abs(latitude) > 90)) ||
    (longitude !== null &&
      (!Number.isFinite(longitude) || Math.abs(longitude) > 180))
  )
    throw new VenueError(
      400,
      "Enter both valid latitude and longitude, or leave both empty.",
    );
  if (
    !Array.isArray(body.sports) ||
    !body.sports.length ||
    body.sports.some((s: Sport) => !sports.includes(s))
  )
    throw new VenueError(400, "Choose at least one supported sport.");
  const details: VenueDetails = {
    latitude,
    longitude,
    description: text(body.description, "Description", 1500),
    photoUrls: photos(body.photoUrls, ownerId),
  };
  return {
    hubName: text(body.name, "Venue name", 100, true),
    location: text(body.location, "Street address", 200, true),
    contactNumber: text(body.contactNumber, "Contact number", 30, true),
    sports: [...new Set(body.sports)] as Sport[],
    ...details,
  };
}
export function parseSlot(body: any) {
  const policy={...defaultSlotPolicy,...Object.fromEntries(Object.keys(defaultSlotPolicy).filter(key=>body[key]!==undefined).map(key=>[key,body[key]]))};
  if(typeof policy.bookingEnabled!=='boolean'||!['FULL_ONLY','FULL_OR_ADVANCE'].includes(policy.paymentPolicy)||!Number.isInteger(policy.advancePercent)||policy.advancePercent<1||policy.advancePercent>99||!Number.isInteger(policy.cancelBeforeHours)||policy.cancelBeforeHours<0||policy.cancelBeforeHours>720||!['FULL','KEEP_ADVANCE'].includes(policy.cancellationRefund))throw new VenueError(400,'Choose valid upfront payment and cancellation rules.');
  if(policy.bookingEnabled){try{moneyToMinor(body.price);}catch(error){throw new VenueError(400,(error as Error).message);}}
  const date = text(body.date, "Date", 10, true),
    start = text(body.startTime, "Start time", 5, true),
    end = text(body.endTime, "End time", 5, true);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) ||
    !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
  )
    throw new VenueError(
      400,
      "Use YYYY-MM-DD for the date and 24-hour HH:MM for times.",
    );
  const calendar = new Date(`${date}T12:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) ||
    calendar.toISOString().slice(0, 10) !== date
  )
    throw new VenueError(400, "Choose a valid calendar date.");
  const startsAt = new Date(`${date}T${start}:00+05:00`),
    endsAt = new Date(`${date}T${end}:00+05:00`);
  const status = body.status || "AVAILABLE";
  if (!["AVAILABLE", "UNAVAILABLE"].includes(status))
    throw new VenueError(400, "Invalid slot status.");
  if (endsAt <= startsAt)
    throw new VenueError(
      400,
      "End time must be after start time on the selected date.",
    );
  if (status === "AVAILABLE" && startsAt.getTime() <= Date.now())
    throw new VenueError(400, "Available slots must start in the future.");
  if (
    body.price == null ||
    !/^\d+(\.\d{1,2})?$/.test(String(body.price)) ||
    Number(body.price) > 1000000
  )
    throw new VenueError(
      400,
      "Enter a valid full-slot price in PKR, with up to two decimal places.",
    );
  return {
    courtId: text(body.courtId, "Playing space", 80, true),
    ...policy,
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    price: Number(body.price),
    status: status as "AVAILABLE" | "UNAVAILABLE",
  };
}
export function venueHandler(
  fn: (req: Request) => Promise<unknown>,
  status = 200,
) {
  return async (req: Request, res: Response) => {
    try {
      res.status(status).json(await fn(req));
    } catch (error: any) {
      if (error instanceof VenueError)
        res.status(error.status).json({ error: error.message });
      else {
        console.error("[Venue]", error.message);
        res
          .status(500)
          .json({
            error: "Unable to complete this venue request. Please try again.",
          });
      }
    }
  };
}
async function ownerVenue(owner: string) {
  const [profile, spaces, slots] = await Promise.all([
    VenueRepo.details(owner),
    VenueRepo.spaces(owner),
    VenueRepo.slots(owner),
  ]);
  return {
    id: owner,
    name: profile.hub_name,
    location: profile.location,
    contactNumber: profile.contact_number || "",
    sports: profile.sports,
    isVerified: profile.is_verified,
    description: profile.description,
    latitude: profile.latitude,
    longitude: profile.longitude,
    photoUrls: profile.photoUrls,
    spaces,
    slots,
  };
}
const uploads = new Map<string, { count: number; until: number }>();
export const VenueController = {
  browse: venueHandler(async (req) => {
    const sport = req.query.sport as Sport | undefined;
    if (sport && !sports.includes(sport))
      throw new VenueError(400, "Choose a supported sport.");
    return {
      hubs: await VenueRepo.publicHubs(
        sport,
        text(req.query.search, "Search", 100),
      ),
    };
  }),
  details: venueHandler(async (req) => ({
    hub: await VenueRepo.publicDetails(req.params.id),
  })),
  own: venueHandler(async (req) => ({
    hub: await ownerVenue(req.auth!.userId),
  })),
  saveVenue: venueHandler(async (req) => {
    await VenueRepo.saveDetails(
      req.auth!.userId,
      parseVenue(req.body, req.auth!.userId),
    );
    return { hub: await ownerVenue(req.auth!.userId) };
  }),
  saveSpace: venueHandler(async (req) => ({
    space: await VenueRepo.saveSpace(
      req.auth!.userId,
      parseSpace(req.body, req.auth!.userId),
      req.params.id,
    ),
  })),
  deleteSpace: venueHandler(async (req) => {
    await VenueRepo.deleteSpace(req.auth!.userId, req.params.id);
    return { success: true };
  }),
  saveSlot: venueHandler(async (req) => ({
    slot: await VenueRepo.saveSlot(
      req.auth!.userId,
      parseSlot(req.body),
      req.params.id,
    ),
  })),
  deleteSlot: venueHandler(async (req) => {
    await VenueRepo.deleteSlot(req.auth!.userId, req.params.id);
    return { success: true };
  }),
  uploadPhoto: venueHandler(async (req) => {
    const owner = req.auth!.userId;
    let quota = uploads.get(owner);
    if (!quota || quota.until < Date.now()) {
      quota = { count: 0, until: Date.now() + 3600000 };
      uploads.set(owner, quota);
    }
    if (quota.count >= 30)
      throw new VenueError(
        429,
        "Photo upload limit reached. Please try again later.",
      );
    const value = req.body.base64;
    if (
      typeof value !== "string" ||
      value.length > 7000000 ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(value)
    )
      throw new VenueError(400, "Select a JPEG, PNG or WebP photo under 5 MB.");
    const data = Buffer.from(value, "base64");
    let type = "",
      extension = "";
    if (data[0] === 255 && data[1] === 216 && data[2] === 255) {
      type = "image/jpeg";
      extension = "jpg";
    } else if (
      data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    ) {
      type = "image/png";
      extension = "png";
    } else if (
      data.subarray(0, 4).toString() === "RIFF" &&
      data.subarray(8, 12).toString() === "WEBP"
    ) {
      type = "image/webp";
      extension = "webp";
    }
    if (!type || data.length > 5242880)
      throw new VenueError(400, "Select a JPEG, PNG or WebP photo under 5 MB.");
    quota.count++;
    const path = `${owner}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabaseAdmin.storage
      .from("hub-photos")
      .upload(path, data, { contentType: type, upsert: false });
    if (error) throw new Error(error.message);
    return {
      url: supabaseAdmin.storage.from("hub-photos").getPublicUrl(path).data
        .publicUrl,
    };
  }, 201),
};
