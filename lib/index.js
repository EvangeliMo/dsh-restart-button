/**
 * dsh-restart-button host service.
 *
 * Exposes one Typert Remote, `dshRestart/restart`, callable from the web
 * client through the api gateway (browser-origin trust fence applies). The
 * method spawns a detached restart helper that waits for this process to exit
 * and then relaunches dsh web with the original entry + arguments, then exits
 * this process after a short settle window (>= the 200ms session-log write
 * batch delay, so no durable events are lost).
 *
 * The compiled decorator pattern below mirrors the shipped dsh-plugin-hub
 * host bundle (esbuild __esDecorate output) so it runs on stock Node without
 * transpilation.
 */

var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};

import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HELPER = join(dirname(fileURLToPath(import.meta.url)), 'restart-helper.mjs');
/** Settle window before exit: >= the 200ms session-log write batch delay. */
const EXIT_SETTLE_MS = 800;
/** Hard cap on concurrent restarts. */
const MAX_RESTARTS_PER_PROCESS = 3;

let RestartService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _restart_decorators;
    return class RestartService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _restart_decorators = [Remote('restart')];
            __esDecorate(this, null, _restart_decorators, { kind: "method", name: "restart", static: false, private: false, access: { has: obj => "restart" in obj, get: obj => obj.restart }, metadata: _metadata }, null, _instanceExtraInitializers);
        }
        static inject = [];
        /** Number of restarts already triggered by this process instance. */
        restarts = 0;

        constructor(ctx, config = {}) {
            super(ctx, 'dshRestart');
            // Run the Remote-decorator extra initializers (esbuild's compiled
            // pattern attaches the method markers to the prototype here).
            __runInitializers(this, _instanceExtraInitializers);
            void config;
            this.restarts = 0;
        }

        /**
         * Trigger a quick dsh restart: spawn the detached helper, then exit
         * this process after a short settle window. The web client answers the
         * RPC first (exit is deferred), then auto-reconnects once the server
         * is back (SSE exponential backoff).
         * @returns {Promise<{ok: boolean, message: string, detail: string | null}>}
         */
        async restart() {
            if (this.restarts >= MAX_RESTARTS_PER_PROCESS) {
                return { ok: false, message: `每个进程最多允许 ${MAX_RESTARTS_PER_PROCESS} 次重启，请手动重启 dsh`, detail: null };
            }
            this.restarts += 1;
            const payload = JSON.stringify({ execPath: process.execPath, args: process.argv.slice(1) });
            try {
                const child = spawn(process.execPath, [HELPER, String(process.pid)], {
                    detached: true,
                    stdio: 'inherit',
                    windowsHide: false,
                    env: { ...process.env, DSH_RESTART_ARGS: payload },
                });
                child.on('error', (error) => {
                    console.error('[dsh-restart-button] failed to spawn restart helper:', error.message);
                });
                child.unref();
                // Defer the exit so the RPC response and the last session-log
                // batch (<= 200ms) flush first.
                setTimeout(() => process.exit(0), EXIT_SETTLE_MS);
                return { ok: true, message: '重启已触发，页面将自动重连', detail: null };
            }
            catch (error) {
                this.restarts -= 1;
                return { ok: false, message: `重启失败: ${error instanceof Error ? error.message : String(error)}`, detail: null };
            }
        }
    };
})();
export { RestartService };
export default RestartService;
