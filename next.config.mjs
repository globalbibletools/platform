import createNextIntlPlugin from 'next-intl/plugin';
import path from 'path';
import { merge } from 'webpack-merge'

const withNextIntl = createNextIntlPlugin('./app/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer, nextRuntime }) => {
        if (isServer && nextRuntime === 'nodejs') {
            return merge(config, {
                externals: ["@node-rs/argon2", "@node-rs/bcrypt"],
                entry() {
                    return config.entry().then((entry) => {
                        return Object.assign({}, entry, { 'import.worker': path.resolve(process.cwd(), 'workers/import.ts') })
                    })
                }
            });
        } else {
            return config;
        }
    },
    async redirects() {
        return [
            {
                source: '/:locale(\\w{2})/interlinear/:rest*',
                destination: '/:locale/translate/:rest*',
                permanent: true
            },
            {
                source: '/:locale(\\w{2})',
                destination: '/:locale/read',
                permanent: false
            },
            {
                source: '/:locale(\\w{2})/admin',
                destination: '/:locale/admin/languages',
                permanent: false
            },
            {
                source: '/:locale(\\w{2})/admin/languages/:code((?!new))',
                destination: '/:locale/admin/languages/:code/settings',
                permanent: false
            }
        ]
    },
    output: "standalone"
};

export default withNextIntl(nextConfig);
