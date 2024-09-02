"use server";

import { query } from "@/app/db";

export default async function submitAction(state: any) {
  try {
    if (state.user) {
      await query(
        `UPDATE "User"
                SET "email" = $1,
                    "name" = $2,
                    "password" = $3
              WHERE "id" = $4`,
        [state.email, state.name, state.password, state.user.id]
      );
    }

    //   flash.success(t("users:profile_updated"));
  } catch (error) {
    //   flash.error(`${error}`);
  }
  return { ...state, password: "", confirmPassword: "" };
}
