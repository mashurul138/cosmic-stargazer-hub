import { z } from "zod";

export const observationSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters.").max(100, "Title must be 100 characters or fewer."),
  celestial_target: z
    .string()
    .min(2, "Celestial target must be at least 2 characters.")
    .max(100, "Celestial target must be 100 characters or fewer."),
  location: z
    .string()
    .min(2, "Location must be at least 2 characters.")
    .max(100, "Location must be 100 characters or fewer."),
  notes: z.string().min(5, "Notes must be at least 5 characters."),
  rating: z
    .number()
    .int("Rating must be a whole number.")
    .min(1, "Rating must be at least 1.")
    .max(5, "Rating cannot be more than 5."),
  equipment_id: z.string().uuid("Equipment selection must be a valid item.").nullable().optional(),
});

export type ObservationInput = z.infer<typeof observationSchema>;
