"use strict";
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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappSocketService = void 0;
var common_1 = require("@nestjs/common");
var baileys_1 = require("@whiskeysockets/baileys");
var path_1 = require("path");
var node_fs_1 = require("node:fs");
var whatsapp_connection_status_enum_1 = require("../enums/whatsapp-connection-status.enum");
var WhatsappSocketService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WhatsappSocketService = _classThis = /** @class */ (function () {
        function WhatsappSocketService_1(userRepository, sessionService, eventProcessor) {
            this.userRepository = userRepository;
            this.sessionService = sessionService;
            this.eventProcessor = eventProcessor;
            this.sockets = new Map();
            this.sessionsDir = (0, path_1.join)(process.cwd(), "sessions");
            if (!(0, node_fs_1.existsSync)(this.sessionsDir)) {
                (0, node_fs_1.mkdirSync)(this.sessionsDir, { recursive: true });
            }
        }
        WhatsappSocketService_1.prototype.onModuleInit = function () {
            return __awaiter(this, void 0, void 0, function () {
                var users, _loop_1, this_1, _i, users_1, user;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.userRepository.find({
                                where: { active: true },
                                relations: {
                                    session: true,
                                },
                            })];
                        case 1:
                            users = _b.sent();
                            _loop_1 = function (user) {
                                var sessionId;
                                return __generator(this, function (_c) {
                                    switch (_c.label) {
                                        case 0:
                                            sessionId = (_a = user.session) === null || _a === void 0 ? void 0 : _a.id;
                                            if (!sessionId)
                                                return [2 /*return*/, "continue"];
                                            return [4 /*yield*/, this_1.start(sessionId, user).catch(function (error) {
                                                    console.error("Initial boot failed for " + sessionId, error);
                                                })];
                                        case 1:
                                            _c.sent();
                                            return [2 /*return*/];
                                    }
                                });
                            };
                            this_1 = this;
                            _i = 0, users_1 = users;
                            _b.label = 2;
                        case 2:
                            if (!(_i < users_1.length)) return [3 /*break*/, 5];
                            user = users_1[_i];
                            return [5 /*yield**/, _loop_1(user)];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 2];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappSocketService_1.prototype.start = function (sessionId, user) {
            return __awaiter(this, void 0, void 0, function () {
                var socket;
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.createSocket(sessionId)];
                        case 1:
                            socket = _a.sent();
                            socket.ev.on("messaging-history.set", function (data) {
                                void _this.eventProcessor.processHistorySync(user, data);
                            });
                            socket.ev.on("messages.upsert", function (data) {
                                console.log("EVENT messages.upsert", data);
                                void _this.eventProcessor.processMessages(user, data.messages);
                            });
                            socket.ev.on("messages.update", function (data) {
                                console.log("EVENT messages.update", data);
                                void _this.eventProcessor.processMessageUpdate(user, data);
                            });
                            socket.ev.on("chats.upsert", function (data) {
                                console.log("chats.upsert CHAT CREATED", data);
                                void _this.eventProcessor.processChats(user, data);
                            });
                            socket.ev.on("chats.update", function (data) {
                                console.log("chats.update CHAT UPDATED", data);
                                void _this.eventProcessor.processChats(user, data);
                            });
                            socket.ev.on("call", function (data) {
                                console.log("call", data);
                            });
                            socket.ev.on("lid-mapping.update", function (data) {
                                console.log("lid-mapping.update NO IDEA", data);
                                console.log("lid-mapping.update", data);
                            });
                            socket.ev.on("presence.update", function () {
                                // console.log("presence.update PERSON IS TYPING", data);
                                // Show if a person is typing something to the user
                            });
                            socket.ev.on("contacts.upsert", function (data) {
                                void _this.eventProcessor.processContacts(user, data);
                            });
                            socket.ev.on("contacts.update", function (data) {
                                void _this.eventProcessor.processContacts(user, data);
                            });
                            socket.ev.on("connection.update", function (data) {
                                void _this.handleConnectionUpdate(sessionId, user, data);
                            });
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappSocketService_1.prototype.getSocketOrFail = function (sessionId) {
            if (!sessionId) {
                throw new common_1.NotFoundException("Session not found");
            }
            var found = this.sockets.get(sessionId);
            if (!found) {
                throw new common_1.NotFoundException("Socket not found");
            }
            return found;
        };
        WhatsappSocketService_1.prototype.getSocketByUserOrFail = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var session;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!userId) {
                                throw new common_1.BadRequestException("User not provided");
                            }
                            return [4 /*yield*/, this.sessionService.findOneByUserId(userId)];
                        case 1:
                            session = _a.sent();
                            if (!session) {
                                throw new common_1.NotFoundException("Session not found");
                            }
                            return [2 /*return*/, this.getSocketOrFail(session === null || session === void 0 ? void 0 : session.id)];
                    }
                });
            });
        };
        WhatsappSocketService_1.prototype.destroySession = function (sessionId, statusCode) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionPath;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            sessionPath = (0, path_1.join)(this.sessionsDir, sessionId);
                            return [4 /*yield*/, node_fs_1.promises.rm(sessionPath, { recursive: true, force: true })];
                        case 1:
                            _a.sent();
                            console.warn("Session ".concat(sessionId, " KILLED (Code: ").concat(statusCode, "). DB record and files removed."));
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappSocketService_1.prototype.createSocket = function (sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var sessionPath, version, _a, state, saveCreds, socket;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            sessionPath = (0, path_1.join)(this.sessionsDir, sessionId);
                            if (!(0, node_fs_1.existsSync)(sessionPath)) {
                                (0, node_fs_1.mkdirSync)(sessionPath, { recursive: true });
                            }
                            return [4 /*yield*/, (0, baileys_1.fetchLatestBaileysVersion)()];
                        case 1:
                            version = (_b.sent()).version;
                            return [4 /*yield*/, (0, baileys_1.useMultiFileAuthState)(sessionPath)];
                        case 2:
                            _a = _b.sent(), state = _a.state, saveCreds = _a.saveCreds;
                            socket = (0, baileys_1.default)({
                                version: version,
                                auth: state,
                                browser: baileys_1.Browsers.macOS("Desktop"),
                                syncFullHistory: true,
                                connectTimeoutMs: 60000,
                                keepAliveIntervalMs: 30000,
                            });
                            socket.ev.on("creds.update", function () {
                                saveCreds().catch(function (err) {
                                    return console.error("Save creds failed for " + sessionId, err);
                                });
                            });
                            this.sockets.set(sessionId, socket);
                            return [2 /*return*/, socket];
                    }
                });
            });
        };
        WhatsappSocketService_1.prototype.handleConnectionUpdate = function (sessionId, user, update) {
            var _this = this;
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            var lastDisconnect = update.lastDisconnect, qr = update.qr;
            var connection = update.connection;
            var socket = this.getSocketOrFail(sessionId);
            if (connection === "open") {
                void this.sessionService.save(user, {
                    status: whatsapp_connection_status_enum_1.WhatsappConnectionStatusEnum.CONNECTED,
                });
                return;
            }
            if (connection === "connecting") {
                void this.sessionService.save(user, {
                    status: whatsapp_connection_status_enum_1.WhatsappConnectionStatusEnum.CONNECTING,
                    name: (_d = (_c = (_b = (_a = socket === null || socket === void 0 ? void 0 : socket.authState) === null || _a === void 0 ? void 0 : _a.creds) === null || _b === void 0 ? void 0 : _b.me) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : user.name,
                });
                return;
            }
            if (qr) {
                void this.sessionService.save(user, {
                    qr: qr !== null && qr !== void 0 ? qr : null,
                    name: (_h = (_g = (_f = (_e = socket === null || socket === void 0 ? void 0 : socket.authState) === null || _e === void 0 ? void 0 : _e.creds) === null || _f === void 0 ? void 0 : _f.me) === null || _g === void 0 ? void 0 : _g.name) !== null && _h !== void 0 ? _h : user.name,
                });
                return;
            }
            if (connection === "close") {
                var statusCode = (_k = (_j = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _j === void 0 ? void 0 : _j.output) === null || _k === void 0 ? void 0 : _k.statusCode;
                var isTerminal = statusCode === 401 || statusCode === 405 || statusCode === 411;
                if (isTerminal) {
                    this.destroySession(sessionId, statusCode).catch(console.error);
                    setTimeout(function () {
                        _this.start(sessionId, user).catch(console.error);
                    }, 1000);
                    return;
                }
                this.start(sessionId, user).catch(console.error);
            }
        };
        return WhatsappSocketService_1;
    }());
    __setFunctionName(_classThis, "WhatsappSocketService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappSocketService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappSocketService = _classThis;
}();
exports.WhatsappSocketService = WhatsappSocketService;
