import mongoose, { Schema, InferSchemaType, Model } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema>;
export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", userSchema);
