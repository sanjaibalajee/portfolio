import { defineConfig } from "@trigger.dev/sdk";

export default defineConfig({
  // Trigger.dev dashboard > Project settings > Project ref. Not a secret.
  project: "proj_bklmtewbnxkqumlpccfy",
  dirs: ["./trigger"],
  maxDuration: 600,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 2_000,
      maxTimeoutInMs: 30_000,
      factor: 2,
      randomize: true,
    },
  },
});
