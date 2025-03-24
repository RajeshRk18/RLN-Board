import 'core-js/proposals/json-parse-with-source.js';
import { webcrypto } from 'node:crypto';
import * as $fs from 'node:fs';
import $mime from 'mime/lite';
import $xmlhttprequest from 'xmlhttprequest-ssl';
import $request from 'sync-request';
import * as $worker from 'node:worker_threads';
import * as $os from 'node:os';

if (globalThis.crypto == null) {
    globalThis.crypto = webcrypto;
}

const oldFetch = globalThis.fetch;
let supports = null;
async function checkFetch() {
    try {
        await oldFetch(new URL("file:"));
        return true;
    }
    catch (e) {
        return false;
    }
}
async function supportsFetch() {
    if (supports === null) {
        supports = checkFetch();
    }
    return await supports;
}
// We always polyfill fetch because Node's fetch doesn't support file URLs.
globalThis.fetch = async function (resource, options) {
    const request = new Request(resource, options);
    const url = new URL(request.url);
    if (!(await supportsFetch()) && url.protocol === "file:") {
        const readStream = $fs.createReadStream(url);
        const headers = {};
        const type = $mime.getType(url.pathname);
        if (type) {
            headers["Content-Type"] = type;
        }
        return new Response(readStream, {
            status: 200,
            statusText: "OK",
            headers,
        });
    }
    else {
        return await oldFetch(request);
    }
};

// @ts-ignore
if (globalThis.XMLHttpRequest == null) {
    globalThis.XMLHttpRequest = class extends $xmlhttprequest.XMLHttpRequest {
        // We have to override the methods inside of the `constructor`
        // because `xmlhttprequest-ssl` doesn't use a regular class,
        // instead it defines all of the methods inside of the constructor.
        constructor(...args) {
            super(...args);
            const open = this.open;
            const send = this.send;
            let _async = true;
            let _url = null;
            let _mime = "text/xml";
            function reset() {
                _async = true;
                _url = null;
                _mime = "text/xml";
            }
            this.open = function (method, url, async, user, password) {
                // Special behavior for synchronous requests
                if (method === "GET" && !async && !user && !password) {
                    _async = false;
                    _url = url;
                    // Default to the normal polyfill for async requests
                }
                else {
                    reset();
                    return open.call(this, method, url, async, user, password);
                }
            };
            this.send = function (data) {
                if (_async) {
                    return send.call(this, data);
                    // Use `sync-request` for synchronous requests.
                }
                else {
                    const response = $request("GET", _url, {
                        headers: {
                            "Content-Type": _mime,
                        }
                    });
                    const buffer = response.body.buffer;
                    const responseText = new TextDecoder("iso-8859-5", { fatal: true }).decode(buffer);
                    this.status = 200;
                    this.response = this.responseText = responseText;
                    reset();
                }
            };
            this.overrideMimeType = function (mime) {
                _mime = mime;
            };
        }
    };
}

// This is technically not a part of the Worker polyfill,
// but Workers are used for multi-threading, so this is often
// needed when writing Worker code.
if (globalThis.navigator == null) {
    globalThis.navigator = {
        hardwareConcurrency: $os.cpus().length,
    };
}
if (globalThis.Worker == null) {
    globalThis.Worker = class Worker extends EventTarget {
        _worker;
        constructor(url, options) {
            super();
            if (url instanceof URL) {
                if (url.protocol !== "file:") {
                    throw new Error("Worker only supports file: URLs");
                }
                url = url.href;
            }
            else {
                throw new Error("Filepaths are unreliable, use `new URL(\"...\", import.meta.url)` instead.");
            }
            if (!options || options.type !== "module") {
                throw new Error("Workers must use \`type: \"module\"\`");
            }
            const code = `
                import("node:worker_threads")
                    .then(({ workerData }) => {
                        return import(workerData.polyfill)
                            .then(() => import(workerData.url))
                    })
                    .catch((e) => {
                        // TODO maybe it should send a message to the parent?
                        console.error(e.stack);
                    });
            `;
            this._worker = new $worker.Worker(code, {
                eval: true,
                workerData: {
                    url,
                    polyfill: new URL("node-polyfill.js", import.meta.url).href,
                },
            });
            this._worker.on("message", (data) => {
                this.dispatchEvent(new MessageEvent("message", { data }));
            });
            this._worker.on("messageerror", (error) => {
                throw new Error("UNIMPLEMENTED");
            });
            this._worker.on("error", (error) => {
                // TODO attach the error to the event somehow
                const event = new Event("error");
                this.dispatchEvent(event);
            });
        }
        set onmessage(f) {
            throw new Error("UNIMPLEMENTED");
        }
        set onmessageerror(f) {
            throw new Error("UNIMPLEMENTED");
        }
        set onerror(f) {
            throw new Error("UNIMPLEMENTED");
        }
        postMessage(value, transfer) {
            this._worker.postMessage(value, transfer);
        }
        terminate() {
            this._worker.terminate();
        }
        // This is Node-specific, it allows the process to exit
        // even if the Worker is still running.
        unref() {
            this._worker.unref();
        }
    };
}
if (!$worker.isMainThread) {
    const globals = globalThis;
    // This is used to create the onmessage, onmessageerror, and onerror setters
    const makeSetter = (prop, event) => {
        let oldvalue;
        Object.defineProperty(globals, prop, {
            get() {
                return oldvalue;
            },
            set(value) {
                if (oldvalue) {
                    globals.removeEventListener(event, oldvalue);
                }
                oldvalue = value;
                if (oldvalue) {
                    globals.addEventListener(event, oldvalue);
                }
            },
        });
    };
    // This makes sure that `f` is only run once
    const memoize = (f) => {
        let run = false;
        return () => {
            if (!run) {
                run = true;
                f();
            }
        };
    };
    // We only start listening for messages / errors when the worker calls addEventListener
    const startOnMessage = memoize(() => {
        $worker.parentPort.on("message", (data) => {
            workerEvents.dispatchEvent(new MessageEvent("message", { data }));
        });
    });
    const startOnMessageError = memoize(() => {
        throw new Error("UNIMPLEMENTED");
    });
    const startOnError = memoize(() => {
        $worker.parentPort.on("error", (data) => {
            workerEvents.dispatchEvent(new Event("error"));
        });
    });
    // Node workers don't have top-level events, so we have to make our own
    const workerEvents = new EventTarget();
    globals.close = () => {
        process.exit();
    };
    globals.addEventListener = (type, callback, options) => {
        workerEvents.addEventListener(type, callback, options);
        if (type === "message") {
            startOnMessage();
        }
        else if (type === "messageerror") {
            startOnMessageError();
        }
        else if (type === "error") {
            startOnError();
        }
    };
    globals.removeEventListener = (type, callback, options) => {
        workerEvents.removeEventListener(type, callback, options);
    };
    function postMessage(value, transfer) {
        $worker.parentPort.postMessage(value, transfer);
    }
    globals.postMessage = postMessage;
    makeSetter("onmessage", "message");
    makeSetter("onmessageerror", "messageerror");
    makeSetter("onerror", "error");
}

if (!globalThis.self) {
    globalThis.self = globalThis;
}
//# sourceMappingURL=node-polyfill.js.map
