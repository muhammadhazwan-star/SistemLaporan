import ZAI from "z-ai-web-dev-sdk";
import fs from "fs";
import path from "path";
import os from "os";

// ============================================================
// ZAI client factory — works in sandbox AND production deployments.
//
// The z-ai-web-dev-sdk's ZAI.create() reads config from a .z-ai-config file
// at 3 fixed paths (cwd, home, /etc). On serverless platforms (Vercel),
// none of these are writable, so ZAI.create() fails.
//
// This wrapper:
//   1. Tries ZAI.create() first (works when the config file exists).
//   2. Falls back to `new ZAI(config)` with credentials from environment
//      variables — works on any platform.
//
// Required env vars for production:
//   ZAI_BASE_URL   e.g. https://internal-api.z.ai/v1
//   ZAI_API_KEY    e.g. Z.ai
//   ZAI_CHAT_ID    e.g. chat-xxxxxxxx
//   ZAI_USER_ID    e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
//   ZAI_TOKEN      the JWT token string
// ============================================================

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
      console.warn("[ZAI] ZAI.create() failed, falling back to env vars:", err instanceof Error ? err.message : err);
    }
  }

  // Strategy 2: build config from environment variables
  const baseUrl = process.env.ZAI_BASE_URL || process.env.NEXT_PUBLIC_ZAI_BASE_URL;
  const apiKey = process.env.ZAI_API_KEY || process.env.NEXT_PUBLIC_ZAI_API_KEY;
  const chatId = process.env.ZAI_CHAT_ID || process.env.NEXT_PUBLIC_ZAI_CHAT_ID;
  const userId = process.env.ZAI_USER_ID || process.env.NEXT_PUBLIC_ZAI_USER_ID;
  const token = process.env.ZAI_TOKEN || process.env.NEXT_PUBLIC_ZAI_TOKEN;

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Konfigurasi AI tidak dijumpai. Setkan ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_USER_ID, dan ZAI_TOKEN dalam environment variables, ATAU cipta fail .z-ai-config."
    );
  }

  // Instantiate the ZAI class directly with the config object
  // (bypasses file-based config loading)
  const config = { baseUrl, apiKey, chatId: chatId || "", userId: userId || "", token: token || "" };
  return new (ZAI as unknown as new (config: ZaiConfig) => ZaiInstance)(config);
}

interface ZaiConfig {
  baseUrl: string;
  apiKey: string;
  chatId?: string;
  userId?: string;
  token?: string;
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
