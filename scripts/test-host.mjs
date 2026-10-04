// Host-service instantiation test v2 — prints binding fields safely.
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const req = createRequire('C:/Users/momol/.dsh/profiles/web/noop.js');

const pluginUrl = pathToFileURL(req.resolve('dsh-restart-button')).href;
const cordisUrl = pathToFileURL(req.resolve('@deepseek-ai/cordis')).href;
const typertUrl = pathToFileURL(req.resolve('@deepseek-ai/dsh-typert-protocol')).href;

const { default: RestartService } = await import(pluginUrl);
const { Context } = await import(cordisUrl);
const { remoteMethods } = await import(typertUrl);

const ctx = new Context();
const svc = new RestartService(ctx, {});
console.log('service name:', svc.name);
console.log('typertRemote keys:', Object.keys(svc.typertRemote ?? {}));
console.log('typertRemote.serviceKey:', svc.typertRemote?.serviceKey);
console.log('typertRemote.namespace:', svc.typertRemote?.namespace);
console.log('typertRemote.service is svc:', svc.typertRemote?.service === svc);
console.log('remoteMethods:', JSON.stringify(remoteMethods(svc)));

const contractsUrl = pathToFileURL(req.resolve('dsh-restart-button/typert')).href;
const contracts = await import(contractsUrl);
console.log('TYPERT.face:', contracts.TYPERT.face);
console.log('TYPERT.invocations[0]:', JSON.stringify(contracts.TYPERT.invocations[0]));
console.log('TYPERT_REMOTE.descriptors:', contracts.TYPERT_REMOTE.descriptors.length);
console.log('ALL HOST CHECKS PASSED');
