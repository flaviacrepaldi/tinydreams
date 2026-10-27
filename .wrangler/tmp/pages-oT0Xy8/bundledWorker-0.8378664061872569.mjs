var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// ../node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// ../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
  name: "node",
  entryType: "node",
  startTime: 0,
  duration: 0,
  nodeStart: 0,
  v8Start: 0,
  bootstrapComplete: 0,
  environment: 0,
  loopStart: 0,
  loopExit: 0,
  idleTime: 0,
  uvMetricsInfo: {
    loopCount: 0,
    events: 0,
    eventsWaiting: 0
  },
  detail: void 0,
  toJSON() {
    return this;
  }
};
var PerformanceEntry = class {
  static {
    __name(this, "PerformanceEntry");
  }
  __unenv__ = true;
  detail;
  entryType = "event";
  name;
  startTime;
  constructor(name, options) {
    this.name = name;
    this.startTime = options?.startTime || _performanceNow();
    this.detail = options?.detail;
  }
  get duration() {
    return _performanceNow() - this.startTime;
  }
  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
      detail: this.detail
    };
  }
};
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
  static {
    __name(this, "PerformanceMark");
  }
  entryType = "mark";
  constructor() {
    super(...arguments);
  }
  get duration() {
    return 0;
  }
};
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceResourceTiming");
  }
  entryType = "resource";
  serverTiming = [];
  connectEnd = 0;
  connectStart = 0;
  decodedBodySize = 0;
  domainLookupEnd = 0;
  domainLookupStart = 0;
  encodedBodySize = 0;
  fetchStart = 0;
  initiatorType = "";
  name = "";
  nextHopProtocol = "";
  redirectEnd = 0;
  redirectStart = 0;
  requestStart = 0;
  responseEnd = 0;
  responseStart = 0;
  secureConnectionStart = 0;
  startTime = 0;
  transferSize = 0;
  workerStart = 0;
  responseStatus = 0;
};
var PerformanceObserverEntryList = class {
  static {
    __name(this, "PerformanceObserverEntryList");
  }
  __unenv__ = true;
  getEntries() {
    return [];
  }
  getEntriesByName(_name, _type) {
    return [];
  }
  getEntriesByType(type) {
    return [];
  }
};
var Performance = class {
  static {
    __name(this, "Performance");
  }
  __unenv__ = true;
  timeOrigin = _timeOrigin;
  eventCounts = /* @__PURE__ */ new Map();
  _entries = [];
  _resourceTimingBufferSize = 0;
  navigation = void 0;
  timing = void 0;
  timerify(_fn, _options) {
    throw createNotImplementedError("Performance.timerify");
  }
  get nodeTiming() {
    return nodeTiming;
  }
  eventLoopUtilization() {
    return {};
  }
  markResourceTiming() {
    return new PerformanceResourceTiming("");
  }
  onresourcetimingbufferfull = null;
  now() {
    if (this.timeOrigin === _timeOrigin) {
      return _performanceNow();
    }
    return Date.now() - this.timeOrigin;
  }
  clearMarks(markName) {
    this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
  }
  clearMeasures(measureName) {
    this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
  }
  clearResourceTimings() {
    this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
  }
  getEntries() {
    return this._entries;
  }
  getEntriesByName(name, type) {
    return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
  }
  getEntriesByType(type) {
    return this._entries.filter((e) => e.entryType === type);
  }
  mark(name, options) {
    const entry = new PerformanceMark(name, options);
    this._entries.push(entry);
    return entry;
  }
  measure(measureName, startOrMeasureOptions, endMark) {
    let start;
    let end;
    if (typeof startOrMeasureOptions === "string") {
      start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
      end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
    } else {
      start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
      end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
    }
    const entry = new PerformanceMeasure(measureName, {
      startTime: start,
      detail: {
        start,
        end
      }
    });
    this._entries.push(entry);
    return entry;
  }
  setResourceTimingBufferSize(maxSize) {
    this._resourceTimingBufferSize = maxSize;
  }
  addEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.addEventListener");
  }
  removeEventListener(type, listener, options) {
    throw createNotImplementedError("Performance.removeEventListener");
  }
  dispatchEvent(event) {
    throw createNotImplementedError("Performance.dispatchEvent");
  }
  toJSON() {
    return this;
  }
};
var PerformanceObserver = class {
  static {
    __name(this, "PerformanceObserver");
  }
  __unenv__ = true;
  static supportedEntryTypes = [];
  _callback = null;
  constructor(callback) {
    this._callback = callback;
  }
  takeRecords() {
    return [];
  }
  disconnect() {
    throw createNotImplementedError("PerformanceObserver.disconnect");
  }
  observe(options) {
    throw createNotImplementedError("PerformanceObserver.observe");
  }
  bind(fn) {
    return fn;
  }
  runInAsyncScope(fn, thisArg, ...args) {
    return fn.call(thisArg, ...args);
  }
  asyncId() {
    return 0;
  }
  triggerAsyncId() {
    return 0;
  }
  emitDestroy() {
    return this;
  }
};
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
if (!("__unenv__" in performance)) {
  const proto = Performance.prototype;
  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key !== "constructor" && !(key in performance)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key);
      if (desc) {
        Object.defineProperty(performance, key, desc);
      }
    }
  }
}
globalThis.performance = performance;
globalThis.Performance = Performance;
globalThis.PerformanceEntry = PerformanceEntry;
globalThis.PerformanceMark = PerformanceMark;
globalThis.PerformanceMeasure = PerformanceMeasure;
globalThis.PerformanceObserver = PerformanceObserver;
globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
globalThis.PerformanceResourceTiming = PerformanceResourceTiming;

// ../node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// ../node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// ../node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
  debug: debug2,
  dir: dir2,
  dirxml: dirxml2,
  error: error2,
  group: group2,
  groupCollapsed: groupCollapsed2,
  groupEnd: groupEnd2,
  info: info2,
  log: log2,
  profile: profile2,
  profileEnd: profileEnd2,
  table: table2,
  time: time2,
  timeEnd: timeEnd2,
  timeLog: timeLog2,
  timeStamp: timeStamp2,
  trace: trace2,
  warn: warn2
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// ../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
  const now = Date.now();
  const seconds = Math.trunc(now / 1e3);
  const nanos = now % 1e3 * 1e6;
  if (startTime) {
    let diffSeconds = seconds - startTime[0];
    let diffNanos = nanos - startTime[0];
    if (diffNanos < 0) {
      diffSeconds = diffSeconds - 1;
      diffNanos = 1e9 + diffNanos;
    }
    return [diffSeconds, diffNanos];
  }
  return [seconds, nanos];
}, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
  return BigInt(Date.now() * 1e6);
}, "bigint") });

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// ../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
  static {
    __name(this, "ReadStream");
  }
  fd;
  isRaw = false;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  setRawMode(mode) {
    this.isRaw = mode;
    return this;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
  static {
    __name(this, "WriteStream");
  }
  fd;
  columns = 80;
  rows = 24;
  isTTY = false;
  constructor(fd) {
    this.fd = fd;
  }
  clearLine(dir3, callback) {
    callback && callback();
    return false;
  }
  clearScreenDown(callback) {
    callback && callback();
    return false;
  }
  cursorTo(x, y, callback) {
    callback && typeof callback === "function" && callback();
    return false;
  }
  moveCursor(dx, dy, callback) {
    callback && callback();
    return false;
  }
  getColorDepth(env2) {
    return 1;
  }
  hasColors(count3, env2) {
    return false;
  }
  getWindowSize() {
    return [this.columns, this.rows];
  }
  write(str, encoding, cb) {
    if (str instanceof Uint8Array) {
      str = new TextDecoder().decode(str);
    }
    try {
      console.log(str);
    } catch {
    }
    cb && typeof cb === "function" && cb();
    return false;
  }
};

// ../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// ../node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
  static {
    __name(this, "Process");
  }
  env;
  hrtime;
  nextTick;
  constructor(impl) {
    super();
    this.env = impl.env;
    this.hrtime = impl.hrtime;
    this.nextTick = impl.nextTick;
    for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
      const value = this[prop];
      if (typeof value === "function") {
        this[prop] = value.bind(this);
      }
    }
  }
  // --- event emitter ---
  emitWarning(warning, type, code) {
    console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
  }
  emit(...args) {
    return super.emit(...args);
  }
  listeners(eventName) {
    return super.listeners(eventName);
  }
  // --- stdio (lazy initializers) ---
  #stdin;
  #stdout;
  #stderr;
  get stdin() {
    return this.#stdin ??= new ReadStream(0);
  }
  get stdout() {
    return this.#stdout ??= new WriteStream(1);
  }
  get stderr() {
    return this.#stderr ??= new WriteStream(2);
  }
  // --- cwd ---
  #cwd = "/";
  chdir(cwd2) {
    this.#cwd = cwd2;
  }
  cwd() {
    return this.#cwd;
  }
  // --- dummy props and getters ---
  arch = "";
  platform = "";
  argv = [];
  argv0 = "";
  execArgv = [];
  execPath = "";
  title = "";
  pid = 200;
  ppid = 100;
  get version() {
    return `v${NODE_VERSION}`;
  }
  get versions() {
    return { node: NODE_VERSION };
  }
  get allowedNodeEnvironmentFlags() {
    return /* @__PURE__ */ new Set();
  }
  get sourceMapsEnabled() {
    return false;
  }
  get debugPort() {
    return 0;
  }
  get throwDeprecation() {
    return false;
  }
  get traceDeprecation() {
    return false;
  }
  get features() {
    return {};
  }
  get release() {
    return {};
  }
  get connected() {
    return false;
  }
  get config() {
    return {};
  }
  get moduleLoadList() {
    return [];
  }
  constrainedMemory() {
    return 0;
  }
  availableMemory() {
    return 0;
  }
  uptime() {
    return 0;
  }
  resourceUsage() {
    return {};
  }
  // --- noop methods ---
  ref() {
  }
  unref() {
  }
  // --- unimplemented methods ---
  umask() {
    throw createNotImplementedError("process.umask");
  }
  getBuiltinModule() {
    return void 0;
  }
  getActiveResourcesInfo() {
    throw createNotImplementedError("process.getActiveResourcesInfo");
  }
  exit() {
    throw createNotImplementedError("process.exit");
  }
  reallyExit() {
    throw createNotImplementedError("process.reallyExit");
  }
  kill() {
    throw createNotImplementedError("process.kill");
  }
  abort() {
    throw createNotImplementedError("process.abort");
  }
  dlopen() {
    throw createNotImplementedError("process.dlopen");
  }
  setSourceMapsEnabled() {
    throw createNotImplementedError("process.setSourceMapsEnabled");
  }
  loadEnvFile() {
    throw createNotImplementedError("process.loadEnvFile");
  }
  disconnect() {
    throw createNotImplementedError("process.disconnect");
  }
  cpuUsage() {
    throw createNotImplementedError("process.cpuUsage");
  }
  setUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
  }
  hasUncaughtExceptionCaptureCallback() {
    throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
  }
  initgroups() {
    throw createNotImplementedError("process.initgroups");
  }
  openStdin() {
    throw createNotImplementedError("process.openStdin");
  }
  assert() {
    throw createNotImplementedError("process.assert");
  }
  binding() {
    throw createNotImplementedError("process.binding");
  }
  // --- attached interfaces ---
  permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
  report = {
    directory: "",
    filename: "",
    signal: "SIGUSR2",
    compact: false,
    reportOnFatalError: false,
    reportOnSignal: false,
    reportOnUncaughtException: false,
    getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
    writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
  };
  finalization = {
    register: /* @__PURE__ */ notImplemented("process.finalization.register"),
    unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
    registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
  };
  memoryUsage = Object.assign(() => ({
    arrayBuffers: 0,
    rss: 0,
    external: 0,
    heapTotal: 0,
    heapUsed: 0
  }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
  // --- undefined props ---
  mainModule = void 0;
  domain = void 0;
  // optional
  send = void 0;
  exitCode = void 0;
  channel = void 0;
  getegid = void 0;
  geteuid = void 0;
  getgid = void 0;
  getgroups = void 0;
  getuid = void 0;
  setegid = void 0;
  seteuid = void 0;
  setgid = void 0;
  setgroups = void 0;
  setuid = void 0;
  // internals
  _events = void 0;
  _eventsCount = void 0;
  _exiting = void 0;
  _maxListeners = void 0;
  _debugEnd = void 0;
  _debugProcess = void 0;
  _fatalException = void 0;
  _getActiveHandles = void 0;
  _getActiveRequests = void 0;
  _kill = void 0;
  _preload_modules = void 0;
  _rawDebug = void 0;
  _startProfilerIdleNotifier = void 0;
  _stopProfilerIdleNotifier = void 0;
  _tickCallback = void 0;
  _disconnect = void 0;
  _handleQueue = void 0;
  _pendingMessage = void 0;
  _channel = void 0;
  _send = void 0;
  _linkedBinding = void 0;
};

// ../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
  _channel,
  _debugEnd,
  _debugProcess,
  _disconnect,
  _events,
  _eventsCount,
  _exiting,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _handleQueue,
  _kill,
  _linkedBinding,
  _maxListeners,
  _pendingMessage,
  _preload_modules,
  _rawDebug,
  _send,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  assert: assert2,
  availableMemory,
  binding,
  channel,
  chdir,
  config,
  connected,
  constrainedMemory,
  cpuUsage,
  cwd,
  debugPort,
  disconnect,
  dlopen,
  domain,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exitCode,
  finalization,
  getActiveResourcesInfo,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getMaxListeners,
  getuid,
  hasUncaughtExceptionCaptureCallback,
  hrtime: hrtime3,
  initgroups,
  kill,
  listenerCount,
  listeners,
  loadEnvFile,
  mainModule,
  memoryUsage,
  moduleLoadList,
  nextTick,
  off,
  on,
  once,
  openStdin,
  permission,
  pid,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  reallyExit,
  ref,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  send,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setMaxListeners,
  setSourceMapsEnabled,
  setuid,
  setUncaughtExceptionCaptureCallback,
  sourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  throwDeprecation,
  title,
  traceDeprecation,
  umask,
  unref,
  uptime,
  version,
  versions
} = unenvProcess;
var _process = {
  abort,
  addListener,
  allowedNodeEnvironmentFlags,
  hasUncaughtExceptionCaptureCallback,
  setUncaughtExceptionCaptureCallback,
  loadEnvFile,
  sourceMapsEnabled,
  arch,
  argv,
  argv0,
  chdir,
  config,
  connected,
  constrainedMemory,
  availableMemory,
  cpuUsage,
  cwd,
  debugPort,
  dlopen,
  disconnect,
  emit,
  emitWarning,
  env,
  eventNames,
  execArgv,
  execPath,
  exit,
  finalization,
  features,
  getBuiltinModule,
  getActiveResourcesInfo,
  getMaxListeners,
  hrtime: hrtime3,
  kill,
  listeners,
  listenerCount,
  memoryUsage,
  nextTick,
  on,
  off,
  once,
  pid,
  platform,
  ppid,
  prependListener,
  prependOnceListener,
  rawListeners,
  release,
  removeAllListeners,
  removeListener,
  report,
  resourceUsage,
  setMaxListeners,
  setSourceMapsEnabled,
  stderr,
  stdin,
  stdout,
  title,
  throwDeprecation,
  traceDeprecation,
  umask,
  uptime,
  version,
  versions,
  // @ts-expect-error old API
  domain,
  initgroups,
  moduleLoadList,
  reallyExit,
  openStdin,
  assert: assert2,
  binding,
  send,
  exitCode,
  channel,
  getegid,
  geteuid,
  getgid,
  getgroups,
  getuid,
  setegid,
  seteuid,
  setgid,
  setgroups,
  setuid,
  permission,
  mainModule,
  _events,
  _eventsCount,
  _exiting,
  _maxListeners,
  _debugEnd,
  _debugProcess,
  _fatalException,
  _getActiveHandles,
  _getActiveRequests,
  _kill,
  _preload_modules,
  _rawDebug,
  _startProfilerIdleNotifier,
  _stopProfilerIdleNotifier,
  _tickCallback,
  _disconnect,
  _handleQueue,
  _pendingMessage,
  _channel,
  _send,
  _linkedBinding
};
var process_default = _process;

// ../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// _worker.js
var validDay = /* @__PURE__ */ __name((day) => typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day + "T12:00:00Z")) && (/* @__PURE__ */ new Date(day + "T12:00:00Z")).toISOString().slice(0, 10) === day && day >= "2000-01-01" && day <= "2100-12-31", "validDay");
var weekday = /* @__PURE__ */ __name((day) => (/* @__PURE__ */ new Date(day + "T12:00:00Z")).getUTCDay(), "weekday");
var planOf = /* @__PURE__ */ __name((g) => g.plan || { kind: "habit", start: "", end: "", weekdays: [0, 1, 2, 3, 4, 5, 6], notes: "", unit: "", tasks: [], items: [] }, "planOf");
function validatePlan(p) {
  if (p?.emoji != null && !validEmoji(p.emoji)) throw Error("Escolha um \xFAnico emoji para o sonho.");
  if (!p || !["habit", "list", "amount"].includes(p.kind)) throw Error("Escolha como acompanhar este sonho.");
  if (p.start && !validDay(p.start) || p.end && !validDay(p.end) || p.start && p.end && p.end < p.start) throw Error("Confira as datas de in\xEDcio e prazo.");
  if (!Array.isArray(p.weekdays) || !p.weekdays.length || p.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) throw Error("Escolha pelo menos um dia da semana.");
  if (typeof p.notes !== "string" || p.notes.length > 2e3 || typeof p.unit !== "string" || p.unit.length > 30) throw Error("As observa\xE7\xF5es devem ter at\xE9 2000 caracteres e a unidade at\xE9 30.");
  if (!Array.isArray(p.tasks) || p.tasks.length > 30 || !Array.isArray(p.items) || p.items.length > 120) throw Error("Use at\xE9 30 tarefas de rotina ou 120 etapas.");
  if (p.dailyList != null && typeof p.dailyList !== "boolean") throw Error("Escolha uma repeti\xE7\xE3o v\xE1lida para a lista.");
  if (p.dailyList && (p.kind !== "habit" || p.impulse || p.dailyTarget || !p.tasks.length)) throw Error("Adicione os itens da lista di\xE1ria e uma meta de dias.");
  if (p.impulse != null && typeof p.impulse !== "boolean") throw Error("Escolha um modo de h\xE1bito v\xE1lido.");
  if (p.support != null && (typeof p.support !== "string" || p.support.length > 500)) throw Error("Use at\xE9 500 caracteres para seu combinado.");
  if (p.impulse && (p.kind !== "habit" || p.tasks.length || p.dailyTarget)) throw Error("O h\xE1bito de resistir ao impulso tem seu pr\xF3prio registro di\xE1rio.");
  const ids = /* @__PURE__ */ new Set();
  for (const item of [...p.tasks, ...p.items]) {
    if (typeof item.id !== "string" || !/^[-\w]{1,80}$/.test(item.id) || ids.has(item.id) || typeof item.title !== "string" || !item.title.trim() || item.title.length > 200) throw Error("Cada tarefa precisa de um nome (at\xE9 200 caracteres).");
    ids.add(item.id);
    if (p.tasks.includes(item) && (!Array.isArray(item.weekdays) || !item.weekdays.length || item.weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6))) throw Error("Escolha os dias de cada tarefa.");
    if (p.items.includes(item) && (item.date && !validDay(item.date) || item.date && p.start && item.date < p.start || item.date && p.end && item.date > p.end)) throw Error("As datas das etapas devem ficar dentro do per\xEDodo do sonho.");
  }
  if (p.dailyTarget != null) {
    if (p.kind !== "habit" || !Number.isFinite(p.dailyTarget) || p.dailyTarget <= 0 || p.dailyTarget > 1e9 || Math.abs(Math.round(p.dailyTarget * 100) - p.dailyTarget * 100) > 1e-5 || !p.unit.trim()) throw Error("Informe uma quantidade di\xE1ria positiva, com at\xE9 duas casas decimais, e a unidade.");
    if (p.tasks.length) throw Error("Escolha tarefas ou quantidade di\xE1ria para este h\xE1bito.");
  }
  if (p.kind === "habit" && p.tasks.length && p.weekdays.some((d) => !p.tasks.some((t) => t.weekdays.includes(d)))) throw Error("Adicione pelo menos uma tarefa para cada dia da rotina.");
  if (p.kind === "habit" && p.start && p.end) {
    const count3 = practiceDays(p.start, p.end, p.weekdays);
    if (count3 < 1 || count3 > 3650) throw Error("Escolha um per\xEDodo com 1 a 3650 dias da rotina.");
  }
  if (p.kind === "list" && !p.items.length) throw Error("Adicione pelo menos uma etapa, livro ou consulta.");
  return p;
}
__name(validatePlan, "validatePlan");
function scheduled(g, day) {
  const p = planOf(g);
  return (!p.start || day >= p.start) && (!p.end || day <= p.end) && p.weekdays.includes(weekday(day));
}
__name(scheduled, "scheduled");
function tasksOn(g, day) {
  return planOf(g).tasks.filter((t) => t.weekdays.includes(weekday(day)));
}
__name(tasksOn, "tasksOn");
function progress(g) {
  const p = planOf(g);
  if (p.kind === "amount") return Math.round((g.entries || []).reduce((n, e) => n + e.value, 0) * 100) / 100;
  if (p.kind === "list") return p.items.filter((i) => (g.entries || []).some((e) => e.key === i.id)).length;
  return g.days.length;
}
__name(progress, "progress");
function targetOf(g) {
  const p = planOf(g);
  if (p.kind === "list") return p.items.length;
  if (p.kind === "habit" && p.start && p.end) {
    const count3 = practiceDays(p.start, p.end, p.weekdays);
    if (count3 !== null) return count3;
  }
  return g.target;
}
__name(targetOf, "targetOf");
var complete = /* @__PURE__ */ __name((g) => progress(g) >= targetOf(g), "complete");
var dailyTotal = /* @__PURE__ */ __name((g, day) => Math.round((g.entries || []).filter((e) => e.day === day).reduce((sum, e) => sum + e.value, 0) * 100) / 100, "dailyTotal");
function validEmoji(value) {
  if (typeof value !== "string" || !value || value.length > 32) return false;
  return [...new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(value)].length === 1 && /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20E3]/u.test(value);
}
__name(validEmoji, "validEmoji");
function practiceDays(start, end, weekdays) {
  if (!validDay(start) || !validDay(end) || end < start) return null;
  const first = /* @__PURE__ */ new Date(start + "T12:00:00Z"), length = Math.round((Date.parse(end + "T12:00:00Z") - first.getTime()) / 864e5) + 1;
  const selected = new Set(weekdays), weeks = Math.floor(length / 7);
  let count3 = weeks * selected.size;
  for (let n = 0; n < length % 7; n++) if (selected.has((first.getUTCDay() + n) % 7)) count3++;
  return count3;
}
__name(practiceDays, "practiceDays");
var WRITERS = [
  ["Machado de Assis", "Brasil", "1839\u20131908", "Romancista, contista e cronista carioca, observou as contradi\xE7\xF5es humanas com ironia e delicadeza. Foi um dos fundadores e o primeiro presidente da Academia Brasileira de Letras.", ["Dom Casmurro", "Mem\xF3rias P\xF3stumas de Br\xE1s Cubas", "Quincas Borba"], "https://www2.academia.org.br/academicos/machado-de-assis/biografia"],
  ["Jane Austen", "Reino Unido", "1775\u20131817", "Com humor e uma aten\xE7\xE3o extraordin\xE1ria \xE0s rela\xE7\xF5es humanas, a escritora inglesa transformou o cotidiano, o casamento e as conven\xE7\xF5es sociais em romances que atravessam gera\xE7\xF5es.", ["Orgulho e Preconceito", "Raz\xE3o e Sensibilidade", "Emma"], "https://janeaustens.house/jane-austen/"],
  ["Toni Morrison", "Estados Unidos", "1931\u20132019", "Romancista e editora, deu voz \xE0 mem\xF3ria e \xE0 experi\xEAncia negra nos Estados Unidos. Sua escrita re\xFAne hist\xF3ria, identidade e imagina\xE7\xE3o. Recebeu o Nobel de Literatura em 1993.", ["Amada", "O olho mais azul", "Can\xE7\xE3o de Salom\xE3o"], "https://www.pulitzer.org/news/memoriam-toni-morrison-1931-2019"],
  ["Yasunari Kawabata", "Jap\xE3o", "1899\u20131972", "Sua prosa delicada encontra beleza nos gestos, no sil\xEAncio e na passagem do tempo. Foi o primeiro escritor japon\xEAs a receber o Nobel de Literatura, em 1968.", ["O pa\xEDs das neves", "A dan\xE7arina de Izu", "O som da montanha"], "https://www.nobelprize.org/prizes/literature/1968/kawabata/biographical/"],
  ["Rabindranath Tagore", "\xCDndia", "1861\u20131941", "Poeta, m\xFAsico e educador bengali, aproximou natureza, espiritualidade e vida cotidiana. Em 1913, recebeu o Nobel de Literatura, tornando sua poesia conhecida muito al\xE9m da \xCDndia.", ["Gitanjali (Oferenda l\xEDrica)", "O jardineiro"], "https://www.nobelprize.org/prizes/literature/1913/tagore/biographical/"],
  ["Chinua Achebe", "Nig\xE9ria", "1930\u20132013", "Romancista e ensa\xEDsta nigeriano, abriu caminhos para a literatura africana moderna. Seus livros colocam hist\xF3rias e perspectivas africanas no centro da narrativa sobre o encontro com o colonialismo.", ["Things Fall Apart", "Arrow of God", "No Longer at Ease"], "https://manchesteruniversitypress.co.uk/9780719084362/"],
  ["Gabriela Mistral", "Chile", "1889\u20131957", "Poeta e educadora chilena, escreveu sobre inf\xE2ncia, afeto e perda. Sua voz uniu sensibilidade e compromisso com a educa\xE7\xE3o. Recebeu o Nobel de Literatura em 1945.", ["Desolaci\xF3n", "Ternura", "Tala"], "https://www.loc.gov/item/n50033817/gabriela-mistral-chile-1889-1957/"],
  ["Albert Camus", "Fran\xE7a \xB7 nascido na Arg\xE9lia", "1913\u20131960", "Romancista, dramaturgo e ensa\xEDsta, investigou a liberdade, a revolta e a procura de sentido. Sua obra combina perguntas filos\xF3ficas com hist\xF3rias profundamente humanas. Recebeu o Nobel de Literatura em 1957.", ["O estrangeiro", "A peste", "O mito de S\xEDsifo"], "https://plato.stanford.edu/entries/camus/"],
  ["Selma Lagerl\xF6f", "Su\xE9cia", "1858\u20131940", "A escritora sueca entrela\xE7ou lendas, paisagens e imagina\xE7\xE3o em suas hist\xF3rias. Foi a primeira mulher a receber o Nobel de Literatura, em 1909.", ["A saga de G\xF6sta Berling", "A maravilhosa viagem de Nils Holgersson", "Jerusal\xE9m"], "https://www.nobelprize.org/prizes/literature/1909/lagerlof/biographical/"],
  ["Naguib Mahfouz", "Egito", "1911\u20132006", "Fez das ruas e fam\xEDlias do Cairo um universo liter\xE1rio. Seus romances acompanham as transforma\xE7\xF5es da sociedade eg\xEDpcia. Em 1988, tornou-se o primeiro escritor de l\xEDngua \xE1rabe a receber o Nobel de Literatura.", ["Trilogia do Cairo", "Miramar", "O ladr\xE3o e os c\xE3es"], "https://sis.gov.eg/en/egypt/egyptian-figures/naguib-mahfouz/"]
];
function writerAlbum(goals2, { demo = false } = {}) {
  const count3 = demo ? 8 : goals2.filter(complete).length;
  return { total: count3, slots: WRITERS.map(([name, country, years, bio, works, source], index) => {
    const id = String(index + 1).padStart(2, "0"), unlocked = count3 >= (index + 1) * 8;
    return { id, index, unlocked, ...unlocked ? { name, country, years, bio, works, source, portrait: "/api/goals/portraits/" + (demo ? "demo" : id) } : {} };
  }) };
}
__name(writerAlbum, "writerAlbum");
var json = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } }), "json");
var saoPauloDay = /* @__PURE__ */ __name(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date()), "saoPauloDay");
async function goals(db, owner, id) {
  const [rows, days, entries, failures] = await db.batch([
    db.prepare("SELECT * FROM goals WHERE owner = ? ORDER BY created_at ASC").bind(owner),
    db.prepare("SELECT c.goal_id, c.day FROM checkins c JOIN goals g ON c.goal_id=g.id WHERE g.owner = ? ORDER BY c.day").bind(owner),
    db.prepare("SELECT e.* FROM goal_entries e JOIN goals g ON e.goal_id=g.id WHERE g.owner=? ORDER BY e.day,e.entry_key").bind(owner),
    db.prepare("SELECT f.goal_id,f.day FROM day_failures f JOIN goals g ON f.goal_id=g.id WHERE g.owner=? ORDER BY f.day").bind(owner)
  ]);
  const result = rows.results.map((g) => ({ ...g, plan: g.plan ? JSON.parse(g.plan) : null, failures: failures.results.filter((f) => f.goal_id === g.id).map((f) => f.day), days: days.results.filter((d) => d.goal_id === g.id).map((d) => d.day), entries: entries.results.filter((e) => e.goal_id === g.id).map((e) => ({ key: e.entry_key, day: e.day, value: e.value, note: e.note })) })).map((g) => ({ ...g, target: targetOf(g), redeemed: complete(g) ? g.redeemed : 0 }));
  return id ? result.find((g) => g.id === id) : result;
}
__name(goals, "goals");
async function api(request, env2) {
  const url = new URL(request.url), owner = request.headers.get("oai-authenticated-user-id");
  if (!owner) return json({ error: "Entre na sua conta para abrir seu jardim." }, 401);
  if (!env2.DB) return json({ error: "O jardim est\xE1 temporariamente indispon\xEDvel. Tente novamente em instantes." }, 503);
  if (!["GET", "POST", "PATCH", "DELETE"].includes(request.method)) return json({ error: "A\xE7\xE3o n\xE3o permitida." }, 405);
  if (request.method !== "GET" && (request.headers.get("Origin") && request.headers.get("Origin") !== url.origin || request.headers.get("Sec-Fetch-Site") === "cross-site")) return json({ error: "Origem n\xE3o permitida." }, 403);
  const parts = url.pathname.split("/").filter(Boolean), id = parts[2], action = parts[3];
  if (parts.length > 4) return json({ error: "Caminho n\xE3o encontrado." }, 404);
  let body = {};
  if (["POST", "PATCH"].includes(request.method)) {
    const raw = await request.text();
    if (raw.length > 48e3) return json({ error: "Texto grande demais." }, 413);
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      return json({ error: "Dados inv\xE1lidos." }, 400);
    }
    if (!body || Array.isArray(body) || typeof body !== "object") return json({ error: "Dados inv\xE1lidos." }, 400);
  }
  if (id === "album") {
    if (request.method !== "GET" || action) return json({ error: "A\xE7\xE3o n\xE3o permitida." }, 405);
    return json(writerAlbum(url.searchParams.get("demo") === "1" ? [] : await goals(env2.DB, owner), { demo: url.searchParams.get("demo") === "1" }));
  }
  if (id === "portraits") {
    if (request.method !== "GET") return json({ error: "A\xE7\xE3o n\xE3o permitida." }, 405);
    const demo = action === "demo", index = Number(action) - 1;
    if (!demo && (!/^(0[1-9]|10)$/.test(action || "") || (await goals(env2.DB, owner)).filter(complete).length <= index * 8)) return json({ error: "Retrato ainda n\xE3o revelado." }, 404);
    if (!env2.ASSETS) return json({ error: "Retrato temporariamente indispon\xEDvel." }, 503);
    const image = await env2.ASSETS.fetch(new Request(new URL("/writers/" + (demo ? "01" : action) + ".png", request.url)));
    const headers = new Headers(image.headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(image.body, { status: image.status, headers });
  }
  if (id === "groups") {
    const groupId = action;
    const list = /* @__PURE__ */ __name(async () => (await env2.DB.prepare("SELECT id,name,created_at FROM dream_groups WHERE owner=? ORDER BY created_at,id").bind(owner).all()).results, "list");
    if (request.method === "GET" && !groupId) return json(await list());
    if (groupId && !(await list()).some((g) => g.id === groupId)) return json({ error: "Este Big Dream n\xE3o foi encontrado." }, 404);
    if (request.method === "DELETE" && groupId) {
      await env2.DB.batch([env2.DB.prepare("UPDATE goals SET group_id=NULL WHERE group_id=? AND owner=?").bind(groupId, owner), env2.DB.prepare("DELETE FROM dream_groups WHERE id=? AND owner=?").bind(groupId, owner)]);
      return json({ ok: true });
    }
    if (request.method === "POST" && !groupId || request.method === "PATCH" && groupId) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 80) return json({ error: "D\xEA um nome ao Big Dream, com at\xE9 80 caracteres." }, 400);
      const name = body.name.trim(), known = await list();
      if (known.some((g) => g.id !== groupId && g.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"))) return json({ error: "J\xE1 existe um Big Dream com esse nome." }, 400);
      if (body.goalIds !== void 0 && (!Array.isArray(body.goalIds) || body.goalIds.some((v) => typeof v !== "string") || new Set(body.goalIds).size !== body.goalIds.length)) return json({ error: "Escolha tydreams v\xE1lidos para o Big Dream." }, 400);
      const owned = body.goalIds !== void 0 ? await goals(env2.DB, owner) : [];
      if (body.goalIds?.some((id2) => !owned.some((g) => g.id === id2))) return json({ error: "Um dos tydreams n\xE3o foi encontrado." }, 400);
      const gid = groupId || crypto.randomUUID(), statements = [groupId ? env2.DB.prepare("UPDATE dream_groups SET name=? WHERE id=? AND owner=?").bind(name, gid, owner) : env2.DB.prepare("INSERT INTO dream_groups (id,owner,name,created_at) VALUES (?,?,?,?)").bind(gid, owner, name, (/* @__PURE__ */ new Date()).toISOString())];
      if (body.goalIds !== void 0) {
        statements.push(env2.DB.prepare("UPDATE goals SET group_id=NULL WHERE group_id=? AND owner=?").bind(gid, owner));
        for (const goalId of body.goalIds) statements.push(env2.DB.prepare("UPDATE goals SET group_id=? WHERE id=? AND owner=?").bind(gid, goalId, owner));
      }
      await env2.DB.batch(statements);
      return json((await list()).find((g) => g.id === gid), groupId ? 200 : 201);
    }
    return json({ error: "A\xE7\xE3o n\xE3o permitida para este Big Dream." }, 405);
  }
  if (request.method === "GET" && !id) return json(await goals(env2.DB, owner));
  const existing = id ? await goals(env2.DB, owner, id) : null;
  if (id && !existing) return json({ error: "Este sonho n\xE3o foi encontrado." }, 404);
  if (request.method === "POST" && action === "outcome") {
    const p = planOf(existing), day = body.day, status = body.status;
    if (p.kind !== "habit" || !validDay(day) || day > saoPauloDay() || !["success", "failure", null].includes(status)) return json({ error: "Escolha um dia v\xE1lido at\xE9 hoje e seu resultado." }, 400);
    if (status && !scheduled(existing, day)) return json({ error: "Este dia est\xE1 fora da rotina ou do per\xEDodo do sonho." }, 400);
    if (status === "success" && p.dailyTarget && dailyTotal(existing, day) < p.dailyTarget) return json({ error: "Registre a quantidade deste dia antes de conclu\xED-lo." }, 400);
    if (status === "success" && p.tasks.length && !tasksOn(existing, day).every((t) => existing.entries.some((e) => e.key === `${day}:${t.id}`))) return json({ error: "Conclua as tarefas previstas para este dia." }, 400);
    if (status === "failure" && (p.dailyTarget && dailyTotal(existing, day) >= p.dailyTarget || p.tasks.length && tasksOn(existing, day).every((t) => existing.entries.some((e) => e.key === `${day}:${t.id}`)))) return json({ error: "Corrija os registros deste dia antes de marc\xE1-lo como falha." }, 400);
    const statements = [env2.DB.prepare("DELETE FROM checkins WHERE goal_id=? AND day=?").bind(id, day), env2.DB.prepare("DELETE FROM day_failures WHERE goal_id=? AND day=?").bind(id, day)];
    if (status === "success") statements.push(env2.DB.prepare("INSERT INTO checkins (goal_id,day) VALUES (?,?)").bind(id, day));
    if (status === "failure") statements.push(env2.DB.prepare("INSERT INTO day_failures (goal_id,day) VALUES (?,?)").bind(id, day));
    if (status === null && (p.tasks.length || p.dailyTarget)) statements.push(env2.DB.prepare("DELETE FROM goal_entries WHERE goal_id=? AND day=?").bind(id, day));
    statements.push(env2.DB.prepare("UPDATE goals SET redeemed=CASE WHEN (SELECT COUNT(*) FROM checkins WHERE goal_id=?) < ? THEN 0 ELSE redeemed END WHERE id=? AND owner=?").bind(id, targetOf(existing), id, owner));
    await env2.DB.batch(statements);
    return json(await goals(env2.DB, owner, id));
  }
  if (request.method === "POST" && ["check", "entry"].includes(action)) {
    const p = planOf(existing), day = body.day;
    if (!validDay(day) || day > saoPauloDay()) return json({ error: "Escolha uma data v\xE1lida at\xE9 hoje." }, 400);
    if (typeof body.done !== "boolean") return json({ error: "Informe se o registro foi feito." }, 400);
    const statements = [];
    if (action === "check") {
      if (p.kind !== "habit" || (p.tasks.length || p.dailyTarget) && body.done) return json({ error: "Registre as tarefas ou etapas deste sonho." }, 400);
      if (!body.done && (p.tasks.length || p.dailyTarget)) statements.push(env2.DB.prepare("DELETE FROM goal_entries WHERE goal_id=? AND day=?").bind(id, day));
      if (body.done && !scheduled(existing, day)) return json({ error: "Este dia est\xE1 fora da rotina ou do per\xEDodo do sonho." }, 400);
      statements.push(body.done ? env2.DB.prepare("INSERT INTO checkins (goal_id,day) VALUES (?,?) ON CONFLICT(goal_id,day) DO NOTHING").bind(id, day) : env2.DB.prepare("DELETE FROM checkins WHERE goal_id=? AND day=?").bind(id, day));
    } else {
      const key = body.key;
      let value = 1;
      if (typeof key !== "string" || !/^[-\w:]{1,100}$/.test(key)) return json({ error: "Registro inv\xE1lido." }, 400);
      if (p.kind === "list") {
        if (!p.items.some((i) => i.id === key)) return json({ error: "Etapa n\xE3o encontrada." }, 400);
      } else if (p.kind === "habit" && p.impulse) {
        if (!key.startsWith("urge:")) return json({ error: "Registro de impulso inv\xE1lido." }, 400);
      } else if (p.kind === "habit" && !p.dailyTarget) {
        const task = tasksOn(existing, day).find((t) => `${day}:${t.id}` === key);
        if (!task) return json({ error: "Tarefa n\xE3o prevista para este dia." }, 400);
      } else {
        value = body.value;
        if (body.done && (!Number.isFinite(value) || value <= 0 || value > 1e9 || Math.round(value * 100) !== value * 100 && Math.abs(Math.round(value * 100) - value * 100) > 1e-5)) return json({ error: "Informe um valor positivo com at\xE9 duas casas decimais." }, 400);
        if (!body.done) value = 1;
      }
      if (body.done && (p.start && day < p.start || p.end && day > p.end || p.kind === "habit" && !scheduled(existing, day))) return json({ error: "Escolha uma data dentro do per\xEDodo e da rotina do sonho." }, 400);
      const note = body.note ?? "";
      if (typeof note !== "string" || note.length > 300) return json({ error: "Use at\xE9 300 caracteres para a anota\xE7\xE3o." }, 400);
      statements.push(body.done ? env2.DB.prepare("INSERT INTO goal_entries (goal_id,entry_key,day,value,note) VALUES (?,?,?,?,?) ON CONFLICT(goal_id,entry_key) DO UPDATE SET day=excluded.day,value=excluded.value,note=excluded.note").bind(id, key, day, value, note) : env2.DB.prepare("DELETE FROM goal_entries WHERE goal_id=? AND entry_key=?").bind(id, key));
      if (p.kind === "habit" && p.dailyTarget) {
        const old = (existing.entries || []).find((e) => e.key === key);
        if (old && old.day !== day) return json({ error: "Remova o registro antes de alterar sua data." }, 400);
        statements.push(env2.DB.prepare("INSERT INTO checkins (goal_id,day) SELECT ?,? WHERE (SELECT COALESCE(ROUND(SUM(value),2),0) FROM goal_entries WHERE goal_id=? AND day=?) >= ? ON CONFLICT(goal_id,day) DO NOTHING").bind(id, day, id, day, p.dailyTarget));
        statements.push(env2.DB.prepare("DELETE FROM checkins WHERE goal_id=? AND day=? AND (SELECT COALESCE(ROUND(SUM(value),2),0) FROM goal_entries WHERE goal_id=? AND day=?) < ?").bind(id, day, id, day, p.dailyTarget));
      } else if (p.kind === "habit" && !p.impulse) {
        const records = (existing.entries || []).filter((e) => e.key !== key);
        if (body.done) records.push({ key });
        const done = tasksOn(existing, day).every((t) => records.some((e) => e.key === `${day}:${t.id}`));
        statements.push(done ? env2.DB.prepare("INSERT INTO checkins (goal_id,day) VALUES (?,?) ON CONFLICT(goal_id,day) DO NOTHING").bind(id, day) : env2.DB.prepare("DELETE FROM checkins WHERE goal_id=? AND day=?").bind(id, day));
      }
    }
    if (p.kind === "habit" && (action === "check" && body.done || !p.impulse && action === "entry")) statements.push(env2.DB.prepare("DELETE FROM day_failures WHERE goal_id=? AND day=? AND EXISTS (SELECT 1 FROM checkins WHERE goal_id=? AND day=?)").bind(id, day, id, day));
    statements.push(env2.DB.prepare("UPDATE goals SET redeemed=0 WHERE id=? AND owner=?").bind(id, owner));
    await env2.DB.batch(statements);
    return json(await goals(env2.DB, owner, id));
  }
  if (request.method === "POST" && action === "redeem") {
    if (!complete(existing)) return json({ error: "Sua recompensa ainda est\xE1 crescendo. Continue cuidando do sonho." }, 400);
    await env2.DB.prepare("UPDATE goals SET redeemed=1 WHERE id=? AND owner=?").bind(id, owner).run();
    return json(await goals(env2.DB, owner, id));
  }
  if (request.method === "DELETE" && id && !action) {
    await env2.DB.batch([env2.DB.prepare("DELETE FROM day_failures WHERE goal_id=?").bind(id), env2.DB.prepare("DELETE FROM goal_entries WHERE goal_id=?").bind(id), env2.DB.prepare("DELETE FROM checkins WHERE goal_id=?").bind(id), env2.DB.prepare("DELETE FROM goals WHERE id=? AND owner=?").bind(id, owner)]);
    return json({ ok: true });
  }
  if (request.method === "POST" && !id || request.method === "PATCH" && id && !action) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 100 || typeof body.reward !== "string" || body.reward.trim().length > 160 || !Number.isFinite(body.target) || body.target < 1 || body.target > 1e9 || !["lavender", "peach", "sage"].includes(body.color)) return json({ error: "Preencha o nome e uma meta v\xE1lida." }, 400);
    let plan = body.plan ?? existing?.plan ?? null;
    try {
      if (plan) plan = validatePlan(plan);
    } catch (e) {
      return json({ error: e.message }, 400);
    }
    if ((!plan || plan.kind === "habit") && (!Number.isInteger(body.target) || body.target > 3650)) return json({ error: "Use uma meta de 1 a 3650 dias." }, 400);
    if (existing && planOf(existing).kind !== (plan?.kind || "habit") && (existing.days.length || existing.entries.length || existing.failures.length)) return json({ error: "Crie outro sonho para mudar o tipo sem perder seu hist\xF3rico." }, 400);
    if (existing?.entries.length && planOf(existing).kind === "habit" && (Boolean(planOf(existing).dailyTarget) !== Boolean(plan?.dailyTarget) || planOf(existing).dailyTarget && planOf(existing).unit !== plan.unit)) return json({ error: "Crie outro h\xE1bito para mudar a unidade ou a forma de medir sem misturar registros." }, 400);
    const groupId = body.groupId === void 0 ? existing?.group_id ?? null : body.groupId;
    if (groupId !== null && (typeof groupId !== "string" || !(await env2.DB.prepare("SELECT id FROM dream_groups WHERE id=? AND owner=?").bind(groupId, owner).all()).results.length)) return json({ error: "Escolha um Big Dream v\xE1lido." }, 400);
    const gid = id || crypto.randomUUID(), target = targetOf({ target: body.target, plan });
    if (id) await env2.DB.prepare("UPDATE goals SET title=?,reward=?,target=?,color=?,plan=?,group_id=?,redeemed=0 WHERE id=? AND owner=?").bind(body.title.trim(), body.reward.trim(), target, body.color, plan ? JSON.stringify(plan) : null, groupId, id, owner).run();
    else await env2.DB.prepare("INSERT INTO goals (id,owner,title,reward,target,color,plan,group_id,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(gid, owner, body.title.trim(), body.reward.trim(), target, body.color, plan ? JSON.stringify(plan) : null, groupId, (/* @__PURE__ */ new Date()).toISOString()).run();
    return json(await goals(env2.DB, owner, gid), id ? 200 : 201);
  }
  return json({ error: "Caminho n\xE3o encontrado." }, 404);
}
__name(api, "api");
var assets = {};
var app = { async fetch(request, env2) {
  const url = new URL(request.url);
  try {
    if (url.pathname.startsWith("/api/")) return await api(request, env2);
    if ((url.pathname.startsWith("/editions/") || url.pathname.startsWith("/celebrations/")) && ["GET", "HEAD"].includes(request.method)) {
      return env2.ASSETS ? env2.ASSETS.fetch(request) : new Response("Edition artwork requires the static assets binding", { status: 503 });
    }
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Method not allowed", { status: 405 });
    const asset = assets[url.pathname];
    if (!asset) return new Response("Not found", { status: 404 });
    const headers = { "Content-Type": asset.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "Content-Security-Policy": "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'" };
    return new Response(request.method === "HEAD" ? null : Uint8Array.from(atob(asset.data), (c) => c.charCodeAt(0)), { headers });
  } catch (e) {
    console.error("Tiny Dreams request failed", e.name);
    return new Response(JSON.stringify({ error: "N\xE3o foi poss\xEDvel salvar agora. Tente novamente." }), { status: 500, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  }
} };
function loginPage(message = "") {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <meta name="theme-color" content="#211b31">
  <title>entrar \xB7 tiny dreams</title>
  <meta name="apple-mobile-web-app-title" content="Tiny Dreams">
  <link rel="icon" href="/icon.svg?v=2c7904b7d1e72bf5a9bb" type="image/svg+xml">
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=2c7904b7d1e72bf5a9bb">
  <link rel="manifest" href="/manifest.webmanifest?v=2c7904b7d1e72bf5a9bb">
  <script src="/updates.js?v=2c7904b7d1e72bf5a9bb" defer><\/script>
  <style>
    @font-face{font-family:Fraunces;src:url('/fraunces.ttf') format('truetype');font-display:swap}
    @font-face{font-family:'DM Sans';src:url('/dm-sans.ttf') format('truetype');font-display:swap}
    :root{color-scheme:dark;--bg:#211b31;--text:#f7eee7;--muted:#c4b3cc;--accent:#eec4a0;--line:#786681}
    *{box-sizing:border-box}
    body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 'DM Sans',sans-serif;min-height:100svh;display:grid;grid-template-rows:auto 1fr}
    header{padding:28px clamp(24px,5vw,72px);font:26px/1.2 Fraunces,Georgia,serif;display:flex;align-items:center;gap:12px}
    header svg{width:27px;height:27px;color:var(--accent)}
    main{width:min(100% - 48px,400px);margin:auto;padding:40px 0 100px}
    h1{font:400 clamp(36px,7vw,48px)/1.15 Fraunces,Georgia,serif;letter-spacing:-.02em;margin:0 0 16px;text-wrap:balance}
    p{color:var(--muted);margin:0 0 32px}
    label{display:block;font-size:14px;margin-bottom:8px}
    input{width:100%;min-height:52px;border:1px solid var(--line);background:#30263e;border-radius:8px;padding:12px;color:var(--text);font:inherit;caret-color:var(--accent)}
    button{width:100%;min-height:52px;border:0;border-radius:8px;background:var(--accent);color:var(--bg);font:600 16px/1.4 'DM Sans',sans-serif;padding:12px 20px;cursor:pointer;margin-top:24px}
    button:hover{background:#f6d6ba}button:active{background:#d8ac88}
    :focus-visible{outline:2px solid var(--accent);outline-offset:4px}
    .message{color:#ffd0d8;font-size:14px;margin:16px 0 0;min-height:23px}
    .message:empty{display:none}
    ::selection{background:var(--accent);color:var(--bg)}
    @media(max-width:420px){header{padding-top:24px}main{padding-bottom:64px}}
  </style>
<meta name="tiny-dreams-build" content="2c7904b7d1e72bf5a9bb"></head>
<body>
  <header><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M22 4a12 12 0 1 0 6 20A12 12 0 0 1 22 4Z"/></svg>tiny dreams</header>
  <main>
    <h1>seu mundo de pequenos sonhos.</h1>
    <p>entre com sua senha para cuidar dos seus sonhos.</p>
    <form method="post" action="/auth/login">
      <label for="password">sua senha</label>
      <input id="password" name="password" type="password" autocomplete="current-password" required maxlength="256" aria-describedby="message">
      <p id="message" class="message" role="alert">{{MESSAGE}}</p>
      <button type="submit">entrar</button>
    </form>
  </main>
</body>
</html>
`.replace("{{MESSAGE}}", message.toLocaleLowerCase("pt-BR").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"));
}
__name(loginPage, "loginPage");
var SESSION_COOKIE = "__Host-tinydreams";
var SESSION_SECONDS = 7 * 24 * 60 * 60;
var ATTEMPT_WINDOW = 15 * 60;
var authEncoder = new TextEncoder();
var schemas = /* @__PURE__ */ new WeakMap();
var authEncode = /* @__PURE__ */ __name((bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""), "authEncode");
var authDecode = /* @__PURE__ */ __name((text) => Uint8Array.from(atob(text.replaceAll("-", "+").replaceAll("_", "/")), (c) => c.charCodeAt(0)), "authDecode");
async function authHash(text) {
  return authEncode(await crypto.subtle.digest("SHA-256", authEncoder.encode(text)));
}
__name(authHash, "authHash");
async function authKey(password) {
  return crypto.subtle.importKey("raw", authEncoder.encode(password), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
__name(authKey, "authKey");
function authConfigured(env2) {
  return typeof env2.OWNER_PASSWORD === "string" && env2.OWNER_PASSWORD.length >= 16 && env2.OWNER_PASSWORD.length <= 256 && !!env2.DB;
}
__name(authConfigured, "authConfigured");
async function authSchema(db) {
  if (!schemas.has(db)) {
    const ready = db.batch([
      db.prepare("CREATE TABLE IF NOT EXISTS td_auth_sessions (token_hash TEXT PRIMARY KEY, expires_at INTEGER NOT NULL)"),
      db.prepare("CREATE TABLE IF NOT EXISTS td_auth_attempts (client_hash TEXT PRIMARY KEY, window_start INTEGER NOT NULL, attempts INTEGER NOT NULL)")
    ]).catch((error3) => {
      schemas.delete(db);
      throw error3;
    });
    schemas.set(db, ready);
  }
  await schemas.get(db);
}
__name(authSchema, "authSchema");
function authCookie(request) {
  const cookies = (request.headers.get("Cookie") || "").split(";").map((value2) => value2.trim());
  const value = cookies.find((value2) => value2.startsWith(SESSION_COOKIE + "="))?.slice(SESSION_COOKIE.length + 1);
  return value && value.length < 200 ? value : null;
}
__name(authCookie, "authCookie");
async function authSession(request, env2) {
  if (!authConfigured(env2)) return null;
  try {
    const value = authCookie(request);
    if (!value) return null;
    const [token, signature, extra] = value.split(".");
    if (extra !== void 0 || !/^[A-Za-z0-9_-]{43}$/.test(token || "") || !/^[A-Za-z0-9_-]{43}$/.test(signature || "")) return null;
    const valid = await crypto.subtle.verify("HMAC", await authKey(env2.OWNER_PASSWORD), authDecode(signature), authEncoder.encode("session:" + new URL(request.url).origin + ":" + token));
    if (!valid) return null;
    await authSchema(env2.DB);
    const hash = await authHash(token);
    const rows = await env2.DB.prepare("SELECT token_hash FROM td_auth_sessions WHERE token_hash = ? AND expires_at > ?").bind(hash, Math.floor(Date.now() / 1e3)).all();
    return rows.results.length ? hash : null;
  } catch {
    return null;
  }
}
__name(authSession, "authSession");
function authResponse(body, status = 200, headers = {}) {
  return new Response(body, { status, headers: { "Cache-Control": "private, no-store", "Content-Type": "text/html; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; img-src 'self'; manifest-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'", ...headers } });
}
__name(authResponse, "authResponse");
function authRedirect(path, cookie) {
  return authResponse(null, 303, { Location: path, ...cookie ? { "Set-Cookie": cookie } : {} });
}
__name(authRedirect, "authRedirect");
function authSameOrigin(request) {
  return request.headers.get("Origin") === new URL(request.url).origin && request.headers.get("Sec-Fetch-Site") !== "cross-site";
}
__name(authSameOrigin, "authSameOrigin");
async function authRoute(request, env2, session) {
  const { pathname, origin } = new URL(request.url);
  if (pathname === "/login" && ["GET", "HEAD"].includes(request.method)) {
    if (session) return authRedirect("/");
    const message = authConfigured(env2) ? "" : "A entrada ainda est\xE1 sendo preparada. Tente novamente depois da configura\xE7\xE3o.";
    return authResponse(request.method === "HEAD" ? null : loginPage(message), authConfigured(env2) ? 200 : 503);
  }
  if (!["/auth/login", "/auth/logout"].includes(pathname)) return null;
  if (request.method !== "POST") return authResponse("A\xE7\xE3o n\xE3o permitida.", 405, { Allow: "POST" });
  if (!authSameOrigin(request)) return authResponse("Origem n\xE3o permitida.", 403);
  if (!authConfigured(env2)) return authResponse(loginPage("A entrada ainda est\xE1 sendo preparada. Tente novamente depois da configura\xE7\xE3o."), 503);
  try {
    await authSchema(env2.DB);
    if (pathname === "/auth/logout") {
      if (session) await env2.DB.prepare("DELETE FROM td_auth_sessions WHERE token_hash = ?").bind(session).run();
      return authRedirect("/login", SESSION_COOKIE + "=; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=0");
    }
    if (!(request.headers.get("Content-Type") || "").startsWith("application/x-www-form-urlencoded")) return authResponse("Formato n\xE3o permitido.", 415);
    const now = Math.floor(Date.now() / 1e3);
    const client = await authHash(request.headers.get("CF-Connecting-IP") || "unknown");
    const windowStart = now - now % ATTEMPT_WINDOW;
    const results = await env2.DB.batch([
      env2.DB.prepare("DELETE FROM td_auth_sessions WHERE expires_at <= ?").bind(now),
      env2.DB.prepare("DELETE FROM td_auth_attempts WHERE window_start < ?").bind(windowStart),
      env2.DB.prepare("INSERT INTO td_auth_attempts (client_hash, window_start, attempts) VALUES (?, ?, 1) ON CONFLICT(client_hash) DO UPDATE SET attempts = CASE WHEN window_start = excluded.window_start THEN attempts + 1 ELSE 1 END, window_start = excluded.window_start RETURNING attempts").bind(client, windowStart)
    ]);
    if (results[2].results[0].attempts > 5) return authResponse(loginPage("Muitas tentativas. Aguarde alguns minutos e tente novamente."), 429, { "Retry-After": String(windowStart + ATTEMPT_WINDOW - now) });
    const reader = request.body?.getReader();
    if (!reader) return authResponse(loginPage("Digite sua senha para entrar."), 400);
    const chunks = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 2048) {
        await reader.cancel();
        return authResponse("Formul\xE1rio grande demais.", 413);
      }
      chunks.push(value);
    }
    const body = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const password = new URLSearchParams(new TextDecoder().decode(body)).get("password") || "";
    const proof = await crypto.subtle.sign("HMAC", await authKey(password || "empty"), authEncoder.encode("tiny-dreams-owner-login"));
    const valid = await crypto.subtle.verify("HMAC", await authKey(env2.OWNER_PASSWORD), proof, authEncoder.encode("tiny-dreams-owner-login"));
    if (!valid || password.length > 256) return authResponse(loginPage("Senha incorreta. Confira e tente novamente."), 401);
    const token = authEncode(crypto.getRandomValues(new Uint8Array(32)));
    const signature = authEncode(await crypto.subtle.sign("HMAC", await authKey(env2.OWNER_PASSWORD), authEncoder.encode("session:" + origin + ":" + token)));
    const statements = [env2.DB.prepare("INSERT INTO td_auth_sessions (token_hash, expires_at) VALUES (?, ?)").bind(await authHash(token), now + SESSION_SECONDS)];
    if (session) statements.push(env2.DB.prepare("DELETE FROM td_auth_sessions WHERE token_hash = ?").bind(session));
    await env2.DB.batch(statements);
    return authRedirect("/", SESSION_COOKIE + "=" + token + "." + signature + "; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=" + SESSION_SECONDS);
  } catch {
    return authResponse(loginPage("N\xE3o foi poss\xEDvel entrar agora. Tente novamente em instantes."), 503);
  }
}
__name(authRoute, "authRoute");
var worker_default = {
  async fetch(request, env2) {
    const url = new URL(request.url);
    if (!["tinydreams.pages.dev", "localhost"].includes(url.hostname)) return new Response("Not found", { status: 404 });
    const path = url.pathname;
    const publicAssets = ["/fraunces.ttf", "/dm-sans.ttf", "/icon.svg", "/apple-touch-icon.png", "/icon-192.png", "/icon-512.png", "/manifest.webmanifest", "/version.json", "/updates.js"];
    if (publicAssets.includes(path) && ["GET", "HEAD"].includes(request.method)) {
      const asset = await env2.ASSETS.fetch(request);
      const result2 = new Response(asset.body, asset);
      result2.headers.set("Cache-Control", "no-store");
      result2.headers.set("X-Content-Type-Options", "nosniff");
      return result2;
    }
    const session = await authSession(request, env2);
    const login = await authRoute(request, env2, session);
    if (login) return login;
    if (!session) {
      if (path.startsWith("/api/")) return Response.json({ error: "Sua sess\xE3o terminou. Entre novamente." }, { status: 401, headers: { "Cache-Control": "no-store" } });
      return authRedirect("/login");
    }
    if (!["GET", "HEAD"].includes(request.method) && !authSameOrigin(request)) return new Response("Origem n\xE3o permitida.", { status: 403 });
    const headers = new Headers(request.headers);
    headers.set("oai-authenticated-user-id", "local-preview");
    const authenticated = new Request(request, { headers });
    const response = new URL(request.url).pathname.startsWith("/api/") ? await app.fetch(authenticated, env2) : await env2.ASSETS.fetch(request);
    const result = new Response(response.body, response);
    result.headers.set("Cache-Control", "private, no-store");
    result.headers.set("X-Content-Type-Options", "nosniff");
    result.headers.set("Referrer-Policy", "same-origin");
    result.headers.set("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; frame-ancestors 'none'");
    return result;
  }
};
export {
  worker_default as default
};
//# sourceMappingURL=bundledWorker-0.8378664061872569.mjs.map
