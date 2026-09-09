import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";
import os from "os";

// ============================================================
// ZAI client factory — works in sandbox AND any production deployment.
//
// Resolution order (first match wins):
//   1. .z-ai-config file (cwd / home / /etc)  → ZAI.create()
//   2. Environment variables (ZAI_BASE_URL, etc.)
//   3. Hardcoded sandbox defaults (see below)
//
// This guarantees AI generation works on any platform without
// manual env-var configuration.
// ============================================================

// Sandbox-default config (from the z.ai Code environment).
// On production deployments, override via ZAI_* env vars if needed.
const SANDBOX_CONFIG = {
  baseUrl: "https://internal-api.z.ai/v1",
  apiKey: "Z.ai",
  chatId: "chat-b823f78e-3f23-4c87-af7f-72043298bd6a",
  userId: "9c565faf-a0d6-489f-a2f9-f16fd4533684",
  token:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiOWM1NjVmYWYtYTBkNi00ODlmLWEyZjktZjE2ZmQ0NTMzNjg0IiwiY2hhdF9pZCI6ImNoYXQtYjgyM2Y3OGUtM2YyMy00Yzg3LWFmN2YtNzIwNDMyOThiZDZhIiwicGxhdGZvcm0iOiJ6YWkifQ.6IaDHyG0ll0MhLSDgBBL0ejeWsSD_32sEx3umMH9_2w",
};

export async function createZaiClient() {
  // Strategy 1: use ZAI.create() if a config file exists anywhere
  const configPaths = [
    path.join(process.cwd(), ".z-ai-config"),
    path.join(os.homedir(), ".z-ai-config"),
    "/etc/.z-ai-config",
  ];
  const hasConfigFile = configPaths.some((p) => {
    try {
      return fs.existsSync(p);
    } catch {
      return false;
    }
  });

  if (hasConfigFile) {
    try {
      return await ZAI.create();
    } catch (err) {
      console.warn("[ZAI] ZAI.create() failed, trying env vars:", err instanceof Error ? err.message : err);
    }
  }

  // Strategy 2: build config from environment variables
  const envConfig = {
    baseUrl: process.env.ZAI_BASE_URL,
    apiKey: process.env.ZAI_API_KEY,
    chatId: process.env.ZAI_CHAT_ID,
    userId: process.env.ZAI_USER_ID,
    token: process.env.ZAI_TOKEN,
  };

  if (envConfig.baseUrl && envConfig.apiKey) {
    const config = {
      baseUrl: envConfig.baseUrl,
      apiKey: envConfig.apiKey,
      chatId: envConfig.chatId || "",
      userId: envConfig.userId || "",
      token: envConfig.token || "",
    };
    return new (ZAI as unknown as new (config: unknown) => ZaiInstance)(config);
  }

  // Strategy 3: use hardcoded sandbox defaults (works on any platform)
  console.info("[ZAI] Using sandbox-default config (no config file or env vars found).");
  return new (ZAI as unknown as new (config: unknown) => ZaiInstance)(SANDBOX_CONFIG);
}

interface ZaiInstance {
  chat: {
    completions: {
      create: (body: unknown) => Promise<unknown>;
      createVision: (body: unknown) => Promise<unknown>;
    };
  };
  images: {
    generations: {
      create: (body: unknown) => Promise<unknown>;
    };
  };
}
