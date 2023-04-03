'use strict';
window.DOMHandler = class {
    constructor(c, a) {
        this._iRuntime = c;
        this._componentId = a;
        this._hasTickCallback = !1;
        this._tickCallback = () => this.Tick()
    }
    Attach() {}
    PostToRuntime(c, a, b, e) {
        this._iRuntime.PostToRuntimeComponent(this._componentId, c, a, b, e)
    }
    PostToRuntimeAsync(c, a, b, e) {
        return this._iRuntime.PostToRuntimeComponentAsync(this._componentId, c, a, b, e)
    }
    _PostToRuntimeMaybeSync(c, a, b) {
        this._iRuntime.UsesWorker() ? this.PostToRuntime(c, a, b) : this._iRuntime._GetLocalRuntime()._OnMessageFromDOM({
            type: "event",
            component: this._componentId,
            handler: c,
            dispatchOpts: b || null,
            data: a,
            responseId: null
        })
    }
    AddRuntimeMessageHandler(c, a) {
        this._iRuntime.AddRuntimeComponentMessageHandler(this._componentId, c, a)
    }
    AddRuntimeMessageHandlers(c) {
        for (const [a, b] of c) this.AddRuntimeMessageHandler(a, b)
    }
    GetRuntimeInterface() {
        return this._iRuntime
    }
    GetComponentID() {
        return this._componentId
    }
    _StartTicking() {
        this._hasTickCallback || (this._iRuntime._AddRAFCallback(this._tickCallback), this._hasTickCallback = !0)
    }
    _StopTicking() {
        this._hasTickCallback && (this._iRuntime._RemoveRAFCallback(this._tickCallback), this._hasTickCallback = !1)
    }
    Tick() {}
};
window.RateLimiter = class {
    constructor(c, a) {
        this._callback = c;
        this._interval = a;
        this._timerId = -1;
        this._lastCallTime = -Infinity;
        this._timerCallFunc = () => this._OnTimer();
        this._canRunImmediate = this._ignoreReset = !1
    }
    SetCanRunImmediate(c) {
        this._canRunImmediate = !!c
    }
    Call() {
        if (-1 === this._timerId) {
            var c = Date.now(),
                a = c - this._lastCallTime,
                b = this._interval;
            a >= b && this._canRunImmediate ? (this._lastCallTime = c, this._RunCallback()) : this._timerId = self.setTimeout(this._timerCallFunc, Math.max(b - a, 4))
        }
    }
    _RunCallback() {
        this._ignoreReset = !0;
        this._callback();
        this._ignoreReset = !1
    }
    Reset() {
        this._ignoreReset || (this._CancelTimer(), this._lastCallTime = Date.now())
    }
    _OnTimer() {
        this._timerId = -1;
        this._lastCallTime = Date.now();
        this._RunCallback()
    }
    _CancelTimer() {
        -1 !== this._timerId && (self.clearTimeout(this._timerId), this._timerId = -1)
    }
    Release() {
        this._CancelTimer();
        this._timerCallFunc = this._callback = null
    }
};
"use strict";
window.DOMElementHandler = class extends self.DOMHandler {
    constructor(c, a) {
        super(c, a);
        this._elementMap = new Map;
        this._autoAttach = !0;
        this.AddRuntimeMessageHandlers([
            ["create", b => this._OnCreate(b)],
            ["destroy", b => this._OnDestroy(b)],
            ["set-visible", b => this._OnSetVisible(b)],
            ["update-position", b => this._OnUpdatePosition(b)],
            ["update-state", b => this._OnUpdateState(b)],
            ["focus", b => this._OnSetFocus(b)],
            ["set-css-style", b => this._OnSetCssStyle(b)],
            ["set-attribute", b => this._OnSetAttribute(b)],
            ["remove-attribute",
                b => this._OnRemoveAttribute(b)
            ]
        ]);
        this.AddDOMElementMessageHandler("get-element", b => b)
    }
    SetAutoAttach(c) {
        this._autoAttach = !!c
    }
    AddDOMElementMessageHandler(c, a) {
        this.AddRuntimeMessageHandler(c, b => {
            const e = this._elementMap.get(b.elementId);
            return a(e, b)
        })
    }
    _OnCreate(c) {
        const a = c.elementId,
            b = this.CreateElement(a, c);
        this._elementMap.set(a, b);
        b.style.boxSizing = "border-box";
        c.isVisible || (b.style.display = "none");
        c = this._GetFocusElement(b);
        c.addEventListener("focus", e => this._OnFocus(a));
        c.addEventListener("blur", e => this._OnBlur(a));
        this._autoAttach && document.body.appendChild(b)
    }
    CreateElement(c, a) {
        throw Error("required override");
    }
    DestroyElement(c) {}
    _OnDestroy(c) {
        c = c.elementId;
        const a = this._elementMap.get(c);
        this.DestroyElement(a);
        this._autoAttach && a.parentElement.removeChild(a);
        this._elementMap.delete(c)
    }
    PostToRuntimeElement(c, a, b) {
        b || (b = {});
        b.elementId = a;
        this.PostToRuntime(c, b)
    }
    _PostToRuntimeElementMaybeSync(c, a, b) {
        b || (b = {});
        b.elementId = a;
        this._PostToRuntimeMaybeSync(c, b)
    }
    _OnSetVisible(c) {
        this._autoAttach && (this._elementMap.get(c.elementId).style.display = c.isVisible ? "" : "none")
    }
    _OnUpdatePosition(c) {
        if (this._autoAttach) {
            var a = this._elementMap.get(c.elementId);
            a.style.left = c.left + "px";
            a.style.top = c.top + "px";
            a.style.width = c.width + "px";
            a.style.height = c.height + "px";
            c = c.fontSize;
            null !== c && (a.style.fontSize = c + "em")
        }
    }
    _OnUpdateState(c) {
        const a = this._elementMap.get(c.elementId);
        this.UpdateState(a, c)
    }
    UpdateState(c, a) {
        throw Error("required override");
    }
    _GetFocusElement(c) {
        return c
    }
    _OnFocus(c) {
        this.PostToRuntimeElement("elem-focused", c)
    }
    _OnBlur(c) {
        this.PostToRuntimeElement("elem-blurred", c)
    }
    _OnSetFocus(c) {
        const a = this._GetFocusElement(this._elementMap.get(c.elementId));
        c.focus ? a.focus() : a.blur()
    }
    _OnSetCssStyle(c) {
        this._elementMap.get(c.elementId).style[c.prop] = c.val
    }
    _OnSetAttribute(c) {
        this._elementMap.get(c.elementId).setAttribute(c.name, c.val)
    }
    _OnRemoveAttribute(c) {
        this._elementMap.get(c.elementId).removeAttribute(c.name)
    }
    GetElementById(c) {
        return this._elementMap.get(c)
    }
};
"use strict"; {
    const c = /(iphone|ipod|ipad|macos|macintosh|mac os x)/i.test(navigator.userAgent),
        a = /android/i.test(navigator.userAgent);
    let b = 0;

    function e(g) {
        const d = document.createElement("script");
        d.async = !1;
        d.type = "module";
        return g.isStringSrc ? new Promise(k => {
            const l = "c3_resolve_" + b;
            ++b;
            self[l] = k;
            d.textContent = g.str + `\n\nself["${l}"]();`;
            document.head.appendChild(d)
        }) : new Promise((k, l) => {
            d.onload = k;
            d.onerror = l;
            d.src = g;
            document.head.appendChild(d)
        })
    }
    let h = !1,
        m = !1;

    function p() {
        if (!h) {
            try {
                new Worker("blob://", {
                    get type() {
                        m = !0
                    }
                })
            } catch (g) {}
            h = !0
        }
        return m
    }
    let u = new Audio;
    const z = {
        "audio/webm; codecs=opus": !!u.canPlayType("audio/webm; codecs=opus"),
        "audio/ogg; codecs=opus": !!u.canPlayType("audio/ogg; codecs=opus"),
        "audio/webm; codecs=vorbis": !!u.canPlayType("audio/webm; codecs=vorbis"),
        "audio/ogg; codecs=vorbis": !!u.canPlayType("audio/ogg; codecs=vorbis"),
        "audio/mp4": !!u.canPlayType("audio/mp4"),
        "audio/mpeg": !!u.canPlayType("audio/mpeg")
    };
    u = null;
    async function B(g) {
        g = await v(g);
        return (new TextDecoder("utf-8")).decode(g)
    }

    function v(g) {
        return new Promise((d, k) => {
            const l = new FileReader;
            l.onload = n => d(n.target.result);
            l.onerror = n => k(n);
            l.readAsArrayBuffer(g)
        })
    }
    const w = [];
    let A = 0;
    window.RealFile = window.File;
    const C = [],
        F = new Map,
        y = new Map;
    let G = 0;
    const D = [];
    self.runOnStartup = function(g) {
        if ("function" !== typeof g) throw Error("runOnStartup called without a function");
        D.push(g)
    };
    const I = new Set(["cordova", "playable-ad", "instant-games"]);

    function H(g) {
        return I.has(g)
    }
    let f = !1;
    window.RuntimeInterface = class g {
        constructor(d) {
            this._useWorker = d.useWorker;
            this._messageChannelPort = null;
            this._runtimeBaseUrl = "";
            this._scriptFolder = d.scriptFolder;
            this._workerScriptURLs = {};
            this._localRuntime = this._worker = null;
            this._domHandlers = [];
            this._canvas = this._runtimeDomHandler = null;
            this._isExportingToVideo = !1;
            this._exportToVideoDuration = 0;
            this._jobScheduler = null;
            this._rafId = -1;
            this._rafFunc = () => this._OnRAFCallback();
            this._rafCallbacks = [];
            this._exportType = d.exportType;
            this._isFileProtocol = "file" === location.protocol.substr(0, 4);
            !this._useWorker || "undefined" !== typeof OffscreenCanvas && navigator.userActivation && p() || (this._useWorker = !1);
            if ("playable-ad" === this._exportType || "instant-games" === this._exportType) this._useWorker = !1;
            if ("cordova" === this._exportType && this._useWorker)
                if (a) {
                    const k = /Chrome\/(\d+)/i.exec(navigator.userAgent);
                    k && 90 <= parseInt(k[1], 10) || (this._useWorker = !1)
                } else this._useWorker = !1;
            this._localFileStrings = this._localFileBlobs = null;
            "html5" !== this._exportType && "playable-ad" !== this._exportType || !this._isFileProtocol || alert("Exported games won't work until you upload them. (When running on the file: protocol, browsers block many features from working for security reasons.)");
            "html5" !== this._exportType || window.isSecureContext || console.warn("[Construct 3] Warning: the browser indicates this is not a secure context. Some features may be unavailable. Use secure (HTTPS) hosting to ensure all features are available.");
            this.AddRuntimeComponentMessageHandler("runtime", "cordova-fetch-local-file", k => this._OnCordovaFetchLocalFile(k));
            this.AddRuntimeComponentMessageHandler("runtime", "create-job-worker", k => this._OnCreateJobWorker(k));
            "cordova" === this._exportType ? document.addEventListener("deviceready", () => this._Init(d)) : this._Init(d)
        }
        Release() {
            this._CancelAnimationFrame();
            this._messageChannelPort && (this._messageChannelPort = this._messageChannelPort.onmessage = null);
            this._worker && (this._worker.terminate(), this._worker = null);
            this._localRuntime && (this._localRuntime.Release(), this._localRuntime = null);
            this._canvas && (this._canvas.parentElement.removeChild(this._canvas), this._canvas = null)
        }
        GetCanvas() {
            return this._canvas
        }
        GetRuntimeBaseURL() {
            return this._runtimeBaseUrl
        }
        UsesWorker() {
            return this._useWorker
        }
        GetExportType() {
            return this._exportType
        }
        IsFileProtocol() {
            return this._isFileProtocol
        }
        GetScriptFolder() {
            return this._scriptFolder
        }
        IsiOSCordova() {
            return c && "cordova" === this._exportType
        }
        IsiOSWebView() {
            const d = navigator.userAgent;
            return c && H(this._exportType) || navigator.standalone || /crios\/|fxios\/|edgios\//i.test(d)
        }
        IsAndroid() {
            return a
        }
        IsAndroidWebView() {
            return a && H(this._exportType)
        }
        async _Init(d) {
            "macos-wkwebview" === this._exportType && this._SendWrapperMessage({
                type: "ready"
            });
            if ("playable-ad" === this._exportType) {
                this._localFileBlobs = self.c3_base64files;
                this._localFileStrings = {};
                await this._ConvertDataUrisToBlobs();
                for (let l = 0, n = d.engineScripts.length; l < n; ++l) {
                    var k = d.engineScripts[l].toLowerCase();
                    this._localFileStrings.hasOwnProperty(k) ? d.engineScripts[l] = {
                        isStringSrc: !0,
                        str: this._localFileStrings[k]
                    } : this._localFileBlobs.hasOwnProperty(k) && (d.engineScripts[l] = URL.createObjectURL(this._localFileBlobs[k]))
                }
            }
            d.runtimeBaseUrl ? this._runtimeBaseUrl = d.runtimeBaseUrl : (k = location.origin, this._runtimeBaseUrl = ("null" === k ? "file:///" : k) + location.pathname, k = this._runtimeBaseUrl.lastIndexOf("/"), -1 !== k && (this._runtimeBaseUrl = this._runtimeBaseUrl.substr(0, k + 1)));
            d.workerScripts && (this._workerScriptURLs = d.workerScripts);
            k = new MessageChannel;
            this._messageChannelPort = k.port1;
            this._messageChannelPort.onmessage = l => this._OnMessageFromRuntime(l.data);
            window.c3_addPortMessageHandler && window.c3_addPortMessageHandler(l => this._OnMessageFromDebugger(l));
            this._jobScheduler = new self.JobSchedulerDOM(this);
            await this._jobScheduler.Init();
            "object" === typeof window.StatusBar && window.StatusBar.hide();
            if ("object" === typeof window.AndroidFullScreen) try {
                await new Promise((l, n) => {
                    window.AndroidFullScreen.immersiveMode(l, n)
                })
            } catch (l) {
                console.error("Failed to enter Android immersive mode: ", l)
            }
            this._useWorker ? await this._InitWorker(d, k.port2) : await this._InitDOM(d, k.port2)
        }
        _GetWorkerURL(d) {
            d = this._workerScriptURLs.hasOwnProperty(d) ? this._workerScriptURLs[d] : d.endsWith("/workermain.js") && this._workerScriptURLs.hasOwnProperty("workermain.js") ? this._workerScriptURLs["workermain.js"] : "playable-ad" === this._exportType && this._localFileBlobs.hasOwnProperty(d.toLowerCase()) ? this._localFileBlobs[d.toLowerCase()] : d;
            d instanceof Blob && (d = URL.createObjectURL(d));
            return d
        }
        async CreateWorker(d, k, l) {
            if (d.startsWith("blob:")) return new Worker(d, l);
            if ("cordova" === this._exportType && this._isFileProtocol) return d = await this.CordovaFetchLocalFileAsArrayBuffer(l.isC3MainWorker ? d : this._scriptFolder + d), d = new Blob([d], {
                type: "application/javascript"
            }), new Worker(URL.createObjectURL(d), l);
            d = new URL(d, k);
            if (location.origin !== d.origin) {
                d = await fetch(d);
                if (!d.ok) throw Error("failed to fetch worker script");
                d = await d.blob();
                return new Worker(URL.createObjectURL(d), l)
            }
            return new Worker(d, l)
        }
        _GetWindowInnerWidth() {
            return Math.max(window.innerWidth, 1)
        }
        _GetWindowInnerHeight() {
            return Math.max(window.innerHeight, 1)
        }
        _GetCommonRuntimeOptions(d) {
            return {
                runtimeBaseUrl: this._runtimeBaseUrl,
                previewUrl: location.href,
                windowInnerWidth: this._GetWindowInnerWidth(),
                windowInnerHeight: this._GetWindowInnerHeight(),
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: g.IsDocumentFullscreen(),
                projectData: d.projectData,
                previewImageBlobs: window.cr_previewImageBlobs || this._localFileBlobs,
                previewProjectFileBlobs: window.cr_previewProjectFileBlobs,
                previewProjectFileSWUrls: window.cr_previewProjectFiles,
                swClientId: window.cr_swClientId || "",
                exportType: d.exportType,
                isDebug: (new URLSearchParams(self.location.search)).has("debug"),
                ife: !!self.ife,
                jobScheduler: this._jobScheduler.GetPortData(),
                supportedAudioFormats: z,
                opusWasmScriptUrl: window.cr_opusWasmScriptUrl || this._scriptFolder + "opus.wasm.js",
                opusWasmBinaryUrl: window.cr_opusWasmBinaryUrl || this._scriptFolder + "opus.wasm.wasm",
                isFileProtocol: this._isFileProtocol,
                isiOSCordova: this.IsiOSCordova(),
                isiOSWebView: this.IsiOSWebView(),
                isFBInstantAvailable: "undefined" !== typeof self.FBInstant
            }
        }
        async _InitWorker(d, k) {
            var l = this._GetWorkerURL(d.workerMainUrl);
            this._worker = await this.CreateWorker(l, this._runtimeBaseUrl, {
                type: "module",
                name: "Runtime",
                isC3MainWorker: !0
            });
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            l = this._canvas.transferControlToOffscreen();
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            self.C3_InsertHTMLPlaceholders && self.C3_InsertHTMLPlaceholders();
            let n = d.workerDependencyScripts || [],
                r = d.engineScripts;
            n = await Promise.all(n.map(q => this._MaybeGetCordovaScriptURL(q)));
            r = await Promise.all(r.map(q => this._MaybeGetCordovaScriptURL(q)));
            if ("cordova" === this._exportType)
                for (let q = 0, t = d.projectScripts.length; q < t; ++q) {
                    const x = d.projectScripts[q],
                        E = x[0];
                    if (E === d.mainProjectScript || "scriptsInEvents.js" === E || E.endsWith("/scriptsInEvents.js")) x[1] = await this._MaybeGetCordovaScriptURL(E)
                }
            this._worker.postMessage(Object.assign(this._GetCommonRuntimeOptions(d), {
                type: "init-runtime",
                isInWorker: !0,
                messagePort: k,
                canvas: l,
                workerDependencyScripts: n,
                engineScripts: r,
                projectScripts: d.projectScripts,
                mainProjectScript: d.mainProjectScript,
                projectScriptsStatus: self.C3_ProjectScriptsStatus
            }), [k, l, ...this._jobScheduler.GetPortTransferables()]);
            this._domHandlers = C.map(q => new q(this));
            this._FindRuntimeDOMHandler();
            self.c3_callFunction = (q, t) => this._runtimeDomHandler._InvokeFunctionFromJS(q, t);
            "preview" === this._exportType && (self.goToLastErrorScript = () => this.PostToRuntimeComponent("runtime", "go-to-last-error-script"))
        }
        async _InitDOM(d, k) {
            this._canvas = document.createElement("canvas");
            this._canvas.style.display = "none";
            document.body.appendChild(this._canvas);
            window.c3canvas = this._canvas;
            self.C3_InsertHTMLPlaceholders && self.C3_InsertHTMLPlaceholders();
            this._domHandlers = C.map(q => new q(this));
            this._FindRuntimeDOMHandler();
            var l = d.engineScripts.map(q => "string" === typeof q ? (new URL(q, this._runtimeBaseUrl)).toString() : q);
            Array.isArray(d.workerDependencyScripts) && l.unshift(...d.workerDependencyScripts);
            l = await Promise.all(l.map(q => this._MaybeGetCordovaScriptURL(q)));
            await Promise.all(l.map(q => e(q)));
            l = self.C3_ProjectScriptsStatus;
            const n = d.mainProjectScript,
                r = d.projectScripts;
            for (let [q, t] of r)
                if (t || (t = q), q === n) try {
                    t = await this._MaybeGetCordovaScriptURL(t), await e(t), "preview" !== this._exportType || l[q] || this._ReportProjectMainScriptError(q, "main script did not run to completion")
                } catch (x) {
                    this._ReportProjectMainScriptError(q, x)
                } else if ("scriptsInEvents.js" === q || q.endsWith("/scriptsInEvents.js")) t = await this._MaybeGetCordovaScriptURL(t), await e(t);
            "preview" === this._exportType && "object" !== typeof self.C3.ScriptsInEvents ? (this._RemoveLoadingMessage(), console.error("[C3 runtime] Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax."), alert("Failed to load JavaScript code used in events. Check all your JavaScript code has valid syntax.")) : (d = Object.assign(this._GetCommonRuntimeOptions(d), {
                isInWorker: !1,
                messagePort: k,
                canvas: this._canvas,
                runOnStartupFunctions: D
            }), this._OnBeforeCreateRuntime(), this._localRuntime = self.C3_CreateRuntime(d), await self.C3_InitRuntime(this._localRuntime, d))
        }
        _ReportProjectMainScriptError(d, k) {
            this._RemoveLoadingMessage();
            console.error(`[Preview] Failed to load project main script (${d}): `, k);
            alert(`Failed to load project main script (${d}). Check all your JavaScript code has valid syntax. Press F12 and check the console for error details.`)
        }
        _OnBeforeCreateRuntime() {
            this._RemoveLoadingMessage()
        }
        _RemoveLoadingMessage() {
            const d = window.cr_previewLoadingElem;
            d && (d.parentElement.removeChild(d), window.cr_previewLoadingElem = null)
        }
        async _OnCreateJobWorker(d) {
            d = await this._jobScheduler._CreateJobWorker();
            return {
                outputPort: d,
                transferables: [d]
            }
        }
        _GetLocalRuntime() {
            if (this._useWorker) throw Error("not available in worker mode");
            return this._localRuntime
        }
        PostToRuntimeComponent(d, k, l, n, r) {
            this._messageChannelPort.postMessage({
                type: "event",
                component: d,
                handler: k,
                dispatchOpts: n || null,
                data: l,
                responseId: null
            }, r)
        }
        PostToRuntimeComponentAsync(d, k, l, n, r) {
            const q = G++,
                t = new Promise((x, E) => {
                    y.set(q, {
                        resolve: x,
                        reject: E
                    })
                });
            this._messageChannelPort.postMessage({
                type: "event",
                component: d,
                handler: k,
                dispatchOpts: n || null,
                data: l,
                responseId: q
            }, r);
            return t
        }["_OnMessageFromRuntime"](d) {
            const k = d.type;
            if ("event" === k) return this._OnEventFromRuntime(d);
            if ("result" === k) this._OnResultFromRuntime(d);
            else if ("runtime-ready" === k) this._OnRuntimeReady();
            else if ("alert-error" === k) this._RemoveLoadingMessage(), alert(d.message);
            else if ("creating-runtime" === k) this._OnBeforeCreateRuntime();
            else throw Error(`unknown message '${k}'`);
        }
        _OnEventFromRuntime(d) {
            const k = d.component,
                l = d.handler,
                n = d.data,
                r = d.responseId;
            if (d = F.get(k))
                if (d = d.get(l)) {
                    var q = null;
                    try {
                        q = d(n)
                    } catch (t) {
                        console.error(`Exception in '${k}' handler '${l}':`, t);
                        null !== r && this._PostResultToRuntime(r, !1, "" + t);
                        return
                    }
                    if (null === r) return q;
                    q && q.then ? q.then(t => this._PostResultToRuntime(r, !0, t)).catch(t => {
                        console.error(`Rejection from '${k}' handler '${l}':`, t);
                        this._PostResultToRuntime(r, !1, "" + t)
                    }) : this._PostResultToRuntime(r, !0, q)
                } else console.warn(`[DOM] No handler '${l}' for component '${k}'`);
            else console.warn(`[DOM] No event handlers for component '${k}'`)
        }
        _PostResultToRuntime(d, k, l) {
            let n;
            l && l.transferables && (n = l.transferables);
            this._messageChannelPort.postMessage({
                type: "result",
                responseId: d,
                isOk: k,
                result: l
            }, n)
        }
        _OnResultFromRuntime(d) {
            const k = d.responseId,
                l = d.isOk;
            d = d.result;
            const n = y.get(k);
            l ? n.resolve(d) : n.reject(d);
            y.delete(k)
        }
        AddRuntimeComponentMessageHandler(d, k, l) {
            let n = F.get(d);
            n || (n = new Map, F.set(d, n));
            if (n.has(k)) throw Error(`[DOM] Component '${d}' already has handler '${k}'`);
            n.set(k, l)
        }
        static AddDOMHandlerClass(d) {
            if (C.includes(d)) throw Error("DOM handler already added");
            C.push(d)
        }
        _FindRuntimeDOMHandler() {
            for (const d of this._domHandlers)
                if ("runtime" === d.GetComponentID()) {
                    this._runtimeDomHandler = d;
                    return
                }
            throw Error("cannot find runtime DOM handler");
        }
        _OnMessageFromDebugger(d) {
            this.PostToRuntimeComponent("debugger", "message", d)
        }
        _OnRuntimeReady() {
            for (const d of this._domHandlers) d.Attach()
        }
        static IsDocumentFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || f)
        }
        static _SetWrapperIsFullscreenFlag(d) {
            f = !!d
        }
        async GetRemotePreviewStatusInfo() {
            return await this.PostToRuntimeComponentAsync("runtime", "get-remote-preview-status-info")
        }
        _AddRAFCallback(d) {
            this._rafCallbacks.push(d);
            this._RequestAnimationFrame()
        }
        _RemoveRAFCallback(d) {
            d = this._rafCallbacks.indexOf(d);
            if (-1 === d) throw Error("invalid callback");
            this._rafCallbacks.splice(d, 1);
            this._rafCallbacks.length || this._CancelAnimationFrame()
        }
        _RequestAnimationFrame() {
            -1 === this._rafId && this._rafCallbacks.length && (this._rafId = requestAnimationFrame(this._rafFunc))
        }
        _CancelAnimationFrame() {
            -1 !== this._rafId && (cancelAnimationFrame(this._rafId), this._rafId = -1)
        }
        _OnRAFCallback() {
            this._rafId = -1;
            for (const d of this._rafCallbacks) d();
            this._RequestAnimationFrame()
        }
        TryPlayMedia(d) {
            this._runtimeDomHandler.TryPlayMedia(d)
        }
        RemovePendingPlay(d) {
            this._runtimeDomHandler.RemovePendingPlay(d)
        }
        _PlayPendingMedia() {
            this._runtimeDomHandler._PlayPendingMedia()
        }
        SetSilent(d) {
            this._runtimeDomHandler.SetSilent(d)
        }
        IsAudioFormatSupported(d) {
            return !!z[d]
        }
        async _WasmDecodeWebMOpus(d) {
            d = await this.PostToRuntimeComponentAsync("runtime", "opus-decode", {
                arrayBuffer: d
            }, null, [d]);
            return new Float32Array(d)
        }
        SetIsExportingToVideo(d) {
            this._isExportingToVideo = !0;
            this._exportToVideoDuration = d
        }
        IsExportingToVideo() {
            return this._isExportingToVideo
        }
        GetExportToVideoDuration() {
            return this._exportToVideoDuration
        }
        IsAbsoluteURL(d) {
            return /^(?:[a-z\-]+:)?\/\//.test(d) || "data:" === d.substr(0, 5) || "blob:" === d.substr(0, 5)
        }
        IsRelativeURL(d) {
            return !this.IsAbsoluteURL(d)
        }
        async _MaybeGetCordovaScriptURL(d) {
            return "cordova" === this._exportType && (d.startsWith("file:") || this._isFileProtocol && this.IsRelativeURL(d)) ? (d.startsWith(this._runtimeBaseUrl) && (d = d.substr(this._runtimeBaseUrl.length)), d = await this.CordovaFetchLocalFileAsArrayBuffer(d), d = new Blob([d], {
                type: "application/javascript"
            }), URL.createObjectURL(d)) : d
        }
        async _OnCordovaFetchLocalFile(d) {
            const k = d.filename;
            switch (d.as) {
                case "text":
                    return await this.CordovaFetchLocalFileAsText(k);
                case "buffer":
                    return await this.CordovaFetchLocalFileAsArrayBuffer(k);
                default:
                    throw Error("unsupported type");
            }
        }
        _GetPermissionAPI() {
            const d = window.cordova && window.cordova.plugins && window.cordova.plugins.permissions;
            if ("object" !== typeof d) throw Error("Permission API is not loaded");
            return d
        }
        _MapPermissionID(d, k) {
            d = d[k];
            if ("string" !== typeof d) throw Error("Invalid permission name");
            return d
        }
        _HasPermission(d) {
            const k = this._GetPermissionAPI();
            return new Promise((l, n) => k.checkPermission(this._MapPermissionID(k, d), r => l(!!r.hasPermission), n))
        }
        _RequestPermission(d) {
            const k = this._GetPermissionAPI();
            return new Promise((l, n) => k.requestPermission(this._MapPermissionID(k, d), r => l(!!r.hasPermission), n))
        }
        async RequestPermissions(d) {
            if ("cordova" !== this.GetExportType() || this.IsiOSCordova()) return !0;
            for (const k of d)
                if (!await this._HasPermission(k) && !1 === await this._RequestPermission(k)) return !1;
            return !0
        }
        async RequirePermissions(...d) {
            if (!1 === await this.RequestPermissions(d)) throw Error("Permission not granted");
        }
        CordovaFetchLocalFile(d) {
            const k = window.cordova.file.applicationDirectory + "www/" + d.toLowerCase();
            return new Promise((l, n) => {
                window.resolveLocalFileSystemURL(k, r => {
                    r.file(l, n)
                }, n)
            })
        }
        async CordovaFetchLocalFileAsText(d) {
            d = await this.CordovaFetchLocalFile(d);
            return await B(d)
        }
        _CordovaMaybeStartNextArrayBufferRead() {
            if (w.length && !(8 <= A)) {
                A++;
                var d = w.shift();
                this._CordovaDoFetchLocalFileAsAsArrayBuffer(d.filename, d.successCallback, d.errorCallback)
            }
        }
        CordovaFetchLocalFileAsArrayBuffer(d) {
            return new Promise((k, l) => {
                w.push({
                    filename: d,
                    successCallback: n => {
                        A--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        k(n)
                    },
                    errorCallback: n => {
                        A--;
                        this._CordovaMaybeStartNextArrayBufferRead();
                        l(n)
                    }
                });
                this._CordovaMaybeStartNextArrayBufferRead()
            })
        }
        async _CordovaDoFetchLocalFileAsAsArrayBuffer(d, k, l) {
            try {
                const n = await this.CordovaFetchLocalFile(d),
                    r = await v(n);
                k(r)
            } catch (n) {
                l(n)
            }
        }
        _SendWrapperMessage(d) {
            if ("windows-webview2" === this._exportType) window.chrome.webview.postMessage(JSON.stringify(d));
            else if ("macos-wkwebview" === this._exportType) window.webkit.messageHandlers.C3Wrapper.postMessage(JSON.stringify(d));
            else throw Error("cannot send wrapper message");
        }
        async _ConvertDataUrisToBlobs() {
            const d = [];
            for (const [k, l] of Object.entries(this._localFileBlobs)) d.push(this._ConvertDataUriToBlobs(k, l));
            await Promise.all(d)
        }
        async _ConvertDataUriToBlobs(d, k) {
            if ("object" === typeof k) this._localFileBlobs[d] = new Blob([k.str], {
                type: k.type
            }), this._localFileStrings[d] = k.str;
            else {
                let l = await this._FetchDataUri(k);
                l || (l = this._DataURIToBinaryBlobSync(k));
                this._localFileBlobs[d] = l
            }
        }
        async _FetchDataUri(d) {
            try {
                return await (await fetch(d)).blob()
            } catch (k) {
                return console.warn("Failed to fetch a data: URI. Falling back to a slower workaround. This is probably because the Content Security Policy unnecessarily blocked it. Allow data: URIs in your CSP to avoid this.", k), null
            }
        }
        _DataURIToBinaryBlobSync(d) {
            d = this._ParseDataURI(d);
            return this._BinaryStringToBlob(d.data, d.mime_type)
        }
        _ParseDataURI(d) {
            var k = d.indexOf(",");
            if (0 > k) throw new URIError("expected comma in data: uri");
            var l = d.substring(5, k);
            d = d.substring(k + 1);
            k = l.split(";");
            l = k[0] || "";
            const n = k[2];
            d = "base64" === k[1] || "base64" === n ? atob(d) : decodeURIComponent(d);
            return {
                mime_type: l,
                data: d
            }
        }
        _BinaryStringToBlob(d, k) {
            var l = d.length;
            let n = l >> 2,
                r = new Uint8Array(l),
                q = new Uint32Array(r.buffer, 0, n),
                t, x;
            for (x = t = 0; t < n; ++t) q[t] = d.charCodeAt(x++) | d.charCodeAt(x++) << 8 | d.charCodeAt(x++) << 16 | d.charCodeAt(x++) << 24;
            for (l &= 3; l--;) r[x] = d.charCodeAt(x), ++x;
            return new Blob([r], {
                type: k
            })
        }
    }
}
"use strict"; {
    const c = self.RuntimeInterface;

    function a(f) {
        return f.sourceCapabilities && f.sourceCapabilities.firesTouchEvents || f.originalEvent && f.originalEvent.sourceCapabilities && f.originalEvent.sourceCapabilities.firesTouchEvents
    }
    const b = new Map([
            ["OSLeft", "MetaLeft"],
            ["OSRight", "MetaRight"]
        ]),
        e = {
            dispatchRuntimeEvent: !0,
            dispatchUserScriptEvent: !0
        },
        h = {
            dispatchUserScriptEvent: !0
        },
        m = {
            dispatchRuntimeEvent: !0
        };

    function p(f) {
        return new Promise((g, d) => {
            const k = document.createElement("link");
            k.onload = () => g(k);
            k.onerror = l => d(l);
            k.rel = "stylesheet";
            k.href = f;
            document.head.appendChild(k)
        })
    }

    function u(f) {
        return new Promise((g, d) => {
            const k = new Image;
            k.onload = () => g(k);
            k.onerror = l => d(l);
            k.src = f
        })
    }
    async function z(f) {
        f = URL.createObjectURL(f);
        try {
            return await u(f)
        } finally {
            URL.revokeObjectURL(f)
        }
    }

    function B(f) {
        return new Promise((g, d) => {
            let k = new FileReader;
            k.onload = l => g(l.target.result);
            k.onerror = l => d(l);
            k.readAsText(f)
        })
    }
    async function v(f, g, d) {
        if (!/firefox/i.test(navigator.userAgent)) return await z(f);
        var k = await B(f);
        k = (new DOMParser).parseFromString(k, "image/svg+xml");
        const l = k.documentElement;
        if (l.hasAttribute("width") && l.hasAttribute("height")) {
            const n = l.getAttribute("width"),
                r = l.getAttribute("height");
            if (!n.includes("%") && !r.includes("%")) return await z(f)
        }
        l.setAttribute("width", g + "px");
        l.setAttribute("height", d + "px");
        k = (new XMLSerializer).serializeToString(k);
        f = new Blob([k], {
            type: "image/svg+xml"
        });
        return await z(f)
    }

    function w(f) {
        do {
            if (f.parentNode && f.hasAttribute("contenteditable")) return !0;
            f = f.parentNode
        } while (f);
        return !1
    }
    const A = new Set(["input", "textarea", "datalist", "select"]);

    function C(f) {
        return A.has(f.tagName.toLowerCase()) || w(f)
    }
    const F = new Set(["canvas", "body", "html"]);

    function y(f) {
        const g = f.target.tagName.toLowerCase();
        F.has(g) && f.preventDefault()
    }

    function G(f) {
        (f.metaKey || f.ctrlKey) && f.preventDefault()
    }
    self.C3_GetSvgImageSize = async function(f) {
        f = await z(f);
        if (0 < f.width && 0 < f.height) return [f.width, f.height]; {
            f.style.position = "absolute";
            f.style.left = "0px";
            f.style.top = "0px";
            f.style.visibility = "hidden";
            document.body.appendChild(f);
            const g = f.getBoundingClientRect();
            document.body.removeChild(f);
            return [g.width, g.height]
        }
    };
    self.C3_RasterSvgImageBlob = async function(f, g, d, k, l) {
        f = await v(f, g, d);
        const n = document.createElement("canvas");
        n.width = k;
        n.height = l;
        n.getContext("2d").drawImage(f, 0, 0, g, d);
        return n
    };
    let D = !1;
    document.addEventListener("pause", () => D = !0);
    document.addEventListener("resume", () => D = !1);

    function I() {
        try {
            return window.parent && window.parent.document.hasFocus()
        } catch (f) {
            return !1
        }
    }

    function H() {
        const f = document.activeElement;
        if (!f) return !1;
        const g = f.tagName.toLowerCase(),
            d = new Set("email number password search tel text url".split(" "));
        return "textarea" === g ? !0 : "input" === g ? d.has(f.type.toLowerCase() || "text") : w(f)
    }
    c.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(f) {
            super(f, "runtime");
            this._isFirstSizeUpdate = !0;
            this._simulatedResizeTimerId = -1;
            this._targetOrientation = "any";
            this._attachedDeviceMotionEvent = this._attachedDeviceOrientationEvent = !1;
            this._debugHighlightElem = null;
            this._isExportToVideo = !1;
            this._exportVideoProgressMessage = "";
            this._exportVideoUpdateTimerId = -1;
            this._lastPointerRawUpdateEvent = this._pointerRawUpdateRateLimiter = null;
            this._pointerRawMovementY = this._pointerRawMovementX = 0;
            this._enableAndroidVKDetection = !1;
            this._lastWindowWidth = f._GetWindowInnerWidth();
            this._lastWindowHeight = f._GetWindowInnerHeight();
            this._virtualKeyboardHeight = 0;
            f.AddRuntimeComponentMessageHandler("canvas", "update-size", k => this._OnUpdateCanvasSize(k));
            f.AddRuntimeComponentMessageHandler("runtime", "invoke-download", k => this._OnInvokeDownload(k));
            f.AddRuntimeComponentMessageHandler("runtime", "raster-svg-image", k => this._OnRasterSvgImage(k));
            f.AddRuntimeComponentMessageHandler("runtime", "get-svg-image-size", k => this._OnGetSvgImageSize(k));
            f.AddRuntimeComponentMessageHandler("runtime", "set-target-orientation", k => this._OnSetTargetOrientation(k));
            f.AddRuntimeComponentMessageHandler("runtime", "register-sw", () => this._OnRegisterSW());
            f.AddRuntimeComponentMessageHandler("runtime", "post-to-debugger", k => this._OnPostToDebugger(k));
            f.AddRuntimeComponentMessageHandler("runtime", "go-to-script", k => this._OnPostToDebugger(k));
            f.AddRuntimeComponentMessageHandler("runtime", "before-start-ticking", () => this._OnBeforeStartTicking());
            f.AddRuntimeComponentMessageHandler("runtime", "debug-highlight", k => this._OnDebugHighlight(k));
            f.AddRuntimeComponentMessageHandler("runtime", "enable-device-orientation", () => this._AttachDeviceOrientationEvent());
            f.AddRuntimeComponentMessageHandler("runtime", "enable-device-motion", () => this._AttachDeviceMotionEvent());
            f.AddRuntimeComponentMessageHandler("runtime", "add-stylesheet", k => this._OnAddStylesheet(k));
            f.AddRuntimeComponentMessageHandler("runtime", "alert", k => this._OnAlert(k));
            f.AddRuntimeComponentMessageHandler("runtime", "hide-cordova-splash", () => this._OnHideCordovaSplash());
            f.AddRuntimeComponentMessageHandler("runtime", "set-exporting-to-video", k => this._SetExportingToVideo(k));
            f.AddRuntimeComponentMessageHandler("runtime", "export-to-video-progress", k => this._OnExportVideoProgress(k));
            f.AddRuntimeComponentMessageHandler("runtime", "exported-to-video", k => this._OnExportedToVideo(k));
            const g = new Set(["input", "textarea", "datalist"]);
            window.addEventListener("contextmenu", k => {
                const l = k.target,
                    n = l.tagName.toLowerCase();
                g.has(n) || w(l) || k.preventDefault()
            });
            const d = f.GetCanvas();
            window.addEventListener("selectstart", y);
            window.addEventListener("gesturehold", y);
            d.addEventListener("selectstart", y);
            d.addEventListener("gesturehold", y);
            window.addEventListener("touchstart", y, {
                passive: !1
            });
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", y, {
                passive: !1
            }), d.addEventListener("pointerdown", y)) : d.addEventListener("touchstart", y);
            this._mousePointerLastButtons = 0;
            window.addEventListener("mousedown", k => {
                1 === k.button && k.preventDefault()
            });
            window.addEventListener("mousewheel", G, {
                passive: !1
            });
            window.addEventListener("wheel", G, {
                passive: !1
            });
            window.addEventListener("resize", () => this._OnWindowResize());
            window.addEventListener("fullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("webkitfullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("mozfullscreenchange", () => this._OnFullscreenChange());
            window.addEventListener("fullscreenerror", k => this._OnFullscreenError(k));
            window.addEventListener("webkitfullscreenerror", k => this._OnFullscreenError(k));
            window.addEventListener("mozfullscreenerror", k => this._OnFullscreenError(k));
            if (f.IsiOSWebView())
                if (window.visualViewport) {
                    let k = Infinity;
                    window.visualViewport.addEventListener("resize", () => {
                        const l = window.visualViewport.height;
                        l > k && (document.scrollingElement.scrollTop = 0);
                        k = l
                    })
                } else window.addEventListener("focusout", () => {
                    H() || (document.scrollingElement.scrollTop = 0)
                });
            self.C3WrapperOnMessage = k => this._OnWrapperMessage(k);
            this._mediaPendingPlay = new Set;
            this._mediaRemovedPendingPlay = new WeakSet;
            this._isSilent = !1
        }
        _OnBeforeStartTicking() {
            self.setTimeout(() => {
                this._enableAndroidVKDetection = !0
            }, 1E3);
            "cordova" === this._iRuntime.GetExportType() ? (document.addEventListener("pause", () => this._OnVisibilityChange(!0)), document.addEventListener("resume", () => this._OnVisibilityChange(!1))) : document.addEventListener("visibilitychange", () => this._OnVisibilityChange(document.hidden));
            return {
                isSuspended: !(!document.hidden && !D)
            }
        }
        Attach() {
            window.addEventListener("focus", () => this._PostRuntimeEvent("window-focus"));
            window.addEventListener("blur", () => {
                this._PostRuntimeEvent("window-blur", {
                    parentHasFocus: I()
                });
                this._mousePointerLastButtons = 0
            });
            window.addEventListener("focusin", g => {
                C(g.target) && this._PostRuntimeEvent("keyboard-blur")
            });
            window.addEventListener("keydown", g => this._OnKeyEvent("keydown", g));
            window.addEventListener("keyup", g => this._OnKeyEvent("keyup", g));
            window.addEventListener("dblclick", g => this._OnMouseEvent("dblclick", g, e));
            window.addEventListener("wheel", g => this._OnMouseWheelEvent("wheel", g));
            "undefined" !== typeof PointerEvent ? (window.addEventListener("pointerdown", g => {
                this._HandlePointerDownFocus(g);
                this._OnPointerEvent("pointerdown", g)
            }), this._iRuntime.UsesWorker() && "undefined" !== typeof window.onpointerrawupdate && self === self.top ? (this._pointerRawUpdateRateLimiter = new self.RateLimiter(() => this._DoSendPointerRawUpdate(), 5), this._pointerRawUpdateRateLimiter.SetCanRunImmediate(!0), window.addEventListener("pointerrawupdate", g => this._OnPointerRawUpdate(g))) : window.addEventListener("pointermove", g => this._OnPointerEvent("pointermove", g)), window.addEventListener("pointerup", g => this._OnPointerEvent("pointerup", g)), window.addEventListener("pointercancel", g => this._OnPointerEvent("pointercancel", g))) : (window.addEventListener("mousedown", g => {
                this._HandlePointerDownFocus(g);
                this._OnMouseEventAsPointer("pointerdown", g)
            }), window.addEventListener("mousemove", g => this._OnMouseEventAsPointer("pointermove", g)), window.addEventListener("mouseup", g => this._OnMouseEventAsPointer("pointerup", g)), window.addEventListener("touchstart", g => {
                this._HandlePointerDownFocus(g);
                this._OnTouchEvent("pointerdown", g)
            }), window.addEventListener("touchmove", g => this._OnTouchEvent("pointermove", g)), window.addEventListener("touchend", g => this._OnTouchEvent("pointerup", g)), window.addEventListener("touchcancel", g => this._OnTouchEvent("pointercancel", g)));
            const f = () => this._PlayPendingMedia();
            window.addEventListener("pointerup", f, !0);
            window.addEventListener("touchend", f, !0);
            window.addEventListener("click", f, !0);
            window.addEventListener("keydown", f, !0);
            window.addEventListener("gamepadconnected", f, !0);
            this._iRuntime.IsAndroid() && !this._iRuntime.IsAndroidWebView() && navigator.virtualKeyboard && (navigator.virtualKeyboard.overlaysContent = !0, navigator.virtualKeyboard.addEventListener("geometrychange", () => {
                this._OnAndroidVirtualKeyboardChange(this._GetWindowInnerHeight(), navigator.virtualKeyboard.boundingRect.height)
            }))
        }
        _OnAndroidVirtualKeyboardChange(f, g) {
            document.body.style.transform = "";
            if (0 < g) {
                var d = document.activeElement;
                d && (d = d.getBoundingClientRect(), f = (d.top + d.bottom) / 2 - (f - g) / 2, f > g && (f = g), 0 > f && (f = 0), 0 < f && (document.body.style.transform = `translateY(${-f}px)`))
            }
        }
        _PostRuntimeEvent(f, g) {
            this.PostToRuntime(f, g || null, m)
        }
        _GetWindowInnerWidth() {
            return this._iRuntime._GetWindowInnerWidth()
        }
        _GetWindowInnerHeight() {
            return this._iRuntime._GetWindowInnerHeight()
        }
        _OnWindowResize() {
            if (!this._isExportToVideo) {
                var f = this._GetWindowInnerWidth(),
                    g = this._GetWindowInnerHeight();
                if (this._iRuntime.IsAndroidWebView()) {
                    if (this._enableAndroidVKDetection) {
                        if (this._lastWindowWidth === f && g < this._lastWindowHeight) {
                            this._virtualKeyboardHeight = this._lastWindowHeight - g;
                            this._OnAndroidVirtualKeyboardChange(this._lastWindowHeight, this._virtualKeyboardHeight);
                            return
                        }
                        0 < this._virtualKeyboardHeight && (this._virtualKeyboardHeight = 0, this._OnAndroidVirtualKeyboardChange(g, this._virtualKeyboardHeight))
                    }
                    this._lastWindowWidth = f;
                    this._lastWindowHeight = g
                }
                this._PostRuntimeEvent("window-resize", {
                    innerWidth: f,
                    innerHeight: g,
                    devicePixelRatio: window.devicePixelRatio,
                    isFullscreen: c.IsDocumentFullscreen()
                });
                this._iRuntime.IsiOSWebView() && (-1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId), this._OnSimulatedResize(f, g, 0))
            }
        }
        _ScheduleSimulatedResize(f, g, d) {
            -1 !== this._simulatedResizeTimerId && clearTimeout(this._simulatedResizeTimerId);
            this._simulatedResizeTimerId = setTimeout(() => this._OnSimulatedResize(f, g, d), 48)
        }
        _OnSimulatedResize(f, g, d) {
            const k = this._GetWindowInnerWidth(),
                l = this._GetWindowInnerHeight();
            this._simulatedResizeTimerId = -1;
            k != f || l != g ? this._PostRuntimeEvent("window-resize", {
                innerWidth: k,
                innerHeight: l,
                devicePixelRatio: window.devicePixelRatio,
                isFullscreen: c.IsDocumentFullscreen()
            }) : 10 > d && this._ScheduleSimulatedResize(k, l, d + 1)
        }
        _OnSetTargetOrientation(f) {
            this._targetOrientation = f.targetOrientation
        }
        _TrySetTargetOrientation() {
            const f = this._targetOrientation;
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock(f).catch(g => console.warn("[Construct 3] Failed to lock orientation: ", g));
            else try {
                let g = !1;
                screen.lockOrientation ? g = screen.lockOrientation(f) : screen.webkitLockOrientation ? g = screen.webkitLockOrientation(f) : screen.mozLockOrientation ? g = screen.mozLockOrientation(f) : screen.msLockOrientation && (g = screen.msLockOrientation(f));
                g || console.warn("[Construct 3] Failed to lock orientation")
            } catch (g) {
                console.warn("[Construct 3] Failed to lock orientation: ", g)
            }
        }
        _OnFullscreenChange() {
            if (!this._isExportToVideo) {
                var f = c.IsDocumentFullscreen();
                f && "any" !== this._targetOrientation && this._TrySetTargetOrientation();
                this.PostToRuntime("fullscreenchange", {
                    isFullscreen: f,
                    innerWidth: this._GetWindowInnerWidth(),
                    innerHeight: this._GetWindowInnerHeight()
                })
            }
        }
        _OnFullscreenError(f) {
            console.warn("[Construct 3] Fullscreen request failed: ", f);
            this.PostToRuntime("fullscreenerror", {
                isFullscreen: c.IsDocumentFullscreen(),
                innerWidth: this._GetWindowInnerWidth(),
                innerHeight: this._GetWindowInnerHeight()
            })
        }
        _OnVisibilityChange(f) {
            f ? this._iRuntime._CancelAnimationFrame() : this._iRuntime._RequestAnimationFrame();
            this.PostToRuntime("visibilitychange", {
                hidden: f
            })
        }
        _OnKeyEvent(f, g) {
            "Backspace" === g.key && y(g);
            if (!this._isExportToVideo) {
                var d = b.get(g.code) || g.code;
                this._PostToRuntimeMaybeSync(f, {
                    code: d,
                    key: g.key,
                    which: g.which,
                    repeat: g.repeat,
                    altKey: g.altKey,
                    ctrlKey: g.ctrlKey,
                    metaKey: g.metaKey,
                    shiftKey: g.shiftKey,
                    timeStamp: g.timeStamp
                }, e)
            }
        }
        _OnMouseWheelEvent(f, g) {
            this._isExportToVideo || this.PostToRuntime(f, {
                clientX: g.clientX,
                clientY: g.clientY,
                pageX: g.pageX,
                pageY: g.pageY,
                deltaX: g.deltaX,
                deltaY: g.deltaY,
                deltaZ: g.deltaZ,
                deltaMode: g.deltaMode,
                timeStamp: g.timeStamp
            }, e)
        }
        _OnMouseEvent(f, g, d) {
            this._isExportToVideo || a(g) || this._PostToRuntimeMaybeSync(f, {
                button: g.button,
                buttons: g.buttons,
                clientX: g.clientX,
                clientY: g.clientY,
                pageX: g.pageX,
                pageY: g.pageY,
                movementX: g.movementX || 0,
                movementY: g.movementY || 0,
                timeStamp: g.timeStamp
            }, d)
        }
        _OnMouseEventAsPointer(f, g) {
            if (!this._isExportToVideo && !a(g)) {
                var d = this._mousePointerLastButtons;
                "pointerdown" === f && 0 !== d ? f = "pointermove" : "pointerup" === f && 0 !== g.buttons && (f = "pointermove");
                this._PostToRuntimeMaybeSync(f, {
                    pointerId: 1,
                    pointerType: "mouse",
                    button: g.button,
                    buttons: g.buttons,
                    lastButtons: d,
                    clientX: g.clientX,
                    clientY: g.clientY,
                    pageX: g.pageX,
                    pageY: g.pageY,
                    movementX: g.movementX || 0,
                    movementY: g.movementY || 0,
                    width: 0,
                    height: 0,
                    pressure: 0,
                    tangentialPressure: 0,
                    tiltX: 0,
                    tiltY: 0,
                    twist: 0,
                    timeStamp: g.timeStamp
                }, e);
                this._mousePointerLastButtons = g.buttons;
                this._OnMouseEvent(g.type, g, h)
            }
        }
        _OnPointerEvent(f, g) {
            if (!this._isExportToVideo) {
                this._pointerRawUpdateRateLimiter && "pointermove" !== f && this._pointerRawUpdateRateLimiter.Reset();
                var d = 0;
                "mouse" === g.pointerType && (d = this._mousePointerLastButtons);
                this._PostToRuntimeMaybeSync(f, {
                    pointerId: g.pointerId,
                    pointerType: g.pointerType,
                    button: g.button,
                    buttons: g.buttons,
                    lastButtons: d,
                    clientX: g.clientX,
                    clientY: g.clientY,
                    pageX: g.pageX,
                    pageY: g.pageY,
                    movementX: (g.movementX || 0) + this._pointerRawMovementX,
                    movementY: (g.movementY || 0) + this._pointerRawMovementY,
                    width: g.width || 0,
                    height: g.height || 0,
                    pressure: g.pressure || 0,
                    tangentialPressure: g.tangentialPressure || 0,
                    tiltX: g.tiltX || 0,
                    tiltY: g.tiltY || 0,
                    twist: g.twist || 0,
                    timeStamp: g.timeStamp
                }, e);
                this._pointerRawMovementY = this._pointerRawMovementX = 0;
                "mouse" === g.pointerType && (d = "mousemove", "pointerdown" === f ? d = "mousedown" : "pointerup" === f && (d = "mouseup"), this._OnMouseEvent(d, g, h), this._mousePointerLastButtons = g.buttons)
            }
        }
        _OnPointerRawUpdate(f) {
            this._lastPointerRawUpdateEvent && (this._pointerRawMovementX += this._lastPointerRawUpdateEvent.movementX || 0, this._pointerRawMovementY += this._lastPointerRawUpdateEvent.movementY || 0);
            this._lastPointerRawUpdateEvent = f;
            this._pointerRawUpdateRateLimiter.Call()
        }
        _DoSendPointerRawUpdate() {
            this._OnPointerEvent("pointermove", this._lastPointerRawUpdateEvent);
            this._lastPointerRawUpdateEvent = null
        }
        _OnTouchEvent(f, g) {
            if (!this._isExportToVideo)
                for (let d = 0, k = g.changedTouches.length; d < k; ++d) {
                    const l = g.changedTouches[d];
                    this._PostToRuntimeMaybeSync(f, {
                        pointerId: l.identifier,
                        pointerType: "touch",
                        button: 0,
                        buttons: 0,
                        lastButtons: 0,
                        clientX: l.clientX,
                        clientY: l.clientY,
                        pageX: l.pageX,
                        pageY: l.pageY,
                        movementX: g.movementX || 0,
                        movementY: g.movementY || 0,
                        width: 2 * (l.radiusX || l.webkitRadiusX || 0),
                        height: 2 * (l.radiusY || l.webkitRadiusY || 0),
                        pressure: l.force || l.webkitForce || 0,
                        tangentialPressure: 0,
                        tiltX: 0,
                        tiltY: 0,
                        twist: l.rotationAngle || 0,
                        timeStamp: g.timeStamp
                    }, e)
                }
        }
        _HandlePointerDownFocus(f) {
            window !== window.top && window.focus();
            this._IsElementCanvasOrDocument(f.target) && document.activeElement && !this._IsElementCanvasOrDocument(document.activeElement) && document.activeElement.blur()
        }
        _IsElementCanvasOrDocument(f) {
            return !f || f === document || f === window || f === document.body || "canvas" === f.tagName.toLowerCase()
        }
        _AttachDeviceOrientationEvent() {
            this._attachedDeviceOrientationEvent || (this._attachedDeviceOrientationEvent = !0, window.addEventListener("deviceorientation", f => this._OnDeviceOrientation(f)), window.addEventListener("deviceorientationabsolute", f => this._OnDeviceOrientationAbsolute(f)))
        }
        _AttachDeviceMotionEvent() {
            this._attachedDeviceMotionEvent || (this._attachedDeviceMotionEvent = !0, window.addEventListener("devicemotion", f => this._OnDeviceMotion(f)))
        }
        _OnDeviceOrientation(f) {
            this._isExportToVideo || this.PostToRuntime("deviceorientation", {
                absolute: !!f.absolute,
                alpha: f.alpha || 0,
                beta: f.beta || 0,
                gamma: f.gamma || 0,
                timeStamp: f.timeStamp,
                webkitCompassHeading: f.webkitCompassHeading,
                webkitCompassAccuracy: f.webkitCompassAccuracy
            }, e)
        }
        _OnDeviceOrientationAbsolute(f) {
            this._isExportToVideo || this.PostToRuntime("deviceorientationabsolute", {
                absolute: !!f.absolute,
                alpha: f.alpha || 0,
                beta: f.beta || 0,
                gamma: f.gamma || 0,
                timeStamp: f.timeStamp
            }, e)
        }
        _OnDeviceMotion(f) {
            if (!this._isExportToVideo) {
                var g = null,
                    d = f.acceleration;
                d && (g = {
                    x: d.x || 0,
                    y: d.y || 0,
                    z: d.z || 0
                });
                d = null;
                var k = f.accelerationIncludingGravity;
                k && (d = {
                    x: k.x || 0,
                    y: k.y || 0,
                    z: k.z || 0
                });
                k = null;
                var l = f.rotationRate;
                l && (k = {
                    alpha: l.alpha || 0,
                    beta: l.beta || 0,
                    gamma: l.gamma || 0
                });
                this.PostToRuntime("devicemotion", {
                    acceleration: g,
                    accelerationIncludingGravity: d,
                    rotationRate: k,
                    interval: f.interval,
                    timeStamp: f.timeStamp
                }, e)
            }
        }
        _OnUpdateCanvasSize(f) {
            var g = this.GetRuntimeInterface();
            g.IsExportingToVideo() || (g = g.GetCanvas(), g.style.width = f.styleWidth + "px", g.style.height = f.styleHeight + "px", g.style.marginLeft = f.marginLeft + "px", g.style.marginTop = f.marginTop + "px", this._isFirstSizeUpdate && (g.style.display = "", this._isFirstSizeUpdate = !1))
        }
        _OnInvokeDownload(f) {
            const g = f.url;
            f = f.filename;
            const d = document.createElement("a"),
                k = document.body;
            d.textContent = f;
            d.href = g;
            d.download = f;
            k.appendChild(d);
            d.click();
            k.removeChild(d)
        }
        async _OnRasterSvgImage(f) {
            var g = f.imageBitmapOpts;
            f = await self.C3_RasterSvgImageBlob(f.blob, f.imageWidth, f.imageHeight, f.surfaceWidth, f.surfaceHeight);
            g = g ? await createImageBitmap(f, g) : await createImageBitmap(f);
            return {
                imageBitmap: g,
                transferables: [g]
            }
        }
        async _OnGetSvgImageSize(f) {
            return await self.C3_GetSvgImageSize(f.blob)
        }
        async _OnAddStylesheet(f) {
            await p(f.url)
        }
        _PlayPendingMedia() {
            var f = [...this._mediaPendingPlay];
            this._mediaPendingPlay.clear();
            if (!this._isSilent)
                for (const g of f)(f = g.play()) && f.catch(d => {
                    this._mediaRemovedPendingPlay.has(g) || this._mediaPendingPlay.add(g)
                })
        }
        TryPlayMedia(f) {
            if ("function" !== typeof f.play) throw Error("missing play function");
            this._mediaRemovedPendingPlay.delete(f);
            let g;
            try {
                g = f.play()
            } catch (d) {
                this._mediaPendingPlay.add(f);
                return
            }
            g && g.catch(d => {
                this._mediaRemovedPendingPlay.has(f) || this._mediaPendingPlay.add(f)
            })
        }
        RemovePendingPlay(f) {
            this._mediaPendingPlay.delete(f);
            this._mediaRemovedPendingPlay.add(f)
        }
        SetSilent(f) {
            this._isSilent = !!f
        }
        _OnHideCordovaSplash() {
            navigator.splashscreen && navigator.splashscreen.hide && navigator.splashscreen.hide()
        }
        _OnDebugHighlight(f) {
            if (f.show) {
                this._debugHighlightElem || (this._debugHighlightElem = document.createElement("div"), this._debugHighlightElem.id = "inspectOutline", document.body.appendChild(this._debugHighlightElem));
                var g = this._debugHighlightElem;
                g.style.display = "";
                g.style.left = f.left - 1 + "px";
                g.style.top = f.top - 1 + "px";
                g.style.width = f.width + 2 + "px";
                g.style.height = f.height + 2 + "px";
                g.textContent = f.name
            } else this._debugHighlightElem && (this._debugHighlightElem.style.display = "none")
        }
        _OnRegisterSW() {
            window.C3_RegisterSW && window.C3_RegisterSW()
        }
        _OnPostToDebugger(f) {
            window.c3_postToMessagePort && (f.from = "runtime", window.c3_postToMessagePort(f))
        }
        _InvokeFunctionFromJS(f, g) {
            return this.PostToRuntimeAsync("js-invoke-function", {
                name: f,
                params: g
            })
        }
        _OnAlert(f) {
            alert(f.message)
        }
        _OnWrapperMessage(f) {
            "entered-fullscreen" === f ? (c._SetWrapperIsFullscreenFlag(!0), this._OnFullscreenChange()) : "exited-fullscreen" === f ? (c._SetWrapperIsFullscreenFlag(!1), this._OnFullscreenChange()) : console.warn("Unknown wrapper message: ", f)
        }
        _SetExportingToVideo(f) {
            this._isExportToVideo = !0;
            const g = document.createElement("h1");
            g.id = "exportToVideoMessage";
            g.textContent = f.message;
            document.body.prepend(g);
            document.body.classList.add("exportingToVideo");
            this.GetRuntimeInterface().GetCanvas().style.display = "";
            this._iRuntime.SetIsExportingToVideo(f.duration)
        }
        _OnExportVideoProgress(f) {
            this._exportVideoProgressMessage = f.message; - 1 === this._exportVideoUpdateTimerId && (this._exportVideoUpdateTimerId = setTimeout(() => this._DoUpdateExportVideoProgressMessage(), 250))
        }
        _DoUpdateExportVideoProgressMessage() {
            this._exportVideoUpdateTimerId = -1;
            const f = document.getElementById("exportToVideoMessage");
            f && (f.textContent = this._exportVideoProgressMessage)
        }
        _OnExportedToVideo(f) {
            window.c3_postToMessagePort({
                type: "exported-video",
                blob: f.blob,
                time: f.time
            })
        }
    })
}
"use strict";
self.JobSchedulerDOM = class {
    constructor(c) {
        this._runtimeInterface = c;
        this._baseUrl = c.GetRuntimeBaseURL();
        "preview" === c.GetExportType() ? this._baseUrl += "workers/" : this._baseUrl += c.GetScriptFolder();
        this._maxNumWorkers = Math.min(navigator.hardwareConcurrency || 2, 16);
        this._dispatchWorker = null;
        this._jobWorkers = [];
        this._outputPort = this._inputPort = null
    }
    async Init() {
        if (this._hasInitialised) throw Error("already initialised");
        this._hasInitialised = !0;
        var c = this._runtimeInterface._GetWorkerURL("dispatchworker.js");
        this._dispatchWorker = await this._runtimeInterface.CreateWorker(c, this._baseUrl, {
            name: "DispatchWorker"
        });
        c = new MessageChannel;
        this._inputPort = c.port1;
        this._dispatchWorker.postMessage({
            type: "_init",
            "in-port": c.port2
        }, [c.port2]);
        this._outputPort = await this._CreateJobWorker()
    }
    async _CreateJobWorker() {
        const c = this._jobWorkers.length;
        var a = this._runtimeInterface._GetWorkerURL("jobworker.js");
        a = await this._runtimeInterface.CreateWorker(a, this._baseUrl, {
            name: "JobWorker" + c
        });
        const b = new MessageChannel,
            e = new MessageChannel;
        this._dispatchWorker.postMessage({
            type: "_addJobWorker",
            port: b.port1
        }, [b.port1]);
        a.postMessage({
            type: "init",
            number: c,
            "dispatch-port": b.port2,
            "output-port": e.port2
        }, [b.port2, e.port2]);
        this._jobWorkers.push(a);
        return e.port1
    }
    GetPortData() {
        return {
            inputPort: this._inputPort,
            outputPort: this._outputPort,
            maxNumWorkers: this._maxNumWorkers
        }
    }
    GetPortTransferables() {
        return [this._inputPort, this._outputPort]
    }
};
"use strict";
window.C3_IsSupported && (window.c3_runtimeInterface = new self.RuntimeInterface({
    useWorker: !1,
    workerMainUrl: "workermain.js",
    engineScripts: ["scripts/c3runtime.js"],
    projectScripts: [],
    mainProjectScript: "",
    scriptFolder: "scripts/",
    workerDependencyScripts: [],
    exportType: "html5"
}));
"use strict"; {
    const c = 180 / Math.PI;
    self.AudioDOMHandler = class extends self.DOMHandler {
        constructor(a) {
            super(a, "audio");
            this._destinationNode = this._audioContext = null;
            this._hasAttachedUnblockEvents = this._hasUnblocked = !1;
            this._unblockFunc = () => this._UnblockAudioContext();
            this._audioBuffers = [];
            this._audioInstances = [];
            this._lastAudioInstance = null;
            this._lastPlayedTag = "";
            this._lastTickCount = -1;
            this._pendingTags = new Map;
            this._masterVolume = 1;
            this._isSilent = !1;
            this._timeScaleMode = 0;
            this._timeScale = 1;
            this._gameTime = 0;
            this._panningModel = "HRTF";
            this._distanceModel = "inverse";
            this._refDistance = 600;
            this._maxDistance = 1E4;
            this._rolloffFactor = 1;
            this._hasAnySoftwareDecodedMusic = this._playMusicAsSound = !1;
            this._supportsWebMOpus = this._iRuntime.IsAudioFormatSupported("audio/webm; codecs=opus");
            this._effects = new Map;
            this._analysers = new Set;
            this._hasStartedOfflineRender = this._isPendingPostFxState = !1;
            this._microphoneTag = "";
            this._microphoneSource = null;
            self.C3Audio_OnMicrophoneStream = (b, e) => this._OnMicrophoneStream(b, e);
            this._destMediaStreamNode = null;
            self.C3Audio_GetOutputStream = () => this._OnGetOutputStream();
            self.C3Audio_DOMInterface = this;
            this.AddRuntimeMessageHandlers([
                ["create-audio-context", b => this._CreateAudioContext(b)],
                ["play", b => this._Play(b)],
                ["stop", b => this._Stop(b)],
                ["stop-all", () => this._StopAll()],
                ["set-paused", b => this._SetPaused(b)],
                ["set-volume", b => this._SetVolume(b)],
                ["fade-volume", b => this._FadeVolume(b)],
                ["set-master-volume", b => this._SetMasterVolume(b)],
                ["set-muted", b => this._SetMuted(b)],
                ["set-silent", b => this._SetSilent(b)],
                ["set-looping", b => this._SetLooping(b)],
                ["set-playback-rate", b => this._SetPlaybackRate(b)],
                ["seek", b => this._Seek(b)],
                ["preload", b => this._Preload(b)],
                ["unload", b => this._Unload(b)],
                ["unload-all", () => this._UnloadAll()],
                ["set-suspended", b => this._SetSuspended(b)],
                ["add-effect", b => this._AddEffect(b)],
                ["set-effect-param", b => this._SetEffectParam(b)],
                ["remove-effects", b => this._RemoveEffects(b)],
                ["tick", b => this._OnTick(b)],
                ["load-state", b => this._OnLoadState(b)],
                ["offline-render-audio", b => this._OnOfflineRenderAudio(b)],
                ["offline-render-finish", () => this._OnOfflineRenderFinish()]
            ])
        }
        async _CreateAudioContext(a) {
            a.isiOSCordova && (this._playMusicAsSound = !0);
            this._timeScaleMode = a.timeScaleMode;
            this._panningModel = ["equalpower", "HRTF", "soundfield"][a.panningModel];
            this._distanceModel = ["linear", "inverse", "exponential"][a.distanceModel];
            this._refDistance = a.refDistance;
            this._maxDistance = a.maxDistance;
            this._rolloffFactor = a.rolloffFactor;
            if (this._iRuntime.IsExportingToVideo()) this._playMusicAsSound = !0, this._audioContext = new OfflineAudioContext({
                numberOfChannels: 2,
                sampleRate: 48E3,
                length: Math.ceil(48E3 * this._iRuntime.GetExportToVideoDuration())
            });
            else {
                var b = {
                    latencyHint: a.latencyHint
                };
                this.SupportsWebMOpus() || (b.sampleRate = 48E3);
                if ("undefined" !== typeof AudioContext) this._audioContext = new AudioContext(b);
                else if ("undefined" !== typeof webkitAudioContext) this._audioContext = new webkitAudioContext(b);
                else throw Error("Web Audio API not supported");
                this._AttachUnblockEvents();
                this._audioContext.onstatechange = () => {
                    "running" !== this._audioContext.state && this._AttachUnblockEvents();
                    this.PostToRuntime("audiocontext-state", {
                        audioContextState: this._audioContext.state
                    })
                }
            }
            this._destinationNode = this._audioContext.createGain();
            this._destinationNode.connect(this._audioContext.destination);
            b = a.listenerPos;
            this._audioContext.listener.setPosition(b[0], b[1], b[2]);
            this._audioContext.listener.setOrientation(0, 0, 1, 0, -1, 0);
            self.C3_GetAudioContextCurrentTime = () => this.GetAudioCurrentTime();
            try {
                await Promise.all(a.preloadList.map(e => this._GetAudioBuffer(e.originalUrl, e.url, e.type, !1)))
            } catch (e) {
                console.error("[Construct 3] Preloading sounds failed: ", e)
            }
            return {
                sampleRate: this._audioContext.sampleRate,
                audioContextState: this._audioContext.state
            }
        }
        _AttachUnblockEvents() {
            this._hasAttachedUnblockEvents || (this._hasUnblocked = !1, window.addEventListener("pointerup", this._unblockFunc, !0), window.addEventListener("touchend", this._unblockFunc, !0), window.addEventListener("click", this._unblockFunc, !0), window.addEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !0)
        }
        _DetachUnblockEvents() {
            this._hasAttachedUnblockEvents && (this._hasUnblocked = !0, window.removeEventListener("pointerup", this._unblockFunc, !0), window.removeEventListener("touchend", this._unblockFunc, !0), window.removeEventListener("click", this._unblockFunc, !0), window.removeEventListener("keydown", this._unblockFunc, !0), this._hasAttachedUnblockEvents = !1)
        }
        _UnblockAudioContext() {
            if (!this._hasUnblocked) {
                var a = this._audioContext;
                "suspended" === a.state && a.resume && a.resume();
                var b = a.createBuffer(1, 220, 22050),
                    e = a.createBufferSource();
                e.buffer = b;
                e.connect(a.destination);
                e.start(0);
                "running" === a.state && this._DetachUnblockEvents()
            }
        }
        GetAudioContext() {
            return this._audioContext
        }
        GetAudioCurrentTime() {
            return this._audioContext.currentTime
        }
        GetDestinationNode() {
            return this._destinationNode
        }
        GetDestinationForTag(a) {
            return (a = this._effects.get(a.toLowerCase())) ? a[0].GetInputNode() : this.GetDestinationNode()
        }
        AddEffectForTag(a, b) {
            a = a.toLowerCase();
            let e = this._effects.get(a);
            e || (e = [], this._effects.set(a, e));
            b._SetIndex(e.length);
            b._SetTag(a);
            e.push(b);
            this._ReconnectEffects(a)
        }
        _ReconnectEffects(a) {
            let b = this.GetDestinationNode();
            const e = this._effects.get(a);
            if (e && e.length) {
                b = e[0].GetInputNode();
                for (let h = 0, m = e.length; h < m; ++h) {
                    const p = e[h];
                    h + 1 === m ? p.ConnectTo(this.GetDestinationNode()) : p.ConnectTo(e[h + 1].GetInputNode())
                }
            }
            for (const h of this.audioInstancesByTag(a)) h.Reconnect(b);
            this._microphoneSource && this._microphoneTag === a && (this._microphoneSource.disconnect(), this._microphoneSource.connect(b))
        }
        GetMasterVolume() {
            return this._masterVolume
        }
        IsSilent() {
            return this._isSilent
        }
        GetTimeScaleMode() {
            return this._timeScaleMode
        }
        GetTimeScale() {
            return this._timeScale
        }
        GetGameTime() {
            return this._gameTime
        }
        IsPlayMusicAsSound() {
            return this._playMusicAsSound
        }
        SupportsWebMOpus() {
            return this._supportsWebMOpus
        }
        _SetHasAnySoftwareDecodedMusic() {
            this._hasAnySoftwareDecodedMusic = !0
        }
        GetPanningModel() {
            return this._panningModel
        }
        GetDistanceModel() {
            return this._distanceModel
        }
        GetReferenceDistance() {
            return this._refDistance
        }
        GetMaxDistance() {
            return this._maxDistance
        }
        GetRolloffFactor() {
            return this._rolloffFactor
        }
        DecodeAudioData(a, b) {
            return b ? this._iRuntime._WasmDecodeWebMOpus(a).then(e => {
                const h = this._audioContext.createBuffer(1, e.length, 48E3);
                h.getChannelData(0).set(e);
                return h
            }) : new Promise((e, h) => {
                this._audioContext.decodeAudioData(a, e, h)
            })
        }
        TryPlayMedia(a) {
            this._iRuntime.TryPlayMedia(a)
        }
        RemovePendingPlay(a) {
            this._iRuntime.RemovePendingPlay(a)
        }
        ReleaseInstancesForBuffer(a) {
            let b = 0;
            for (let e = 0, h = this._audioInstances.length; e < h; ++e) {
                const m = this._audioInstances[e];
                this._audioInstances[b] = m;
                m.GetBuffer() === a ? m.Release() : ++b
            }
            this._audioInstances.length = b
        }
        ReleaseAllMusicBuffers() {
            let a = 0;
            for (let b = 0, e = this._audioBuffers.length; b < e; ++b) {
                const h = this._audioBuffers[b];
                this._audioBuffers[a] = h;
                h.IsMusic() ? h.Release() : ++a
            }
            this._audioBuffers.length = a
        }* audioInstancesByTag(a) {
            if (a)
                for (const b of this._audioInstances) self.AudioDOMHandler.EqualsNoCase(b.GetTag(), a) && (yield b);
            else this._lastAudioInstance && !this._lastAudioInstance.HasEnded() && (yield this._lastAudioInstance)
        }
        async _GetAudioBuffer(a, b, e, h, m) {
            for (const p of this._audioBuffers)
                if (p.GetUrl() === b) return await p.Load(), p;
            if (m) return null;
            h && (this._playMusicAsSound || this._hasAnySoftwareDecodedMusic) && this.ReleaseAllMusicBuffers();
            a = self.C3AudioBuffer.Create(this, a, b, e, h);
            this._audioBuffers.push(a);
            await a.Load();
            return a
        }
        async _GetAudioInstance(a, b, e, h, m) {
            for (const p of this._audioInstances)
                if (p.GetUrl() === b && (p.CanBeRecycled() || m)) return p.SetTag(h),
                    p;
            a = (await this._GetAudioBuffer(a, b, e, m)).CreateInstance(h);
            this._audioInstances.push(a);
            return a
        }
        _AddPendingTag(a) {
            let b = this._pendingTags.get(a);
            if (!b) {
                let e = null;
                b = {
                    pendingCount: 0,
                    promise: new Promise(h => e = h),
                    resolve: e
                };
                this._pendingTags.set(a, b)
            }
            b.pendingCount++
        }
        _RemovePendingTag(a) {
            const b = this._pendingTags.get(a);
            if (!b) throw Error("expected pending tag");
            b.pendingCount--;
            0 === b.pendingCount && (b.resolve(), this._pendingTags.delete(a))
        }
        TagReady(a) {
            a || (a = this._lastPlayedTag);
            return (a = this._pendingTags.get(a)) ? a.promise : Promise.resolve()
        }
        _MaybeStartTicking() {
            if (0 < this._analysers.size) this._StartTicking();
            else
                for (const a of this._audioInstances)
                    if (a.IsActive()) {
                        this._StartTicking();
                        break
                    }
        }
        Tick() {
            for (var a of this._analysers) a.Tick();
            a = this.GetAudioCurrentTime();
            for (var b of this._audioInstances) b.Tick(a);
            b = this._audioInstances.filter(e => e.IsActive()).map(e => e.GetState());
            this.PostToRuntime("state", {
                tickCount: this._lastTickCount,
                audioInstances: b,
                analysers: [...this._analysers].map(e => e.GetData())
            });
            0 === b.length && 0 === this._analysers.size && this._StopTicking()
        }
        PostTrigger(a, b, e) {
            this.PostToRuntime("trigger", {
                type: a,
                tag: b,
                aiid: e
            })
        }
        async _Play(a) {
            const b = a.originalUrl,
                e = a.url,
                h = a.type,
                m = a.isMusic,
                p = a.tag,
                u = a.isLooping,
                z = a.vol,
                B = a.pos,
                v = a.panning;
            let w = a.off;
            0 < w && !a.trueClock && (this._audioContext.getOutputTimestamp ? (a = this._audioContext.getOutputTimestamp(), w = w - a.performanceTime / 1E3 + a.contextTime) : w = w - performance.now() / 1E3 + this._audioContext.currentTime);
            this._lastPlayedTag = p;
            this._AddPendingTag(p);
            try {
                this._lastAudioInstance = await this._GetAudioInstance(b, e, h, p, m), v ? (this._lastAudioInstance.SetPannerEnabled(!0), this._lastAudioInstance.SetPan(v.x, v.y, v.angle, v.innerAngle, v.outerAngle, v.outerGain), v.hasOwnProperty("uid") && this._lastAudioInstance.SetUID(v.uid)) : this._lastAudioInstance.SetPannerEnabled(!1), this._lastAudioInstance.Play(u, z, B, w)
            } catch (A) {
                console.error("[Construct 3] Audio: error starting playback: ", A);
                return
            } finally {
                this._RemovePendingTag(p)
            }
            this._StartTicking()
        }
        _Stop(a) {
            a = a.tag;
            for (const b of this.audioInstancesByTag(a)) b.Stop()
        }
        _StopAll() {
            for (const a of this._audioInstances) a.Stop()
        }
        _SetPaused(a) {
            const b = a.tag;
            a = a.paused;
            for (const e of this.audioInstancesByTag(b)) a ? e.Pause() : e.Resume();
            this._MaybeStartTicking()
        }
        _SetVolume(a) {
            const b = a.tag;
            a = a.vol;
            for (const e of this.audioInstancesByTag(b)) e.SetVolume(a)
        }
        async _FadeVolume(a) {
            const b = a.tag,
                e = a.vol,
                h = a.duration;
            a = a.stopOnEnd;
            await this.TagReady(b);
            for (const m of this.audioInstancesByTag(b)) m.FadeVolume(e, h, a);
            this._MaybeStartTicking()
        }
        _SetMasterVolume(a) {
            this._masterVolume = a.vol;
            this._destinationNode.gain.value = this._masterVolume
        }
        _SetMuted(a) {
            const b = a.tag;
            a = a.isMuted;
            for (const e of this.audioInstancesByTag(b)) e.SetMuted(a)
        }
        _SetSilent(a) {
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            for (const b of this._audioInstances) b._UpdateMuted()
        }
        _SetLooping(a) {
            const b = a.tag;
            a = a.isLooping;
            for (const e of this.audioInstancesByTag(b)) e.SetLooping(a)
        }
        async _SetPlaybackRate(a) {
            const b = a.tag;
            a = a.rate;
            await this.TagReady(b);
            for (const e of this.audioInstancesByTag(b)) e.SetPlaybackRate(a)
        }
        async _Seek(a) {
            const b = a.tag;
            a = a.pos;
            await this.TagReady(b);
            for (const e of this.audioInstancesByTag(b)) e.Seek(a)
        }
        async _Preload(a) {
            const b = a.originalUrl,
                e = a.url,
                h = a.type;
            a = a.isMusic;
            try {
                await this._GetAudioInstance(b, e, h, "", a)
            } catch (m) {
                console.error("[Construct 3] Audio: error preloading: ", m)
            }
        }
        async _Unload(a) {
            if (a = await this._GetAudioBuffer("", a.url, a.type, a.isMusic, !0)) a.Release(), a = this._audioBuffers.indexOf(a), -1 !== a && this._audioBuffers.splice(a, 1)
        }
        _UnloadAll() {
            for (const a of this._audioBuffers) a.Release();
            this._audioBuffers.length = 0
        }
        _SetSuspended(a) {
            a = a.isSuspended;
            !a && this._audioContext.resume && this._audioContext.resume();
            for (const b of this._audioInstances) b.SetSuspended(a);
            a && this._audioContext.suspend && this._audioContext.suspend()
        }
        _OnTick(a) {
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            this._lastTickCount = a.tickCount;
            if (0 !== this._timeScaleMode)
                for (var b of this._audioInstances) b._UpdatePlaybackRate();
            (b = a.listenerPos) && this._audioContext.listener.setPosition(b[0], b[1], b[2]);
            for (const e of a.instPans) {
                a = e.uid;
                for (const h of this._audioInstances) h.GetUID() === a && h.SetPanXYA(e.x, e.y, e.angle)
            }
        }
        async _AddEffect(a) {
            var b = a.type;
            const e = a.tag;
            var h = a.params;
            if ("filter" === b) h = new self.C3AudioFilterFX(this, ...h);
            else if ("delay" === b) h = new self.C3AudioDelayFX(this, ...h);
            else if ("convolution" === b) {
                b = null;
                try {
                    b = await this._GetAudioBuffer(a.bufferOriginalUrl, a.bufferUrl, a.bufferType, !1)
                } catch (m) {
                    console.log("[Construct 3] Audio: error loading convolution: ", m);
                    return
                }
                h = new self.C3AudioConvolveFX(this, b.GetAudioBuffer(), ...h);
                h._SetBufferInfo(a.bufferOriginalUrl, a.bufferUrl, a.bufferType)
            } else if ("flanger" === b) h = new self.C3AudioFlangerFX(this, ...h);
            else if ("phaser" === b) h = new self.C3AudioPhaserFX(this, ...h);
            else if ("gain" === b) h = new self.C3AudioGainFX(this, ...h);
            else if ("tremolo" === b) h = new self.C3AudioTremoloFX(this, ...h);
            else if ("ringmod" === b) h = new self.C3AudioRingModFX(this, ...h);
            else if ("distortion" === b) h = new self.C3AudioDistortionFX(this, ...h);
            else if ("compressor" === b) h = new self.C3AudioCompressorFX(this, ...h);
            else if ("analyser" === b) h = new self.C3AudioAnalyserFX(this, ...h);
            else throw Error("invalid effect type");
            this.AddEffectForTag(e, h);
            this._PostUpdatedFxState()
        }
        _SetEffectParam(a) {
            const b = a.index,
                e = a.param,
                h = a.value,
                m = a.ramp,
                p = a.time;
            a = this._effects.get(a.tag);
            !a || 0 > b || b >= a.length || (a[b].SetParam(e, h, m, p), this._PostUpdatedFxState())
        }
        _RemoveEffects(a) {
            a = a.tag.toLowerCase();
            const b = this._effects.get(a);
            if (b && b.length) {
                for (const e of b) e.Release();
                this._effects.delete(a);
                this._ReconnectEffects(a)
            }
        }
        _AddAnalyser(a) {
            this._analysers.add(a);
            this._MaybeStartTicking()
        }
        _RemoveAnalyser(a) {
            this._analysers.delete(a)
        }
        _PostUpdatedFxState() {
            this._isPendingPostFxState || (this._isPendingPostFxState = !0, Promise.resolve().then(() => this._DoPostUpdatedFxState()))
        }
        _DoPostUpdatedFxState() {
            const a = {};
            for (const [b, e] of this._effects) a[b] = e.map(h => h.GetState());
            this.PostToRuntime("fxstate", {
                fxstate: a
            });
            this._isPendingPostFxState = !1
        }
        async _OnLoadState(a) {
            const b = a.saveLoadMode;
            if (3 !== b)
                for (var e of this._audioInstances) e.IsMusic() && 1 === b || (e.IsMusic() || 2 !== b) && e.Stop();
            for (const h of this._effects.values())
                for (const m of h) m.Release();
            this._effects.clear();
            this._timeScale = a.timeScale;
            this._gameTime = a.gameTime;
            e = a.listenerPos;
            this._audioContext.listener.setPosition(e[0], e[1], e[2]);
            this._isSilent = a.isSilent;
            this._iRuntime.SetSilent(this._isSilent);
            this._masterVolume = a.masterVolume;
            this._destinationNode.gain.value = this._masterVolume;
            e = [];
            for (const h of Object.values(a.effects)) e.push(Promise.all(h.map(m => this._AddEffect(m))));
            await Promise.all(e);
            await Promise.all(a.playing.map(h => this._LoadAudioInstance(h, b)));
            this._MaybeStartTicking()
        }
        async _LoadAudioInstance(a, b) {
            if (3 !== b) {
                var e = a.bufferOriginalUrl,
                    h = a.bufferUrl,
                    m = a.bufferType,
                    p = a.isMusic,
                    u = a.tag,
                    z = a.isLooping,
                    B = a.volume,
                    v = a.playbackTime;
                if (!p || 1 !== b)
                    if (p || 2 !== b) {
                        b = null;
                        try {
                            b = await this._GetAudioInstance(e, h, m, u, p)
                        } catch (w) {
                            console.error("[Construct 3] Audio: error loading audio state: ", w);
                            return
                        }
                        b.LoadPanState(a.pan);
                        b.Play(z, B, v, 0);
                        a.isPlaying || b.Pause();
                        b._LoadAdditionalState(a)
                    }
            }
        }
        _OnMicrophoneStream(a, b) {
            this._microphoneSource && this._microphoneSource.disconnect();
            this._microphoneTag = b.toLowerCase();
            this._microphoneSource = this._audioContext.createMediaStreamSource(a);
            this._microphoneSource.connect(this.GetDestinationForTag(this._microphoneTag))
        }
        _OnGetOutputStream() {
            this._destMediaStreamNode || (this._destMediaStreamNode = this._audioContext.createMediaStreamDestination(), this._destinationNode.connect(this._destMediaStreamNode));
            return this._destMediaStreamNode.stream
        }
        async _OnOfflineRenderAudio(a) {
            try {
                const b = this._audioContext.suspend(a.time);
                this._hasStartedOfflineRender ? this._audioContext.resume() : (this._audioContext.startRendering().then(e => this._OnOfflineRenderCompleted(e)).catch(e => this._OnOfflineRenderError(e)), this._hasStartedOfflineRender = !0);
                await b
            } catch (b) {
                this._OnOfflineRenderError(b)
            }
        }
        _OnOfflineRenderFinish() {
            this._audioContext.resume()
        }
        _OnOfflineRenderCompleted(a) {
            const b = [];
            for (let e = 0, h = a.numberOfChannels; e < h; ++e) {
                const m = a.getChannelData(e);
                b.push(m.buffer)
            }
            this._iRuntime.PostToRuntimeComponent("runtime", "offline-audio-render-completed", {
                duration: a.duration,
                length: a.length,
                numberOfChannels: a.numberOfChannels,
                sampleRate: a.sampleRate,
                channelData: b
            }, null, b)
        }
        _OnOfflineRenderError(a) {
            console.error("[Audio] Offline rendering error: ", a)
        }
        static EqualsNoCase(a, b) {
            return a.length !== b.length ? !1 : a === b ? !0 : a.toLowerCase() === b.toLowerCase()
        }
        static ToDegrees(a) {
            return a * c
        }
        static DbToLinearNoCap(a) {
            return Math.pow(10, a / 20)
        }
        static DbToLinear(a) {
            return Math.max(Math.min(self.AudioDOMHandler.DbToLinearNoCap(a), 1), 0)
        }
        static LinearToDbNoCap(a) {
            return Math.log(a) / Math.log(10) * 20
        }
        static LinearToDb(a) {
            return self.AudioDOMHandler.LinearToDbNoCap(Math.max(Math.min(a, 1), 0))
        }
        static e4(a, b) {
            return 1 - Math.exp(-b * a)
        }
    };
    self.RuntimeInterface.AddDOMHandlerClass(self.AudioDOMHandler)
}
"use strict";
self.C3AudioBuffer = class {
    constructor(c, a, b, e, h) {
        this._audioDomHandler = c;
        this._originalUrl = a;
        this._url = b;
        this._type = e;
        this._isMusic = h;
        this._api = "";
        this._loadState = "not-loaded";
        this._loadPromise = null
    }
    Release() {
        this._loadState = "not-loaded";
        this._loadPromise = this._audioDomHandler = null
    }
    static Create(c, a, b, e, h) {
        const m = "audio/webm; codecs=opus" === e && !c.SupportsWebMOpus();
        h && m && c._SetHasAnySoftwareDecodedMusic();
        return !h || c.IsPlayMusicAsSound() || m ? new self.C3WebAudioBuffer(c, a, b, e, h, m) : new self.C3Html5AudioBuffer(c, a, b, e, h)
    }
    CreateInstance(c) {
        return "html5" === this._api ? new self.C3Html5AudioInstance(this._audioDomHandler, this, c) : new self.C3WebAudioInstance(this._audioDomHandler, this, c)
    }
    _Load() {}
    Load() {
        this._loadPromise || (this._loadPromise = this._Load());
        return this._loadPromise
    }
    IsLoaded() {}
    IsLoadedAndDecoded() {}
    HasFailedToLoad() {
        return "failed" === this._loadState
    }
    GetAudioContext() {
        return this._audioDomHandler.GetAudioContext()
    }
    GetApi() {
        return this._api
    }
    GetOriginalUrl() {
        return this._originalUrl
    }
    GetUrl() {
        return this._url
    }
    GetContentType() {
        return this._type
    }
    IsMusic() {
        return this._isMusic
    }
    GetDuration() {}
};
"use strict";
self.C3Html5AudioBuffer = class extends self.C3AudioBuffer {
    constructor(c, a, b, e, h) {
        super(c, a, b, e, h);
        this._api = "html5";
        this._audioElem = new Audio;
        this._audioElem.crossOrigin = "anonymous";
        this._audioElem.autoplay = !1;
        this._audioElem.preload = "auto";
        this._loadReject = this._loadResolve = null;
        this._reachedCanPlayThrough = !1;
        this._audioElem.addEventListener("canplaythrough", () => this._reachedCanPlayThrough = !0);
        this._outNode = this.GetAudioContext().createGain();
        this._mediaSourceNode = null;
        this._audioElem.addEventListener("canplay", () => {
            this._loadResolve && (this._loadState = "loaded", this._loadResolve(), this._loadReject = this._loadResolve = null);
            !this._mediaSourceNode && this._audioElem && (this._mediaSourceNode = this.GetAudioContext().createMediaElementSource(this._audioElem), this._mediaSourceNode.connect(this._outNode))
        });
        this.onended = null;
        this._audioElem.addEventListener("ended", () => {
            if (this.onended) this.onended()
        });
        this._audioElem.addEventListener("error", m => this._OnError(m))
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._outNode.disconnect();
        this._outNode = null;
        this._mediaSourceNode.disconnect();
        this._mediaSourceNode = null;
        this._audioElem && !this._audioElem.paused && this._audioElem.pause();
        this._audioElem = this.onended = null;
        super.Release()
    }
    _Load() {
        this._loadState = "loading";
        return new Promise((c, a) => {
            this._loadResolve = c;
            this._loadReject = a;
            this._audioElem.src = this._url
        })
    }
    _OnError(c) {
        console.error(`[Construct 3] Audio '${this._url}' error: `, c);
        this._loadReject && (this._loadState = "failed", this._loadReject(c), this._loadReject = this._loadResolve = null)
    }
    IsLoaded() {
        const c = 4 <= this._audioElem.readyState;
        c && (this._reachedCanPlayThrough = !0);
        return c || this._reachedCanPlayThrough
    }
    IsLoadedAndDecoded() {
        return this.IsLoaded()
    }
    GetAudioElement() {
        return this._audioElem
    }
    GetOutputNode() {
        return this._outNode
    }
    GetDuration() {
        return this._audioElem.duration
    }
};
"use strict";
self.C3WebAudioBuffer = class extends self.C3AudioBuffer {
    constructor(c, a, b, e, h, m) {
        super(c, a, b, e, h);
        this._api = "webaudio";
        this._audioBuffer = this._audioData = null;
        this._needsSoftwareDecode = !!m
    }
    Release() {
        this._audioDomHandler.ReleaseInstancesForBuffer(this);
        this._audioBuffer = this._audioData = null;
        super.Release()
    }
    async _Fetch() {
        if (this._audioData) return this._audioData;
        var c = this._audioDomHandler.GetRuntimeInterface();
        if ("cordova" === c.GetExportType() && c.IsRelativeURL(this._url) && c.IsFileProtocol()) this._audioData = await c.CordovaFetchLocalFileAsArrayBuffer(this._url);
        else {
            c = await fetch(this._url);
            if (!c.ok) throw Error(`error fetching audio data: ${c.status} ${c.statusText}`);
            this._audioData = await c.arrayBuffer()
        }
    }
    async _Decode() {
        if (this._audioBuffer) return this._audioBuffer;
        this._audioBuffer = await this._audioDomHandler.DecodeAudioData(this._audioData, this._needsSoftwareDecode);
        this._audioData = null
    }
    async _Load() {
        try {
            this._loadState = "loading", await this._Fetch(), await this._Decode(), this._loadState = "loaded"
        } catch (c) {
            this._loadState = "failed", console.error(`[Construct 3] Failed to load audio '${this._url}': `, c)
        }
    }
    IsLoaded() {
        return !(!this._audioData && !this._audioBuffer)
    }
    IsLoadedAndDecoded() {
        return !!this._audioBuffer
    }
    GetAudioBuffer() {
        return this._audioBuffer
    }
    GetDuration() {
        return this._audioBuffer ? this._audioBuffer.duration : 0
    }
};
"use strict"; {
    let c = 0;
    self.C3AudioInstance = class {
        constructor(a, b, e) {
            this._audioDomHandler = a;
            this._buffer = b;
            this._tag = e;
            this._aiId = c++;
            this._gainNode = this.GetAudioContext().createGain();
            this._gainNode.connect(this.GetDestinationNode());
            this._pannerNode = null;
            this._isPannerEnabled = !1;
            this._pannerPosition = [0, 0, 0];
            this._pannerOrientation = [0, 0, 0];
            this._isStopped = !0;
            this._isLooping = this._resumeMe = this._isPaused = !1;
            this._volume = 1;
            this._isMuted = !1;
            this._playbackRate = 1;
            a = this._audioDomHandler.GetTimeScaleMode();
            this._isTimescaled = 1 === a && !this.IsMusic() || 2 === a;
            this._fadeEndTime = this._instUid = -1;
            this._stopOnFadeEnd = !1
        }
        Release() {
            this._buffer = this._audioDomHandler = null;
            this._pannerNode && (this._pannerNode.disconnect(), this._pannerNode = null);
            this._gainNode.disconnect();
            this._gainNode = null
        }
        GetAudioContext() {
            return this._audioDomHandler.GetAudioContext()
        }
        GetDestinationNode() {
            return this._audioDomHandler.GetDestinationForTag(this._tag)
        }
        GetCurrentTime() {
            return this._isTimescaled ? this._audioDomHandler.GetGameTime() : performance.now() / 1E3
        }
        GetOriginalUrl() {
            return this._buffer.GetOriginalUrl()
        }
        GetUrl() {
            return this._buffer.GetUrl()
        }
        GetContentType() {
            return this._buffer.GetContentType()
        }
        GetBuffer() {
            return this._buffer
        }
        IsMusic() {
            return this._buffer.IsMusic()
        }
        SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        GetAiId() {
            return this._aiId
        }
        HasEnded() {}
        CanBeRecycled() {}
        IsPlaying() {
            return !this._isStopped && !this._isPaused && !this.HasEnded()
        }
        IsActive() {
            return !this._isStopped && !this.HasEnded()
        }
        GetPlaybackTime() {}
        GetDuration(a) {
            let b = this._buffer.GetDuration();
            a && (b /= this._playbackRate || .001);
            return b
        }
        Play(a, b, e, h) {}
        Stop() {}
        Pause() {}
        IsPaused() {
            return this._isPaused
        }
        Resume() {}
        SetVolume(a) {
            this._volume = a;
            this._gainNode.gain.cancelScheduledValues(0);
            this._fadeEndTime = -1;
            this._gainNode.gain.value = this.GetOutputVolume()
        }
        FadeVolume(a, b, e) {
            if (!this.IsMuted()) {
                var h = this._gainNode.gain;
                h.cancelScheduledValues(0);
                var m = this._audioDomHandler.GetAudioCurrentTime();
                b = m + b;
                h.setValueAtTime(h.value, m);
                h.linearRampToValueAtTime(a, b);
                this._volume = a;
                this._fadeEndTime = b;
                this._stopOnFadeEnd = e
            }
        }
        _UpdateVolume() {
            this.SetVolume(this._volume)
        }
        Tick(a) {
            -1 !== this._fadeEndTime && a >= this._fadeEndTime && (this._fadeEndTime = -1, this._stopOnFadeEnd && this.Stop(), this._audioDomHandler.PostTrigger("fade-ended", this._tag, this._aiId))
        }
        GetOutputVolume() {
            const a = this._volume;
            return isFinite(a) ? a : 0
        }
        SetMuted(a) {
            a = !!a;
            this._isMuted !== a && (this._isMuted = a, this._UpdateMuted())
        }
        IsMuted() {
            return this._isMuted
        }
        IsSilent() {
            return this._audioDomHandler.IsSilent()
        }
        _UpdateMuted() {}
        SetLooping(a) {}
        IsLooping() {
            return this._isLooping
        }
        SetPlaybackRate(a) {
            this._playbackRate !== a && (this._playbackRate = a, this._UpdatePlaybackRate())
        }
        _UpdatePlaybackRate() {}
        GetPlaybackRate() {
            return this._playbackRate
        }
        Seek(a) {}
        SetSuspended(a) {}
        SetPannerEnabled(a) {
            a = !!a;
            this._isPannerEnabled !== a && ((this._isPannerEnabled = a) ? (this._pannerNode || (this._pannerNode = this.GetAudioContext().createPanner(), this._pannerNode.panningModel = this._audioDomHandler.GetPanningModel(), this._pannerNode.distanceModel = this._audioDomHandler.GetDistanceModel(), this._pannerNode.refDistance = this._audioDomHandler.GetReferenceDistance(), this._pannerNode.maxDistance = this._audioDomHandler.GetMaxDistance(), this._pannerNode.rolloffFactor = this._audioDomHandler.GetRolloffFactor()), this._gainNode.disconnect(), this._gainNode.connect(this._pannerNode), this._pannerNode.connect(this.GetDestinationNode())) : (this._pannerNode.disconnect(), this._gainNode.disconnect(), this._gainNode.connect(this.GetDestinationNode())))
        }
        SetPan(a, b, e, h, m, p) {
            this._isPannerEnabled && (this.SetPanXYA(a, b, e), a = self.AudioDOMHandler.ToDegrees, this._pannerNode.coneInnerAngle = a(h), this._pannerNode.coneOuterAngle = a(m), this._pannerNode.coneOuterGain = p)
        }
        SetPanXYA(a, b, e) {
            this._isPannerEnabled && (this._pannerPosition[0] = a, this._pannerPosition[1] = b, this._pannerPosition[2] = 0, this._pannerOrientation[0] = Math.cos(e), this._pannerOrientation[1] = Math.sin(e), this._pannerOrientation[2] = 0, this._pannerNode.setPosition(...this._pannerPosition), this._pannerNode.setOrientation(...this._pannerOrientation))
        }
        SetUID(a) {
            this._instUid = a
        }
        GetUID() {
            return this._instUid
        }
        GetResumePosition() {}
        Reconnect(a) {
            const b = this._pannerNode || this._gainNode;
            b.disconnect();
            b.connect(a)
        }
        GetState() {
            return {
                aiid: this.GetAiId(),
                tag: this._tag,
                duration: this.GetDuration(),
                volume: this._volume,
                isPlaying: this.IsPlaying(),
                playbackTime: this.GetPlaybackTime(),
                playbackRate: this.GetPlaybackRate(),
                uid: this._instUid,
                bufferOriginalUrl: this.GetOriginalUrl(),
                bufferUrl: "",
                bufferType: this.GetContentType(),
                isMusic: this.IsMusic(),
                isLooping: this.IsLooping(),
                isMuted: this.IsMuted(),
                resumePosition: this.GetResumePosition(),
                pan: this.GetPanState()
            }
        }
        _LoadAdditionalState(a) {
            this.SetPlaybackRate(a.playbackRate);
            this.SetMuted(a.isMuted)
        }
        GetPanState() {
            if (!this._pannerNode) return null;
            const a = this._pannerNode;
            return {
                pos: this._pannerPosition,
                orient: this._pannerOrientation,
                cia: a.coneInnerAngle,
                coa: a.coneOuterAngle,
                cog: a.coneOuterGain,
                uid: this._instUid
            }
        }
        LoadPanState(a) {
            if (a) {
                this.SetPannerEnabled(!0);
                a = this._pannerNode;
                var b = a.pos;
                this._pannerPosition[0] = b[0];
                this._pannerPosition[1] = b[1];
                this._pannerPosition[2] = b[2];
                b = a.orient;
                this._pannerOrientation[0] = b[0];
                this._pannerOrientation[1] = b[1];
                this._pannerOrientation[2] = b[2];
                a.setPosition(...this._pannerPosition);
                a.setOrientation(...this._pannerOrientation);
                a.coneInnerAngle = a.cia;
                a.coneOuterAngle = a.coa;
                a.coneOuterGain = a.cog;
                this._instUid = a.uid
            } else this.SetPannerEnabled(!1)
        }
    }
}
"use strict";
self.C3Html5AudioInstance = class extends self.C3AudioInstance {
    constructor(c, a, b) {
        super(c, a, b);
        this._buffer.GetOutputNode().connect(this._gainNode);
        this._buffer.onended = () => this._OnEnded()
    }
    Release() {
        this.Stop();
        this._buffer.GetOutputNode().disconnect();
        super.Release()
    }
    GetAudioElement() {
        return this._buffer.GetAudioElement()
    }
    _OnEnded() {
        this._isStopped = !0;
        this._instUid = -1;
        this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId)
    }
    HasEnded() {
        return this.GetAudioElement().ended
    }
    CanBeRecycled() {
        return this._isStopped ? !0 : this.HasEnded()
    }
    GetPlaybackTime() {
        let c = this.GetAudioElement().currentTime;
        this._isLooping || (c = Math.min(c, this.GetDuration()));
        return c
    }
    Play(c, a, b, e) {
        e = this.GetAudioElement();
        1 !== e.playbackRate && (e.playbackRate = 1);
        e.loop !== c && (e.loop = c);
        this.SetVolume(a);
        e.muted && (e.muted = !1);
        if (e.currentTime !== b) try {
            e.currentTime = b
        } catch (h) {
            console.warn(`[Construct 3] Exception seeking audio '${this._buffer.GetUrl()}' to position '${b}': `, h)
        }
        this._audioDomHandler.TryPlayMedia(e);
        this._isPaused = this._isStopped = !1;
        this._isLooping = c;
        this._playbackRate = 1
    }
    Stop() {
        const c = this.GetAudioElement();
        c.paused || c.pause();
        this._audioDomHandler.RemovePendingPlay(c);
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        if (!(this._isPaused || this._isStopped || this.HasEnded())) {
            var c = this.GetAudioElement();
            c.paused || c.pause();
            this._audioDomHandler.RemovePendingPlay(c);
            this._isPaused = !0
        }
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._isPaused = !1)
    }
    _UpdateMuted() {
        this.GetAudioElement().muted = this._isMuted || this.IsSilent()
    }
    SetLooping(c) {
        c = !!c;
        this._isLooping !== c && (this._isLooping = c, this.GetAudioElement().loop = c)
    }
    _UpdatePlaybackRate() {
        let c = this._playbackRate;
        this._isTimescaled && (c *= this._audioDomHandler.GetTimeScale());
        try {
            this.GetAudioElement().playbackRate = c
        } catch (a) {
            console.warn(`[Construct 3] Unable to set playback rate '${c}':`, a)
        }
    }
    Seek(c) {
        if (!this._isStopped && !this.HasEnded()) try {
            this.GetAudioElement().currentTime = c
        } catch (a) {
            console.warn(`[Construct 3] Error seeking audio to '${c}': `, a)
        }
    }
    GetResumePosition() {
        return this.GetPlaybackTime()
    }
    SetSuspended(c) {
        c ? this.IsPlaying() ? (this.GetAudioElement().pause(), this._resumeMe = !0) : this._resumeMe = !1 : this._resumeMe && (this._audioDomHandler.TryPlayMedia(this.GetAudioElement()), this._resumeMe = !1)
    }
};
"use strict";
self.C3WebAudioInstance = class extends self.C3AudioInstance {
    constructor(c, a, b) {
        super(c, a, b);
        this._bufferSource = null;
        this._onended_handler = e => this._OnEnded(e);
        this._hasPlaybackEnded = !0;
        this._activeSource = null;
        this._resumePosition = this._playFromSeekPos = this._playStartTime = 0;
        this._muteVol = 1
    }
    Release() {
        this.Stop();
        this._ReleaseBufferSource();
        this._onended_handler = null;
        super.Release()
    }
    _ReleaseBufferSource() {
        this._bufferSource && this._bufferSource.disconnect();
        this._activeSource = this._bufferSource = null
    }
    _OnEnded(c) {
        this._isPaused || this._resumeMe || c.target !== this._activeSource || (this._isStopped = this._hasPlaybackEnded = !0, this._instUid = -1, this._ReleaseBufferSource(), this._audioDomHandler.PostTrigger("ended", this._tag, this._aiId))
    }
    HasEnded() {
        return !this._isStopped && this._bufferSource && this._bufferSource.loop || this._isPaused ? !1 : this._hasPlaybackEnded
    }
    CanBeRecycled() {
        return !this._bufferSource || this._isStopped ? !0 : this.HasEnded()
    }
    GetPlaybackTime() {
        let c;
        c = this._isPaused ? this._resumePosition : this._playFromSeekPos + (this.GetCurrentTime() - this._playStartTime) * this._playbackRate;
        this._isLooping || (c = Math.min(c, this.GetDuration()));
        return c
    }
    Play(c, a, b, e) {
        this._muteVol = 1;
        this.SetVolume(a);
        this._ReleaseBufferSource();
        this._bufferSource = this.GetAudioContext().createBufferSource();
        this._bufferSource.buffer = this._buffer.GetAudioBuffer();
        this._bufferSource.connect(this._gainNode);
        this._activeSource = this._bufferSource;
        this._bufferSource.onended = this._onended_handler;
        this._bufferSource.loop = c;
        this._bufferSource.start(e, b);
        this._isPaused = this._isStopped = this._hasPlaybackEnded = !1;
        this._isLooping = c;
        this._playbackRate = 1;
        this._playStartTime = this.GetCurrentTime();
        this._playFromSeekPos = b
    }
    Stop() {
        if (this._bufferSource) try {
            this._bufferSource.stop(0)
        } catch (c) {}
        this._isStopped = !0;
        this._isPaused = !1;
        this._instUid = -1
    }
    Pause() {
        this._isPaused || this._isStopped || this.HasEnded() || (this._resumePosition = this.GetPlaybackTime(), this._isLooping && (this._resumePosition %= this.GetDuration()), this._isPaused = !0, this._bufferSource.stop(0))
    }
    Resume() {
        !this._isPaused || this._isStopped || this.HasEnded() || (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._bufferSource.start(0, this._resumePosition), this._playStartTime = this.GetCurrentTime(), this._playFromSeekPos = this._resumePosition, this._isPaused = !1)
    }
    GetOutputVolume() {
        return super.GetOutputVolume() * this._muteVol
    }
    _UpdateMuted() {
        this._muteVol = this._isMuted || this.IsSilent() ? 0 : 1;
        this._UpdateVolume()
    }
    SetLooping(c) {
        c = !!c;
        this._isLooping !== c && (this._isLooping = c, this._bufferSource && (this._bufferSource.loop = c))
    }
    _UpdatePlaybackRate() {
        let c = this._playbackRate;
        this._isTimescaled && (c *= this._audioDomHandler.GetTimeScale());
        this._bufferSource && (this._bufferSource.playbackRate.value = c)
    }
    Seek(c) {
        this._isStopped || this.HasEnded() || (this._isPaused ? this._resumePosition = c : (this.Pause(), this._resumePosition = c, this.Resume()))
    }
    GetResumePosition() {
        return this._resumePosition
    }
    SetSuspended(c) {
        c ? this.IsPlaying() ? (this._resumeMe = !0, this._resumePosition = this.GetPlaybackTime(), this._isLooping && (this._resumePosition %= this.GetDuration()), this._bufferSource.stop(0)) : this._resumeMe = !1 : this._resumeMe && (this._ReleaseBufferSource(), this._bufferSource = this.GetAudioContext().createBufferSource(), this._bufferSource.buffer = this._buffer.GetAudioBuffer(), this._bufferSource.connect(this._gainNode), this._activeSource = this._bufferSource, this._bufferSource.onended = this._onended_handler, this._bufferSource.loop = this._isLooping, this._UpdateVolume(), this._UpdatePlaybackRate(), this._bufferSource.start(0, this._resumePosition), this._playStartTime = this.GetCurrentTime(), this._playFromSeekPos = this._resumePosition, this._resumeMe = !1)
    }
    _LoadAdditionalState(c) {
        super._LoadAdditionalState(c);
        this._resumePosition = c.resumePosition
    }
};
"use strict"; {
    class c {
        constructor(a) {
            this._audioDomHandler = a;
            this._audioContext = a.GetAudioContext();
            this._index = -1;
            this._type = this._tag = "";
            this._params = null
        }
        Release() {
            this._audioContext = null
        }
        _SetIndex(a) {
            this._index = a
        }
        GetIndex() {
            return this._index
        }
        _SetTag(a) {
            this._tag = a
        }
        GetTag() {
            return this._tag
        }
        CreateGain() {
            return this._audioContext.createGain()
        }
        GetInputNode() {}
        ConnectTo(a) {}
        SetAudioParam(a, b, e, h) {
            a.cancelScheduledValues(0);
            if (0 === h) a.value = b;
            else {
                var m = this._audioContext.currentTime;
                h += m;
                switch (e) {
                    case 0:
                        a.setValueAtTime(b, h);
                        break;
                    case 1:
                        a.setValueAtTime(a.value, m);
                        a.linearRampToValueAtTime(b, h);
                        break;
                    case 2:
                        a.setValueAtTime(a.value, m), a.exponentialRampToValueAtTime(b, h)
                }
            }
        }
        GetState() {
            return {
                type: this._type,
                tag: this._tag,
                params: this._params
            }
        }
    }
    self.C3AudioFilterFX = class extends c {
        constructor(a, b, e, h, m, p, u) {
            super(a);
            this._type = "filter";
            this._params = [b, e, h, m, p, u];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = u;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - u;
            this._filterNode = this._audioContext.createBiquadFilter();
            this._filterNode.type = b;
            this._filterNode.frequency.value = e;
            this._filterNode.detune.value = h;
            this._filterNode.Q.value = m;
            this._filterNode.gain.vlaue = p;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[5] = b;
                    this.SetAudioParam(this._wetNode.gain, b, e, h);
                    this.SetAudioParam(this._dryNode.gain, 1 - b, e, h);
                    break;
                case 1:
                    this._params[1] = b;
                    this.SetAudioParam(this._filterNode.frequency, b, e, h);
                    break;
                case 2:
                    this._params[2] = b;
                    this.SetAudioParam(this._filterNode.detune, b, e, h);
                    break;
                case 3:
                    this._params[3] = b;
                    this.SetAudioParam(this._filterNode.Q, b, e, h);
                    break;
                case 4:
                    this._params[4] = b, this.SetAudioParam(this._filterNode.gain, b, e, h)
            }
        }
    };
    self.C3AudioDelayFX = class extends c {
        constructor(a, b, e, h) {
            super(a);
            this._type = "delay";
            this._params = [b, e, h];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = h;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - h;
            this._mainNode = this.CreateGain();
            this._delayNode = this._audioContext.createDelay(b);
            this._delayNode.delayTime.value = b;
            this._delayGainNode = this.CreateGain();
            this._delayGainNode.gain.value = e;
            this._inputNode.connect(this._mainNode);
            this._inputNode.connect(this._dryNode);
            this._mainNode.connect(this._wetNode);
            this._mainNode.connect(this._delayNode);
            this._delayNode.connect(this._delayGainNode);
            this._delayGainNode.connect(this._mainNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            this._mainNode.disconnect();
            this._delayNode.disconnect();
            this._delayGainNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            const m = self.AudioDOMHandler.DbToLinear;
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[2] = b;
                    this.SetAudioParam(this._wetNode.gain, b, e, h);
                    this.SetAudioParam(this._dryNode.gain, 1 - b, e, h);
                    break;
                case 4:
                    this._params[1] = m(b);
                    this.SetAudioParam(this._delayGainNode.gain, m(b), e, h);
                    break;
                case 5:
                    this._params[0] = b, this.SetAudioParam(this._delayNode.delayTime, b, e, h)
            }
        }
    };
    self.C3AudioConvolveFX = class extends c {
        constructor(a, b, e, h) {
            super(a);
            this._type = "convolution";
            this._params = [e, h];
            this._bufferType = this._bufferUrl = this._bufferOriginalUrl = "";
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = h;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - h;
            this._convolveNode = this._audioContext.createConvolver();
            this._convolveNode.normalize = e;
            this._convolveNode.buffer = b;
            this._inputNode.connect(this._convolveNode);
            this._inputNode.connect(this._dryNode);
            this._convolveNode.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._convolveNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0), this._params[1] = b, this.SetAudioParam(this._wetNode.gain, b, e, h), this.SetAudioParam(this._dryNode.gain, 1 - b, e, h)
            }
        }
        _SetBufferInfo(a, b, e) {
            this._bufferOriginalUrl = a;
            this._bufferUrl = b;
            this._bufferType = e
        }
        GetState() {
            const a = super.GetState();
            a.bufferOriginalUrl = this._bufferOriginalUrl;
            a.bufferUrl = "";
            a.bufferType = this._bufferType;
            return a
        }
    };
    self.C3AudioFlangerFX = class extends c {
        constructor(a, b, e, h, m, p) {
            super(a);
            this._type = "flanger";
            this._params = [b, e, h, m, p];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - p / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = p / 2;
            this._feedbackNode = this.CreateGain();
            this._feedbackNode.gain.value = m;
            this._delayNode = this._audioContext.createDelay(b + e);
            this._delayNode.delayTime.value = b;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = h;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = e;
            this._inputNode.connect(this._delayNode);
            this._inputNode.connect(this._dryNode);
            this._delayNode.connect(this._wetNode);
            this._delayNode.connect(this._feedbackNode);
            this._feedbackNode.connect(this._delayNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._delayNode.delayTime);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._delayNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            this._feedbackNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[4] = b;
                    this.SetAudioParam(this._wetNode.gain, b / 2, e, h);
                    this.SetAudioParam(this._dryNode.gain, 1 - b / 2, e, h);
                    break;
                case 6:
                    this._params[1] = b / 1E3;
                    this.SetAudioParam(this._oscGainNode.gain, b / 1E3, e, h);
                    break;
                case 7:
                    this._params[2] = b;
                    this.SetAudioParam(this._oscNode.frequency, b, e, h);
                    break;
                case 8:
                    this._params[3] = b / 100, this.SetAudioParam(this._feedbackNode.gain, b / 100, e, h)
            }
        }
    };
    self.C3AudioPhaserFX = class extends c {
        constructor(a, b, e, h, m, p, u) {
            super(a);
            this._type = "phaser";
            this._params = [b, e, h, m, p, u];
            this._inputNode = this.CreateGain();
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - u / 2;
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = u / 2;
            this._filterNode = this._audioContext.createBiquadFilter();
            this._filterNode.type = "allpass";
            this._filterNode.frequency.value = b;
            this._filterNode.detune.value = e;
            this._filterNode.Q.value = h;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = p;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = m;
            this._inputNode.connect(this._filterNode);
            this._inputNode.connect(this._dryNode);
            this._filterNode.connect(this._wetNode);
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._filterNode.frequency);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._inputNode.disconnect();
            this._filterNode.disconnect();
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._dryNode.disconnect();
            this._wetNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[5] = b;
                    this.SetAudioParam(this._wetNode.gain, b / 2, e, h);
                    this.SetAudioParam(this._dryNode.gain, 1 - b / 2, e, h);
                    break;
                case 1:
                    this._params[0] = b;
                    this.SetAudioParam(this._filterNode.frequency, b, e, h);
                    break;
                case 2:
                    this._params[1] = b;
                    this.SetAudioParam(this._filterNode.detune, b, e, h);
                    break;
                case 3:
                    this._params[2] = b;
                    this.SetAudioParam(this._filterNode.Q, b, e, h);
                    break;
                case 6:
                    this._params[3] = b;
                    this.SetAudioParam(this._oscGainNode.gain, b, e, h);
                    break;
                case 7:
                    this._params[4] = b, this.SetAudioParam(this._oscNode.frequency, b, e, h)
            }
        }
    };
    self.C3AudioGainFX = class extends c {
        constructor(a, b) {
            super(a);
            this._type = "gain";
            this._params = [b];
            this._node = this.CreateGain();
            this._node.gain.value = b
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, e, h) {
            const m = self.AudioDOMHandler.DbToLinear;
            switch (a) {
                case 4:
                    this._params[0] = m(b), this.SetAudioParam(this._node.gain, m(b), e, h)
            }
        }
    };
    self.C3AudioTremoloFX = class extends c {
        constructor(a, b, e) {
            super(a);
            this._type = "tremolo";
            this._params = [b, e];
            this._node = this.CreateGain();
            this._node.gain.value = 1 - e / 2;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = b;
            this._oscGainNode = this.CreateGain();
            this._oscGainNode.gain.value = e / 2;
            this._oscNode.connect(this._oscGainNode);
            this._oscGainNode.connect(this._node.gain);
            this._oscNode.start(0)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._oscGainNode.disconnect();
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[1] = b;
                    this.SetAudioParam(this._node.gain, 1 - b / 2, e, h);
                    this.SetAudioParam(this._oscGainNode.gain, b / 2, e, h);
                    break;
                case 7:
                    this._params[0] = b, this.SetAudioParam(this._oscNode.frequency, b, e, h)
            }
        }
    };
    self.C3AudioRingModFX = class extends c {
        constructor(a, b, e) {
            super(a);
            this._type = "ringmod";
            this._params = [b, e];
            this._inputNode = this.CreateGain();
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = e;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - e;
            this._ringNode = this.CreateGain();
            this._ringNode.gain.value = 0;
            this._oscNode = this._audioContext.createOscillator();
            this._oscNode.frequency.value = b;
            this._oscNode.connect(this._ringNode.gain);
            this._oscNode.start(0);
            this._inputNode.connect(this._ringNode);
            this._inputNode.connect(this._dryNode);
            this._ringNode.connect(this._wetNode)
        }
        Release() {
            this._oscNode.stop(0);
            this._oscNode.disconnect();
            this._ringNode.disconnect();
            this._inputNode.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0);
                    this._params[1] = b;
                    this.SetAudioParam(this._wetNode.gain, b, e, h);
                    this.SetAudioParam(this._dryNode.gain, 1 - b, e, h);
                    break;
                case 7:
                    this._params[0] = b, this.SetAudioParam(this._oscNode.frequency, b, e, h)
            }
        }
    };
    self.C3AudioDistortionFX = class extends c {
        constructor(a, b, e, h, m, p) {
            super(a);
            this._type = "distortion";
            this._params = [b, e, h, m, p];
            this._inputNode = this.CreateGain();
            this._preGain = this.CreateGain();
            this._postGain = this.CreateGain();
            this._SetDrive(h, m);
            this._wetNode = this.CreateGain();
            this._wetNode.gain.value = p;
            this._dryNode = this.CreateGain();
            this._dryNode.gain.value = 1 - p;
            this._waveShaper = this._audioContext.createWaveShaper();
            this._curve = new Float32Array(65536);
            this._GenerateColortouchCurve(b, e);
            this._waveShaper.curve = this._curve;
            this._inputNode.connect(this._preGain);
            this._inputNode.connect(this._dryNode);
            this._preGain.connect(this._waveShaper);
            this._waveShaper.connect(this._postGain);
            this._postGain.connect(this._wetNode)
        }
        Release() {
            this._inputNode.disconnect();
            this._preGain.disconnect();
            this._waveShaper.disconnect();
            this._postGain.disconnect();
            this._wetNode.disconnect();
            this._dryNode.disconnect();
            super.Release()
        }
        _SetDrive(a, b) {
            .01 > a && (a = .01);
            this._preGain.gain.value = a;
            this._postGain.gain.value = Math.pow(1 / a, .6) * b
        }
        _GenerateColortouchCurve(a, b) {
            for (let e = 0; 32768 > e; ++e) {
                let h = e / 32768;
                h = this._Shape(h, a, b);
                this._curve[32768 + e] = h;
                this._curve[32768 - e - 1] = -h
            }
        }
        _Shape(a, b, e) {
            e = 1.05 * e * b - b;
            const h = 0 > a ? -1 : 1;
            a = 0 > a ? -a : a;
            return (a < b ? a : b + e * self.AudioDOMHandler.e4(a - b, 1 / e)) * h
        }
        ConnectTo(a) {
            this._wetNode.disconnect();
            this._wetNode.connect(a);
            this._dryNode.disconnect();
            this._dryNode.connect(a)
        }
        GetInputNode() {
            return this._inputNode
        }
        SetParam(a, b, e, h) {
            switch (a) {
                case 0:
                    b = Math.max(Math.min(b / 100, 1), 0), this._params[4] = b, this.SetAudioParam(this._wetNode.gain, b, e, h), this.SetAudioParam(this._dryNode.gain, 1 - b, e, h)
            }
        }
    };
    self.C3AudioCompressorFX = class extends c {
        constructor(a, b, e, h, m, p) {
            super(a);
            this._type = "compressor";
            this._params = [b, e, h, m, p];
            this._node = this._audioContext.createDynamicsCompressor();
            this._node.threshold.value = b;
            this._node.knee.value = e;
            this._node.ratio.value = h;
            this._node.attack.value = m;
            this._node.release.value = p
        }
        Release() {
            this._node.disconnect();
            super.Release()
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, e, h) {}
    };
    self.C3AudioAnalyserFX = class extends c {
        constructor(a, b, e) {
            super(a);
            this._type = "analyser";
            this._params = [b, e];
            this._node = this._audioContext.createAnalyser();
            this._node.fftSize = b;
            this._node.smoothingTimeConstant = e;
            this._freqBins = new Float32Array(this._node.frequencyBinCount);
            this._signal = new Uint8Array(b);
            this._rms = this._peak = 0;
            this._audioDomHandler._AddAnalyser(this)
        }
        Release() {
            this._audioDomHandler._RemoveAnalyser(this);
            this._node.disconnect();
            super.Release()
        }
        Tick() {
            this._node.getFloatFrequencyData(this._freqBins);
            this._node.getByteTimeDomainData(this._signal);
            const a = this._node.fftSize;
            let b = this._peak = 0;
            for (var e = 0; e < a; ++e) {
                let h = (this._signal[e] - 128) / 128;
                0 > h && (h = -h);
                this._peak < h && (this._peak = h);
                b += h * h
            }
            e = self.AudioDOMHandler.LinearToDb;
            this._peak = e(this._peak);
            this._rms = e(Math.sqrt(b / a))
        }
        ConnectTo(a) {
            this._node.disconnect();
            this._node.connect(a)
        }
        GetInputNode() {
            return this._node
        }
        SetParam(a, b, e, h) {}
        GetData() {
            return {
                tag: this.GetTag(),
                index: this.GetIndex(),
                peak: this._peak,
                rms: this._rms,
                binCount: this._node.frequencyBinCount,
                freqBins: this._freqBins
            }
        }
    }
}
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "browser");
        this._exportType = "";
        this.AddRuntimeMessageHandlers([
            ["get-initial-state", a => this._OnGetInitialState(a)],
            ["ready-for-sw-messages", () => this._OnReadyForSWMessages()],
            ["alert", a => this._OnAlert(a)],
            ["close", () => this._OnClose()],
            ["set-focus", a => this._OnSetFocus(a)],
            ["vibrate", a => this._OnVibrate(a)],
            ["lock-orientation", a => this._OnLockOrientation(a)],
            ["unlock-orientation", () => this._OnUnlockOrientation()],
            ["navigate", a => this._OnNavigate(a)],
            ["request-fullscreen", a => this._OnRequestFullscreen(a)],
            ["exit-fullscreen", () => this._OnExitFullscreen()],
            ["set-hash", a => this._OnSetHash(a)]
        ]);
        window.addEventListener("online", () => this._OnOnlineStateChanged(!0));
        window.addEventListener("offline", () => this._OnOnlineStateChanged(!1));
        window.addEventListener("hashchange", () => this._OnHashChange());
        document.addEventListener("backbutton", () => this._OnCordovaBackButton())
    }
    _OnGetInitialState(c) {
        this._exportType = c.exportType;
        return {
            location: location.toString(),
            isOnline: !!navigator.onLine,
            referrer: document.referrer,
            title: document.title,
            isCookieEnabled: !!navigator.cookieEnabled,
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowOuterWidth: window.outerWidth,
            windowOuterHeight: window.outerHeight,
            isConstructArcade: "undefined" !== typeof window.is_scirra_arcade
        }
    }
    _OnReadyForSWMessages() {
        window.C3_RegisterSW && window.OfflineClientInfo && window.OfflineClientInfo.SetMessageCallback(c => this.PostToRuntime("sw-message", c.data))
    }
    _OnOnlineStateChanged(c) {
        this.PostToRuntime("online-state", {
            isOnline: c
        })
    }
    _OnCordovaBackButton() {
        this.PostToRuntime("backbutton")
    }
    GetNWjsWindow() {
        return "nwjs" === this._exportType ? nw.Window.get() : null
    }
    _OnAlert(c) {
        alert(c.message)
    }
    _OnClose() {
        navigator.app && navigator.app.exitApp ? navigator.app.exitApp() : navigator.device && navigator.device.exitApp ? navigator.device.exitApp() : window.close()
    }
    _OnSetFocus(c) {
        c = c.isFocus;
        if ("nwjs" === this._exportType) {
            const a = this.GetNWjsWindow();
            c ? a.focus() : a.blur()
        } else c ? window.focus() : window.blur()
    }
    _OnVibrate(c) {
        navigator.vibrate && navigator.vibrate(c.pattern)
    }
    _OnLockOrientation(c) {
        c = c.orientation;
        if (screen.orientation && screen.orientation.lock) screen.orientation.lock(c).catch(a => console.warn("[Construct 3] Failed to lock orientation: ", a));
        else try {
            let a = !1;
            screen.lockOrientation ? a = screen.lockOrientation(c) : screen.webkitLockOrientation ? a = screen.webkitLockOrientation(c) : screen.mozLockOrientation ? a = screen.mozLockOrientation(c) : screen.msLockOrientation && (a = screen.msLockOrientation(c));
            a || console.warn("[Construct 3] Failed to lock orientation")
        } catch (a) {
            console.warn("[Construct 3] Failed to lock orientation: ", a)
        }
    }
    _OnUnlockOrientation() {
        try {
            screen.orientation && screen.orientation.unlock ? screen.orientation.unlock() : screen.unlockOrientation ? screen.unlockOrientation() : screen.webkitUnlockOrientation ? screen.webkitUnlockOrientation() : screen.mozUnlockOrientation ? screen.mozUnlockOrientation() : screen.msUnlockOrientation && screen.msUnlockOrientation()
        } catch (c) {}
    }
    _OnNavigate(c) { }
    _OnRequestFullscreen(c) {
        if ("windows-webview2" === this._exportType || "macos-wkwebview" === this._exportType) self.RuntimeInterface._SetWrapperIsFullscreenFlag(!0), this._iRuntime._SendWrapperMessage({
            type: "set-fullscreen",
            fullscreen: !0
        });
        else {
            const a = {
                navigationUI: "auto"
            };
            c = c.navUI;
            1 === c ? a.navigationUI = "hide" : 2 === c && (a.navigationUI = "show");
            c = document.documentElement;
            c.requestFullscreen ? c.requestFullscreen(a) : c.mozRequestFullScreen ? c.mozRequestFullScreen(a) : c.msRequestFullscreen ? c.msRequestFullscreen(a) : c.webkitRequestFullScreen && ("undefined" !== typeof Element.ALLOW_KEYBOARD_INPUT ? c.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT) : c.webkitRequestFullScreen())
        }
    }
    _OnExitFullscreen() {
        "windows-webview2" === this._exportType || "macos-wkwebview" === this._exportType ? (self.RuntimeInterface._SetWrapperIsFullscreenFlag(!1), this._iRuntime._SendWrapperMessage({
            type: "set-fullscreen",
            fullscreen: !1
        })) : document.exitFullscreen ? document.exitFullscreen() : document.mozCancelFullScreen ? document.mozCancelFullScreen() : document.msExitFullscreen ? document.msExitFullscreen() : document.webkitCancelFullScreen && document.webkitCancelFullScreen()
    }
    _OnSetHash(c) {
        location.hash = c.hash
    }
    _OnHashChange() {
        this.PostToRuntime("hashchange", {
            location: location.toString()
        })
    }
});
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "nwjs");
        this._isNWjs = !1;
        this.AddRuntimeMessageHandlers([
            ["init", () => this.Init()],
            ["show-open-dlg", a => this._OnShowOpenDlg(a)],
            ["show-folder-dlg", () => this._OnShowFolderDlg()],
            ["show-save-dlg", a => this._OnShowSaveDlg(a)],
            ["set-title", a => this._OnSetTitle(a)],
            ["set-window-x", a => this._OnSetWindowX(a)],
            ["set-window-y", a => this._OnSetWindowY(a)],
            ["set-window-width", a => this._OnSetWindowWidth(a)],
            ["set-window-height",
                a => this._OnSetWindowHeight(a)
            ],
            ["window-cmd", a => this._OnWindowCommand(a)],
            ["window-attention", a => this._OnWindowRequestAttention(a)],
            ["set-window-max-size", a => this._OnSetWindowMaxSize(a)],
            ["set-window-min-size", a => this._OnSetWindowMinSize(a)],
            ["set-window-resizable", a => this._OnSetWindowResizable(a)],
            ["set-window-always-top", a => this._OnSetWindowAlwaysOnTop(a)],
            ["shell-cmd", a => this._OnShellCommand(a)],
            ["set-clipboard", a => this._OnSetClipboard(a)],
            ["clear-clipboard", () => this._OnClearClipboard()]
        ])
    }
    GetWindow() {
        return nw.Window.get()
    }
    _CreateNwjsInputElem(c, a) {
        const b = document.createElement("input");
        b.type = "file";
        b.style.display = "none";
        b.id = c;
        a && b.setAttribute(a, "");
        document.body.appendChild(b);
        return b
    }
    Init() {
        this._isNWjs = !0;
        nw.App.clearCache();
        window.addEventListener("dragover", m => m.preventDefault());
        window.addEventListener("drop", m => this._OnDrop(m));
        const c = this._CreateNwjsInputElem("c3nwOpenFileDialog");
        c.onchange = m => {
            this.PostToRuntime("open-dlg", {
                chosenPath: c.value
            });
            try {
                c.value = null
            } catch (p) {}
        };
        c.oncancel = () => {
            this.PostToRuntime("open-dlg-cancel")
        };
        const a = this._CreateNwjsInputElem("c3nwChooseFolderDialog", "nwdirectory");
        a.onchange = m => {
            this.PostToRuntime("folder-dlg", {
                chosenPath: a.value
            });
            try {
                a.value = null
            } catch (p) {}
        };
        a.oncancel = () => {
            this.PostToRuntime("folder-dlg-cancel")
        };
        const b = this._CreateNwjsInputElem("c3nwSaveDialog", "nwsaveas");
        b.onchange = m => {
            this.PostToRuntime("save-dlg", {
                chosenPath: b.value
            });
            try {
                b.value = null
            } catch (p) {}
        };
        b.oncancel = () => {
            this.PostToRuntime("save-dlg-cancel")
        };
        const e = this.GetWindow();
        e.on("move", m => this._OnWindowChange(m));
        e.on("resize", m => this._OnWindowChange(m));
        let h = this._GetClipboardText();
        setInterval(() => {
            const m = this._GetClipboardText();
            h !== m && (h = m, this.PostToRuntime("clipboard-change", {
                "clipboard-text": m
            }))
        }, 1E3);
        return Object.assign({
            argv: nw.App.argv,
            "clipboard-text": h
        }, this._GetWindowInfo())
    }
    _GetWindowInfo() {
        const c = this.GetWindow();
        return {
            "window-title": c.title || "",
            "window-x": c.x,
            "window-y": c.y,
            "window-width": c.width,
            "window-height": c.height
        }
    }
    _OnWindowChange(c) {
        this.PostToRuntime("window-change", this._GetWindowInfo())
    }
    _GetClipboardText() {
        return nw.Clipboard.get().get() || ""
    }
    _OnClipboardChange() {
        this.PostToRuntime("clipboard-change", this._GetClipboardInfo())
    }
    _OnSetWindowX(c) {
        this.GetWindow().x = c.x
    }
    _OnSetWindowY(c) {
        this.GetWindow().y = c.y
    }
    _OnSetWindowWidth(c) {
        const a = this.GetWindow();
        c = c.width;
        a.setInnerWidth ? a.setInnerWidth(c) : a.width = c
    }
    _OnSetWindowHeight(c) {
        const a = this.GetWindow();
        c = c.height;
        a.setInnerHeight ? a.setInnerHeight(c) : a.height = c
    }
    _OnWindowCommand(c) {
        const a = c.method;
        setTimeout(() => this.GetWindow()[a](), 100)
    }
    _OnWindowRequestAttention(c) {
        this.GetWindow().requestAttention(c.request)
    }
    _OnSetWindowMaxSize(c) {
        this.GetWindow().setMaximumSize(c.width, c.height)
    }
    _OnSetWindowMinSize(c) {
        this.GetWindow().setMinimumSize(c.width, c.height)
    }
    _OnSetWindowResizable(c) {
        this.GetWindow().setResizable(c.resizable)
    }
    _OnSetWindowAlwaysOnTop(c) {
        this.GetWindow().setAlwaysOnTop(c.top)
    }
    _OnShellCommand(c) {
        nw.Shell[c.method](c.arg)
    }
    _OnSetClipboard(c) {
        nw.Clipboard.get().set(c.text)
    }
    _OnClearClipboard() {
        nw.Clipboard.get().clear()
    }
    _OnDrop(c) {
        c.preventDefault();
        c = c.dataTransfer.files;
        const a = [];
        for (let b = 0, e = c.length; b < e; ++b) a.push(c[b].path);
        this.PostToRuntime("drop", {
            filePaths: a
        });
        return !1
    }
    _OnShowOpenDlg(c) {
        if (this._isNWjs) {
            var a = document.getElementById("c3nwOpenFileDialog");
            a.setAttribute("accept", c.accept);
            a.click()
        }
    }
    _OnShowFolderDlg() {
        this._isNWjs && document.getElementById("c3nwChooseFolderDialog").click()
    }
    _OnShowSaveDlg(c) {
        if (this._isNWjs) {
            var a = document.getElementById("c3nwSaveDialog");
            a.setAttribute("accept", c.accept);
            a.click()
        }
    }
    _OnSetTitle(c) {
        c = c.title;
        document.title = c;
        this.GetWindow().title = c
    }
});
"use strict"; {
    let c = !1;
    self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(a) {
            super(a, "gamepad");
            this._isSupported = !!navigator.getGamepads;
            this._isReady = !1;
            this.AddRuntimeMessageHandler("is-supported", () => this._OnTestIsSupported());
            this.AddRuntimeMessageHandler("ready", () => this._OnReady());
            this.AddRuntimeMessageHandler("vibrate", b => this._OnGamepadVibrate(b));
            this.AddRuntimeMessageHandler("reset-vibrate", b => this._OnGamepadResetVibrate(b));
            window.addEventListener("gamepadconnected", b => this._OnGamepadConnected(b));
            window.addEventListener("gamepaddisconnected", b => this._OnGamepadDisconnected(b));
            window.addEventListener("unload", () => this._OnWindowUnload())
        }
        _GetActiveGamepads() {
            try {
                return Array.from(navigator.getGamepads()).filter(a => a && a.connected)
            } catch (a) {
                return c || (console.warn("[Construct 3] Failed to access gamepads: ", a), c = !0), []
            }
        }
        _OnTestIsSupported(a) {
            return this._isSupported
        }
        _OnReady() {
            this._isReady = !0;
            for (const a of this._GetActiveGamepads()) this.PostToRuntime("gamepad-connected", {
                index: a.index,
                id: a.id
            });
            this._isSupported && this._StartTicking()
        }
        _OnGamepadConnected(a) {
            this._isReady && (a = a.gamepad, this.PostToRuntime("gamepad-connected", {
                index: a.index,
                id: a.id
            }))
        }
        _OnGamepadDisconnected(a) {
            this._isReady && this.PostToRuntime("gamepad-disconnected", {
                index: a.gamepad.index
            })
        }
        Tick() {
            var a = this._GetActiveGamepads();
            a.length && (a = a.map(b => ({
                index: b.index,
                id: b.id,
                buttons: b.buttons.map(e => ({
                    pressed: e.pressed,
                    value: e.value
                })),
                axes: b.axes
            })), this.PostToRuntime("input-update", a))
        }
        _GetGamepadByIndex(a) {
            for (const b of this._GetActiveGamepads())
                if (b.index === a) return b;
            return null
        }
        async _OnGamepadVibrate(a) {
            var b = this._GetGamepadByIndex(a.index);
            if (b && (b = b.vibrationActuator) && b.playEffect) try {
                await b.playEffect("dual-rumble", {
                    duration: a.duration,
                    startDelay: 0,
                    weakMagnitude: a.weakMag,
                    strongMagnitude: a.strongMag
                })
            } catch (e) {
                console.warn("[Gamepad] Failed to vibrate gamepad: ", e)
            }
        }
        _OnGamepadResetVibrate(a) {
            (a = this._GetGamepadByIndex(a.index)) && (a = a.vibrationActuator) && a.reset && a.reset()
        }
        _OnWindowUnload() {
            for (const a of this._GetActiveGamepads()) {
                const b = a.vibrationActuator;
                b && b.reset && b.reset()
            }
        }
    })
}
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "mouse");
        this.AddRuntimeMessageHandlers([
            ["cursor", a => this._OnChangeCursorStyle(a)],
            ["request-pointer-lock", () => this._OnRequestPointerLock()],
            ["release-pointer-lock", () => this._OnReleasePointerLock()]
        ]);
        document.addEventListener("pointerlockchange", a => this._OnPointerLockChange());
        document.addEventListener("pointerlockerror", a => this._OnPointerLockError())
    }
    _OnChangeCursorStyle(c) {
        document.documentElement.style.cursor = c
    }
    _OnRequestPointerLock() {
        this._iRuntime.GetCanvas().requestPointerLock()
    }
    _OnReleasePointerLock() {
        document.exitPointerLock()
    }
    _OnPointerLockChange() {
        this.PostToRuntime("pointer-lock-change", {
            "has-pointer-lock": !!document.pointerLockElement
        })
    }
    _OnPointerLockError() {
        this.PostToRuntime("pointer-lock-error", {
            "has-pointer-lock": !!document.pointerLockElement
        })
    }
});
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "touch");
        this.AddRuntimeMessageHandler("request-permission", a => this._OnRequestPermission(a))
    }
    async _OnRequestPermission(c) {
        c = c.type;
        let a = !0;
        0 === c ? a = await this._RequestOrientationPermission() : 1 === c && (a = await this._RequestMotionPermission());
        this.PostToRuntime("permission-result", {
            type: c,
            result: a
        })
    }
    async _RequestOrientationPermission() {
        if (!self.DeviceOrientationEvent || !self.DeviceOrientationEvent.requestPermission) return !0;
        try {
            return "granted" === await self.DeviceOrientationEvent.requestPermission()
        } catch (c) {
            return console.warn("[Touch] Failed to request orientation permission: ", c), !1
        }
    }
    async _RequestMotionPermission() {
        if (!self.DeviceMotionEvent || !self.DeviceMotionEvent.requestPermission) return !0;
        try {
            return "granted" === await self.DeviceMotionEvent.requestPermission()
        } catch (c) {
            return console.warn("[Touch] Failed to request motion permission: ", c), !1
        }
    }
});
"use strict";
self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
    constructor(c) {
        super(c, "platform-info");
        this.AddRuntimeMessageHandlers([
            ["get-initial-state", () => this._OnGetInitialState()],
            ["request-wake-lock", () => this._OnRequestWakeLock()],
            ["release-wake-lock", () => this._OnReleaseWakeLock()]
        ]);
        window.addEventListener("resize", () => this._OnResize());
        this._screenWakeLock = null
    }
    _OnGetInitialState() {
        return {
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowOuterWidth: window.outerWidth,
            windowOuterHeight: window.outerHeight,
            safeAreaInset: this._GetSafeAreaInset(),
            supportsWakeLock: !!navigator.wakeLock
        }
    }
    _GetSafeAreaInset() {
        var c = document.body;
        const a = c.style;
        a.setProperty("--temp-sai-top", "env(safe-area-inset-top)");
        a.setProperty("--temp-sai-right", "env(safe-area-inset-right)");
        a.setProperty("--temp-sai-bottom", "env(safe-area-inset-bottom)");
        a.setProperty("--temp-sai-left", "env(safe-area-inset-left)");
        c = getComputedStyle(c);
        c = [c.getPropertyValue("--temp-sai-top"), c.getPropertyValue("--temp-sai-right"), c.getPropertyValue("--temp-sai-bottom"),
            c.getPropertyValue("--temp-sai-left")
        ].map(b => {
            b = parseInt(b, 10);
            return isFinite(b) ? b : 0
        });
        a.removeProperty("--temp-sai-top");
        a.removeProperty("--temp-sai-right");
        a.removeProperty("--temp-sai-bottom");
        a.removeProperty("--temp-sai-left");
        return c
    }
    _OnResize() {
        this.PostToRuntime("window-resize", {
            windowOuterWidth: window.outerWidth,
            windowOuterHeight: window.outerHeight,
            safeAreaInset: this._GetSafeAreaInset()
        })
    }
    async _OnRequestWakeLock() {
        if (!this._screenWakeLock) try {
            this._screenWakeLock = await navigator.wakeLock.request("screen"),
                this._screenWakeLock.addEventListener("release", () => this._OnWakeLockReleased()), console.log("[Construct 3] Screen wake lock acquired"), this.PostToRuntime("wake-lock-acquired")
        } catch (c) {
            console.warn("[Construct 3] Failed to acquire screen wake lock: ", c), this.PostToRuntime("wake-lock-error")
        }
    }
    _OnReleaseWakeLock() {
        this._screenWakeLock && (this._screenWakeLock.release(), this._screenWakeLock = null)
    }
    _OnWakeLockReleased() {
        console.log("[Construct 3] Screen wake lock released");
        this._screenWakeLock = null;
        this.PostToRuntime("wake-lock-released")
    }
});
"use strict"; {
    function c(a) {
        a.stopPropagation()
    }
    self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMElementHandler {
        constructor(a) {
            super(a, "sliderbar")
        }
        CreateElement(a, b) {
            const e = document.createElement("input");
            e.type = "range";
            e.style.position = "absolute";
            e.style.userSelect = "none";
            e.style.webkitUserSelect = "none";
            e.addEventListener("pointerdown", c);
            e.addEventListener("pointermove", c);
            e.addEventListener("pointerrawupdate", c);
            e.addEventListener("pointerup", c);
            e.addEventListener("mousedown", c);
            e.addEventListener("mouseup", c);
            e.addEventListener("keydown", c);
            e.addEventListener("keyup", c);
            e.addEventListener("click", () => this._PostToRuntimeElementMaybeSync("click", a));
            e.addEventListener("change", () => this.PostToRuntimeElement("change", a, {
                value: parseFloat(e.value)
            }));
            e.addEventListener("input", () => this.PostToRuntimeElement("input", a, {
                value: parseFloat(e.value)
            }));
            b.id && (e.id = b.id);
            b.className && (e.className = b.className);
            this.UpdateState(e, b);
            return e
        }
        UpdateState(a, b) {
            a.max = b.max;
            a.min = b.min;
            a.step = b.step;
            a.value = b.value;
            a.disabled = !b.isEnabled;
            a.title = b.title
        }
    })
}
"use strict"; {
    function c() {
        return "undefined" != typeof navigator && /(?:phone|windows\s+phone|ipod|blackberry|(?:android|bb\d+|meego|silk|googlebot) .+? mobile|palm|windows\s+ce|opera\smini|avantgo|mobilesafari|docomo)/i.test(navigator.userAgent)
    }
    self.RuntimeInterface.AddDOMHandlerClass(class extends self.DOMHandler {
        constructor(a) {
            super(a, "avix-pokisdk-forc3");
            this._firstAdTimerDone = this._finishedLoadingSent = this._gameplayActive = this._debugModeActive = this._pokiSDKLoaded = !1;
            this._lastAdTimer = void 0;
            this.AddRuntimeMessageHandlers([
                ["InitPoki",
                    this.InitPoki.bind(this)
                ],
                ["NotifyGameplayStart", this.NotifyGameplayStart.bind(this)],
                ["NotifyGameplayStop", this.NotifyGameplayStop.bind(this)],
                ["HappyTime", this.HappyTime.bind(this)],
                ["RequestCommercialBreak", this.RequestCommercialBreak.bind(this)],
                ["RequestRewardedBreak", this.RequestRewardedBreak.bind(this)],
                ["SetDebugMode", this.SetDebugMode.bind(this)],
                ["GameLoadingFinished", this.GameLoadingFinished.bind(this)]
            ])
        }
        checkForAdTimer() {
            PokiSDK.SDK.adTimings.requestPossible() ? (this._lastAdTimer = void 0, this._firstAdTimerDone && !c() && this.PostToRuntime("SetCommercialBreakConstraint", {
                constrained: !1
            })) : this._lastAdTimer = setTimeout(() => this.checkForAdTimer, 1E3)
        }
        GameLoadingFinished() {
            this._pokiSDKLoaded && !this._finishedLoadingSent && (this._finishedLoadingSent = !0, PokiSDK.gameLoadingFinished())
        }
        NotifyGameplayStart() {
            this._pokiSDKLoaded && (this._finishedLoadingSent || console.log("Don't forget to send the Loading Finished Notification, or configure the Poki Plugin to manage it automatically."), this._gameplayActive = !0, PokiSDK.gameplayStart(), this._firstAdTimerDone || (this._firstAdTimerDone = !0, this._lastAdTimer = setTimeout(() => this.checkForAdTimer(), PokiSDK.SDK.adTimings.timings.startAdsAfter + 10)))
        }
        NotifyGameplayStop() {
            this._pokiSDKLoaded && (this._gameplayActive = !1, PokiSDK.gameplayStop())
        }
        HappyTime({
            intensity: a
        }) {
            this._pokiSDKLoaded && PokiSDK.happyTime(a)
        }
        RequestCommercialBreak() {
            if (!this._pokiSDKLoaded) return {
                result: !1,
                err: !1
            };
            this._gameplayActive && this.NotifyGameplayStop();
            const a = this._firstAdTimerDone && PokiSDK.SDK.adTimings.requestPossible();
            a && this.PostToRuntime("SuspendRuntime");
            return PokiSDK.commercialBreak().then(() => {
                a && this.PostToRuntime("ResumeRuntime");
                PokiSDK.SDK.adTimings.requestPossible() || this.PostToRuntime("SetCommercialBreakConstraint", {
                    constrained: !0
                });
                this._firstAdTimerDone && !this._lastAdTimer && (this._lastAdTimer = setTimeout(() => this.checkForAdTimer(), PokiSDK.SDK.adTimings.timings.timeBetweenAds + 10));
                return {
                    result: !0,
                    err: !1
                }
            }).catch(b => {
                console.error(b);
                return {
                    result: !1,
                    err: b
                }
            })
        }
        RequestRewardedBreak() {
            if (!this._pokiSDKLoaded) return {
                result: !1,
                err: !1
            };
            this._gameplayActive && this.NotifyGameplayStop();
            this.PostToRuntime("SuspendRuntime");
            return PokiSDK.rewardedBreak().then(a => {
                this.PostToRuntime("ResumeRuntime");
                PokiSDK.SDK.adTimings.requestPossible() || this.PostToRuntime("SetCommercialBreakConstraint", {
                    constrained: !0
                });
                this._lastAdTimer && clearTimeout(this._lastAdTimer);
                this._lastAdTimer = setTimeout(() => this.checkForAdTimer(), PokiSDK.SDK.adTimings.timings.timeBetweenAds + 10);
                return {
                    result: a,
                    err: !1
                }
            }).catch(a => {
                console.error(a);
                return {
                    result: !1,
                    err: a
                }
            })
        }
        SetDebugMode({
            enable: a
        }) {
            this._pokiSDKLoaded && PokiSDK.setDebug(this._debugModeActive = a)
        }
        InitPoki({
            debugMode: a,
            preventScroll: b
        }) {
            if ("undefined" !== typeof PokiSDK) {
                b && this.preventScroll();
                this._pokiSDKLoaded = !0;
                let e = !1;
                return PokiSDK.init().then(() => {
                    console.log("Poki SDK successfully initialized");
                    return {
                        loaded: this._pokiSDKLoaded,
                        adBlock: e
                    }
                }).catch(() => {
                    console.log("Initialized, but the user likely has adblock");
                    e = !0;
                    return {
                        loaded: this._pokiSDKLoaded,
                        adBlock: e
                    }
                }).finally(() => {
                    a && this.SetDebugMode(!0);
                    PokiSDK.gameLoadingStart()
                })
            }
            console.log("Poki SDK failed to load");
            return Promise.resolve({
                loaded: this._pokiSDKLoaded,
                adBlock: !1
            })
        }
        preventScroll() {
            window.addEventListener("keydown", a => {
                ["ArrowDown", "ArrowUp", " "].includes(a.key) && a.preventDefault()
            });
            window.addEventListener("wheel", a => a.preventDefault(), {
                passive: !1
            })
        }
    })
};