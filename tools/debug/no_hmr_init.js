// WFM_INIT_SCRIPT: stops the Vite dev server's HMR socket from reloading the page when another session edits src/ mid-run (the long probes: rope_order_probe.mjs).
(() => {
    const Real = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        if (protocols === 'vite-hmr' || (Array.isArray(protocols) && protocols.includes('vite-hmr'))) { const t = new EventTarget(); t.close = () => {}; t.send = () => {}; t.readyState = 3; return t; }
        return new Real(url, protocols);
    };
    window.WebSocket.prototype = Real.prototype;
    Object.assign(window.WebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 });
})();
