// Decisive comparison: instantiate BOTH plugin-hub's service and ours in the
// same harness and compare remoteMethods().
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const req = createRequire('C:/Users/momol/.dsh/profiles/web/noop.js');

const { Context } = await import(pathToFileURL(req.resolve('@deepseek-ai/cordis')).href);
const { remoteMethods } = await import(pathToFileURL(req.resolve('@deepseek-ai/dsh-typert-protocol')).href);

// ours
const oursUrl = pathToFileURL(req.resolve('dsh-restart-button')).href;
const { default: Ours } = await import(oursUrl);
const ctxOurs = new Context();
const ours = new Ours(ctxOurs, {});
console.log('ours remoteMethods:', JSON.stringify(remoteMethods(ours)));

// plugin-hub (works in the real server)
const hubUrl = pathToFileURL(req.resolve('dsh-plugin-hub')).href;
const { default: Hub } = await import(hubUrl);
const ctxHub = new Context();
const hub = new Hub(ctxHub, {});
console.log('plugin-hub remoteMethods count:', remoteMethods(hub).length);
console.log('plugin-hub remoteMethods:', JSON.stringify(remoteMethods(hub).map(m => m.method)));

// resolution identity check
console.log('plugin url:', oursUrl.replace('file:///', ''));
console.log('hub url:', hubUrl.replace('file:///', ''));
