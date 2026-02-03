import createNextIntlPlugin from "next-intl/plugin";
import { merge } from "webpack-merge";

const withNextIntl = createNextIntlPlugin("./shared/i18n/routing.ts");

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
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@opentelemetry/sdk-node"],
  },
};

export default withNextIntl(nextConfig);
