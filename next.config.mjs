import createNextIntlPlugin from "next-intl/plugin";
import { merge } from "webpack-merge";

const withNextIntl = createNextIntlPlugin("./src/shared/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer, nextRuntime }) => {
    if (isServer && nextRuntime === "nodejs") {
      return merge(config, {
        externals: ["@node-rs/argon2", "@node-rs/bcrypt"],
      });
    } else {
      return config;
    }
  },
  async redirects() {
    return [
      {
        source: "/:locale(\\w{2})/interlinear/:rest*",
        destination: "/:locale/translate/:rest*",
        permanent: true,
      },
    ];
  },
  output: "standalone",
  serverExternalPackages: ["@opentelemetry/sdk-node"],
};

export default withNextIntl(nextConfig);
