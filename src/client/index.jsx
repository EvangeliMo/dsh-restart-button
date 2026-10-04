/**
 * dsh-restart-button browser half: an input-bar button beside the permission
 * selector (`conversation.input.left` slot collection, which the native
 * composer renders right next to the access/preset selector). Two-step
 * confirm prevents accidental restarts; the restart itself goes through the
 * dshRestart/restart Remote (api gateway, browser-origin trust fence), after
 * which the SSE client auto-reconnects (exponential backoff).
 */

const React = require('react');
const primitives = require('@deepseek-ai/dsh-client-ui-primitives');
const { Button, Tooltip, IconRefreshOutline16, IconWarningOutline16 } = primitives;
const { TYPERT_REMOTE } = require('../../lib/contracts.js');

export const name = 'dsh-restart-button';
export const inject = ['slots', 'locale', 'remote'];

const NS = 'dsh-restart-button';

const zh = {
  restart: '重启 dsh',
  confirm: '确认重启？',
  restarting: '重启中…',
  failed: '重启失败，请手动重启 dsh',
};
const en = {
  restart: 'Restart dsh',
  confirm: 'Confirm restart?',
  restarting: 'Restarting…',
  failed: 'Restart failed, restart dsh manually',
};

function makeApi(remote) {
  const r = remote.dshRestart;
  return {
    restart: async () => {
      const result = await r.restart();
      if (!result.ok) throw new Error(result.message);
      return result;
    },
  };
}

function RestartButton({ api, t }) {
  const [phase, setPhase] = React.useState('idle'); // idle | confirm | restarting
  React.useEffect(() => {
    if (phase !== 'confirm') return;
    const timer = setTimeout(() => setPhase('idle'), 4000);
    return () => clearTimeout(timer);
  }, [phase]);
  const s = (key) => (typeof t === 'function' ? t(key) : zh[key]);
  const label = phase === 'confirm' ? s('confirm') : phase === 'restarting' ? s('restarting') : s('restart');
  const onClick = async () => {
    if (phase === 'idle') {
      setPhase('confirm');
      return;
    }
    if (phase === 'confirm') {
      setPhase('restarting');
      try {
        await api.restart();
        // The server exits shortly; the SSE client reconnects on its own.
      } catch (error) {
        console.error('[dsh-restart-button] restart failed:', error);
        setPhase('idle');
      }
    }
  };
  const icon = phase === 'confirm'
    ? React.createElement(IconWarningOutline16, { size: 14 })
    : React.createElement(IconRefreshOutline16, { size: 14 });
  return React.createElement(
    Tooltip,
    { label, side: 'top', delayMs: 500 },
    React.createElement(
      Button,
      {
        type: 'button',
        variant: phase === 'confirm' ? 'outline' : 'ghost',
        size: 'md',
        'aria-label': label,
        disabled: phase === 'restarting',
        onClick,
        className: 'dsh-restart-button',
      },
      icon,
    ),
  );
}

async function apply(ctx) {
  const disposeRemote = await ctx.remote.$mount(TYPERT_REMOTE);
  const disposeLocale = ctx.locale.register(NS, { zh, en });
  const feature = ctx.inject(['remote.dshRestart'], (scope) => {
    const api = makeApi(scope.remote);
    scope.slots.inject('conversation.input.left', () => scope.slots.register({
      name: 'conversation.input.left',
      id: 'dsh-restart-button',
      order: 10,
      locale: NS,
      inject: () => ({ api }),
    }, RestartButton));
    return () => {};
  });
  return async () => {
    await feature.dispose();
    disposeLocale();
    await disposeRemote();
  };
}

export default { apply, inject };
