import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const projectSchema = new Schema(
  {
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    key: { type: String, trim: true, uppercase: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    taskSeq: { type: Number, default: 0 }, // last issue number handed out (for keys like WEB-12)
  },
  { timestamps: true }
);

// Project keys are unique per owner (only enforced when a key exists, so legacy projects still work).
projectSchema.index({ owner: 1, key: 1 }, { unique: true, partialFilterExpression: { key: { $type: "string" } } });

export type IProject = InferSchemaType<typeof projectSchema>;
export const Project: Model<IProject> = mongoose.models.Project || mongoose.model<IProject>("Project", projectSchema);
