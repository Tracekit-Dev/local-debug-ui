#!/usr/bin/env node

const { Command } = require('commander');
const open = require('open');
const LocalUIServer = require('../server/index');

const program = new Command();

program
  .name('tracekit-local')
  .description('TraceKit Local UI - Debug traces locally without cloud account')
  .version('0.1.0')
  .option('-p, --port <port>', 'Port to run on', '9999')
  .option('--no-open', 'Do not auto-open browser')
  .action(async (options) => {
    const server = new LocalUIServer({
      port: parseInt(options.port)
    });

    await server.start();

    // Auto-open browser if not disabled
    if (options.open && process.env.TRACEKIT_NO_BROWSER !== '1') {
      setTimeout(() => {
        open(`http://localhost:${server.port}`);
      }, 1000);
    }
  });

program.parse();
