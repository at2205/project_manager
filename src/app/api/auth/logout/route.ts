import { route, json } from "@/lib/api";
import { COOKIE_NAME } from "@/lib/auth";

export const POST = route(
  async () => {
    const res = json({ ok: true });
    res.cookies.delete(COOKIE_NAME);
    return res;
  },
  { auth: false }
);
