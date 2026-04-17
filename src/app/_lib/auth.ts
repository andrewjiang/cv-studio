import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { Pool } from "pg";

let authPool: Pool | null = null;

export const auth = betterAuth({
  baseURL: getAuthBaseUrl(),
  database: process.env.DATABASE_URL ? getAuthPool() : undefined,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [nextCookies()],
  secret: getAuthSecret(),
  socialProviders: getSocialProviders(),
  trustedOrigins: getTrustedOrigins(),
  account: {
    fields: {
      accessToken: "access_token",
      accessTokenExpiresAt: "access_token_expires_at",
      accountId: "account_id",
      createdAt: "created_at",
      idToken: "id_token",
      providerId: "provider_id",
      refreshToken: "refresh_token",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      updatedAt: "updated_at",
      userId: "user_id",
    },
    modelName: "auth_accounts",
  },
  session: {
    fields: {
      createdAt: "created_at",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      updatedAt: "updated_at",
      userAgent: "user_agent",
      userId: "user_id",
    },
    modelName: "auth_sessions",
  },
  user: {
    fields: {
      createdAt: "created_at",
      emailVerified: "email_verified",
      updatedAt: "updated_at",
    },
    modelName: "auth_users",
  },
  verification: {
    fields: {
      createdAt: "created_at",
      expiresAt: "expires_at",
      updatedAt: "updated_at",
    },
    modelName: "auth_verifications",
  },
});

export type TinyCvAuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

export function getAuthPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for Tiny CV accounts.");
  }

  authPool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    ssl: getAuthPoolSslConfig(process.env.DATABASE_URL),
  });

  return authPool;
}

function getAuthPoolSslConfig(databaseUrl: string) {
  const url = databaseUrl.toLowerCase();
  const override = process.env.TINYCV_PG_SSL_REJECT_UNAUTHORIZED?.toLowerCase();

  if (override === "false") {
    return { rejectUnauthorized: false };
  }

  if (
    url.includes("sslmode=require") ||
    url.includes("pooler.supabase.com") ||
    url.includes(".supabase.com")
  ) {
    return { rejectUnauthorized: false };
  }

  return undefined;
}

function getAuthBaseUrl() {
  return (
    process.env.BETTER_AUTH_URL?.trim() ||
    process.env.TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_TINYCV_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    `http://localhost:${process.env.PORT || "3000"}`
  );
}

function getAuthSecret() {
  return (
    process.env.BETTER_AUTH_SECRET?.trim() ||
    process.env.TINYCV_PLATFORM_SECRET?.trim() ||
    (process.env.VERCEL ? undefined : "tinycv-local-better-auth-secret-do-not-use-in-production")
  );
}

function getTrustedOrigins() {
  return [
    process.env.BETTER_AUTH_URL,
    process.env.TINYCV_APP_URL,
    process.env.NEXT_PUBLIC_TINYCV_APP_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
    `http://localhost:${process.env.PORT || "3000"}`,
    "http://localhost:3101",
  ].filter((value): value is string => Boolean(value?.trim()));
}

function getSocialProviders() {
  return {
    ...(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
      ? {
        github: {
          clientId: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
        },
      }
      : {}),
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        },
      }
      : {}),
  };
}
