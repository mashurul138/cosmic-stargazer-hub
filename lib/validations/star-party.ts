import { z } from "zod";

export const starPartySchema = z.object({
  title: z
    .string({ error: "Title is required." })
    .trim()
    .min(3, "Title must be at least 3 characters.")
    .max(255, "Title must not exceed 255 characters."),
  description: z
    .string({ error: "Description is required." })
    .trim()
    .min(5, "Description must be at least 5 characters."),
  location_name: z
    .string({ error: "Location name is required." })
    .trim()
    .min(2, "Location name must be at least 2 characters.")
    .max(255, "Location name must not exceed 255 characters."),
  latitude: z
    .number({ error: "Latitude is required." })
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90, "Latitude must be between -90 and 90."),
  longitude: z
    .number({ error: "Longitude is required." })
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
  event_date: z.string({ error: "Event date is required." }).refine(
    (val) => {
      const parsed = Date.parse(val);
      return !isNaN(parsed);
    },
    { message: "A valid event date and time is required." },
  ),
  max_attendees: z
    .number({ error: "Maximum attendees is required." })
    .int("Maximum attendees must be an integer.")
    .positive("Maximum attendees must be greater than zero.")
    .default(20),
});

export type StarPartyInput = z.infer<typeof starPartySchema>;
