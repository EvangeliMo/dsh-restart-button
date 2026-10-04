/**
 * dsh-restart-button shared wire contracts (zod v4).
 *
 * Compiled twice, like dsh-plugin-hub's contracts:
 *  - host build: exported through `./typert` (the typert-loader registers the
 *    host face into `ctx.typert`);
 *  - client build: inlined into the `lib/client.js` bundle (the client mounts
 *    the same descriptors through `ctx.remote.$mount(TYPERT_REMOTE)`).
 */
import { z } from 'zod';

/** Generic operation receipt: ok flag + human message (+ optional detail). */
export const opResult = z.object({
  ok: z.boolean(),
  message: z.string(),
  detail: z.string().nullable(),
}).readonly();

// dsh >= 0.2.0 requires every strict codec to expose a create() factory; the
// runtime only validates its presence, so it returns an equivalent codec.
const strict = (typeSymbol, schema) => {
  const codec = { mode: 'strict', typeSymbol, schema };
  codec.create = () => strict(typeSymbol, schema);
  return codec;
};
const parameter = (name, schema) => ({ name, wire: name, source: 'json', codec: strict(`dsh-restart-button/types#${name}`, schema) });

const descriptor = (method, parameters, result) => ({
  id: `dsh-restart-button#dshRestart/${method}`,
  service: 'dshRestart',
  namespace: 'dshRestart',
  method,
  invocation: { kind: 'direct' },
  parameters,
  result: strict('dsh-restart-button/types#OpResult', result),
});

export const descriptors = [
  descriptor('restart', [], opResult),
];

/** Client Typert artifact mounted via ctx.remote.$mount. */
export const TYPERT_REMOTE = { package: 'dsh-restart-button', descriptors };

/** Host Typert artifact loaded from the package's `./typert` export. */
export const TYPERT = {
  package: 'dsh-restart-button',
  face: 'host',
  schemas: [],
  invocations: descriptors,
  model: { services: [], events: [], objects: [] },
};

export default TYPERT_REMOTE;
