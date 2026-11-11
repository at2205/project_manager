import { route, json, readBody, HttpError } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { verifyPassword } from "@/lib/password";
import { clearFailures, recordFailure, retryAfterSeconds } from "@/lib/rateLimit";
import { signToken, COOKIE_NAME, cookieOptions } from "@/lib/auth";
import { User } from "@/models/User";

export const POST = route(
  async (req) => {
    const { email, password } = loginSchema.parse(await readBody(req));

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
    const limitKey = `${ip}|${email}`;
    const wait = retryAfterSeconds(limitKey);
    if (wait > 0) {
      throw new HttpError(429, `Too many failed login attempts. Try again in ${Math.ceil(wait / 60)} minute(s).`);
    }

    const user = await User.findOne({ email }).select("+password");
    // Always does one bcrypt comparison (even for unknown emails) and returns the same message for both failures.
    const ok = await verifyPassword(password, user?.password);
    if (!user || !ok) {
      recordFailure(limitKey);
      throw new HttpError(401, "Invalid email or password");
    }
    clearFailures(limitKey);

    const token = await signToken(user.id);
    const res = json({ user: { id: user.id, name: user.name, email: user.email }, token });
    res.cookies.set(COOKIE_NAME, token, cookieOptions);
    return res;
  },
  { auth: false }
);
