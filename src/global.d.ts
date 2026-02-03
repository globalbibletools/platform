import en from "./messages/en.json" assert { type: "json" };

declare module "next-intl" {
  interface AppConfig {
    Messages: typeof en;
  }
}
