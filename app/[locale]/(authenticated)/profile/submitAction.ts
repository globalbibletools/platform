"use server";

import { query } from "@/app/db";

export default async function submitAction(state: any) {
  console.log(state);
  try {
    await query(
      `UPDATE "User"
                SET "email" = $1,
                    "name" = $2,
                    "password" = $3
              WHERE "id" = $4`,
      [state.email, state.name, state.password, state.userId]
    );

    //   flash.success(t("users:profile_updated"));
  } catch (error) {
    //   flash.error(`${error}`);
  }
  console.log(
    "returned: " +
      JSON.stringify({ ...state, password: "", confirmPassword: "" })
  );
  return { ...state, password: "", confirmPassword: "" };
}
