import { z } from "zod";

export const equipmentTypeSchema = z.enum(["telescope", "eyepiece", "binoculars"]);

export const equipmentSchema = z.object({
  name: z.string().trim().min(2, "Equipment name must be at least 2 characters.").max(255, "Equipment name must be 255 characters or fewer."),
  type: equipmentTypeSchema,
  aperture_mm: z.number().finite("Aperture must be a finite number.").positive("Aperture must be greater than 0."),
  focal_length_mm: z.number().finite("Focal length must be a finite number.").positive("Focal length must be greater than 0."),
  eyepiece_focal_length_mm: z.number().finite("Eyepiece focal length must be a finite number.").positive("Eyepiece focal length must be greater than 0.").nullable().optional(),
});

export type EquipmentInput = z.infer<typeof equipmentSchema>;
