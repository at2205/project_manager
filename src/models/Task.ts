import mongoose, { Schema, InferSchemaType, Model } from "mongoose";
import { TASK_STATUSES } from "@/lib/validators";

const taskSchema = new Schema(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    number: { type: Number }, // per-project issue number
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    status: { type: String, enum: TASK_STATUSES, default: "todo" },
    dueDate: { type: Date, default: null },
    completedAt: { type: Date, default: null }, // set when the task moves to done, cleared when it leaves done
  },
  { timestamps: true }
);

export type ITask = InferSchemaType<typeof taskSchema>;
export const Task: Model<ITask> = mongoose.models.Task || mongoose.model<ITask>("Task", taskSchema);
