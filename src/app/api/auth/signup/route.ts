import { route, json, readBody, HttpError } from "@/lib/api";
import { signupSchema } from "@/lib/validators";
import { hashPassword } from "@/lib/password";
import { signToken, COOKIE_NAME, cookieOptions } from "@/lib/auth";
import { User } from "@/models/User";

export const POST = route(
  async (req) => {
    const { name, email, password } = signupSchema.parse(await readBody(req));
    if (await User.exists({ email })) throw new HttpError(409, "Email is already registered");

    let user;
    try {
      user = await User.create({ name, email, password: await hashPassword(password) });
    } catch (e) {
      // Two simultaneous signups with the same email: the unique index decides.
      if ((e as { code?: number }).code === 11000) throw new HttpError(409, "Email is already registered");
      throw e;
    }
    const token = await signToken(user.id);

    const res = json({ user: { id: user.id, name: user.name, email: user.email }, token }, 201);
    res.cookies.set(COOKIE_NAME, token, cookieOptions);
    return res;
  },
  { auth: false }
);
