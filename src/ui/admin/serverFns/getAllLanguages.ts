import { getAllLanguagesReadModel } from "@/ui/admin/readModels/getAllLanguagesReadModel";
import { createServerFn } from "@tanstack/react-start";

export const getAllLanguages = createServerFn().handler(async () => {
  const languages = await getAllLanguagesReadModel();
  return languages;
});
