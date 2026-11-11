import { z } from "zod";
import { passwordIssues } from "./passwordPolicy";
import { KEY_PATTERN } from "./projectKey";

export const TASK_STATUSES = ["todo", "in-progress", "done"] as const;

export const signupSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().superRefine((p, ctx) => {
    for (const message of passwordIssues(p)) ctx.addIssue({ code: "custom", message });
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(1, "Password is required").max(200),
});

export const projectSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(1000).default(""),
});

export const projectCreateSchema = projectSchema.extend({
  key: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => v === "" || KEY_PATTERN.test(v), "Key must be 2–10 characters (letters/numbers) and start with a letter")
    .optional(),
});

const dueDate = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v, ctx) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const d = new Date(v);
    if (isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Invalid due date" });
      return z.NEVER;
    }
    return d;
  });

export const taskSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  description: z.string().trim().max(2000).default(""),
  status: z.enum(TASK_STATUSES).default("todo"),
  dueDate,
});

export const taskUpdateSchema = taskSchema.partial();
