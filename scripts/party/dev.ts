import { spawn } from 'node:child_process';
const commands = [
  [process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--turbopack']],
  [process.execPath, ['--watch', '--import', 'tsx', 'scripts/party/server.ts']],
] as const;
const processes = commands.map(([command, args]) =>
  spawn(command, [...args], { stdio: 'inherit', env: process.env }),
);
function stop() {
  processes.forEach((p) => p.kill('SIGTERM'));
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
processes.forEach((p) =>
  p.on('exit', (code) => {
    stop();
    process.exitCode = code ?? 0;
  }),
);
