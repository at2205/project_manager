import { route, json, HttpError } from "@/lib/api";
import { User } from "@/models/User";

export const GET = route(async (_req, _ctx, userId) => {
  const user = await User.findById(userId);
  if (!user) throw new HttpError(401, "User no longer exists");
  return json({ user: { id: user.id, name: user.name, email: user.email } });
});

// Always evaluated per request (never prerendered at build time).
export const dynamic = "force-dynamic";
