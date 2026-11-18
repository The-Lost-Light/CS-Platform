import { defineHandler } from "void";
import { getUser } from "void/auth";

export const GET = defineHandler(() => {
  const user = getUser();
  return {
    user: user
      ? {
          id: user.id,
          studentId: user.email,
          name: user.name,
          role: "role" in user ? user.role : "user",
        }
      : null,
  };
});
