import { createApp } from "./app";

async function main(): Promise<void> {
  const app = await createApp({ logger: true });
  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOST ?? "127.0.0.1";

  await app.listen({ port, host });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
