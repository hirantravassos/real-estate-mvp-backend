"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
exports.WhatsappGateway = exports.GATEWAY_WHATSAPP_EVENTS = void 0;
var websockets_1 = require("@nestjs/websockets");
var common_1 = require("@nestjs/common");
var secure_gateway_1 = require("../../auth/gateways/secure.gateway");
var websocket_jwt_guard_1 = require("../../auth/guards/websocket-jwt.guard");
var GATEWAY_KEY = "whatsapp";
exports.GATEWAY_WHATSAPP_EVENTS = {
    LISTEN: {
        STATUS: "".concat(GATEWAY_KEY, ".status.listen"),
        CHAT: "".concat(GATEWAY_KEY, ".chat.listen"),
        CHATS: "".concat(GATEWAY_KEY, ".chats.listen"),
    },
    TRIGGER: {
        STATUS: "".concat(GATEWAY_KEY, ".status.trigger"),
        CHAT: "".concat(GATEWAY_KEY, ".chat.trigger"),
        CHATS: "".concat(GATEWAY_KEY, ".chats.trigger"),
    },
};
var WhatsappGateway = function () {
    var _classDecorators = [(0, websockets_1.WebSocketGateway)({
            cors: {
                origin: "*",
            },
        })];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = secure_gateway_1.BaseSecureGateway;
    var _instanceExtraInitializers = [];
    var _server_decorators;
    var _server_initializers = [];
    var _server_extraInitializers = [];
    var _handleGetStatus_decorators;
    var _handleGetChats_decorators;
    var _handleGetChat_decorators;
    var WhatsappGateway = _classThis = /** @class */ (function (_super) {
        __extends(WhatsappGateway_1, _super);
        function WhatsappGateway_1(wsJwtGuard, whatsappService, whatsappChatService) {
            var _this = _super.call(this, wsJwtGuard) || this;
            _this.whatsappService = (__runInitializers(_this, _instanceExtraInitializers), whatsappService);
            _this.whatsappChatService = whatsappChatService;
            _this.server = __runInitializers(_this, _server_initializers, void 0);
            _this.logger = (__runInitializers(_this, _server_extraInitializers), new common_1.Logger(WhatsappGateway.name));
            return _this;
        }
        WhatsappGateway_1.prototype.handleGetStatus = function (user, client) {
            return __awaiter(this, void 0, void 0, function () {
                var status;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.whatsappService.findStatus(user)];
                        case 1:
                            status = _a.sent();
                            console.log("status triggered", user.name, client.id, status);
                            client.emit(exports.GATEWAY_WHATSAPP_EVENTS.TRIGGER.STATUS, status);
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappGateway_1.prototype.handleGetChats = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.emitChatsUpdate(user)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappGateway_1.prototype.handleGetChat = function (user, payload) {
            return __awaiter(this, void 0, void 0, function () {
                var whatsappId;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            whatsappId = payload === null || payload === void 0 ? void 0 : payload.whatsappId;
                            if (!whatsappId)
                                return [2 /*return*/];
                            void this.whatsappChatService.save(user, payload === null || payload === void 0 ? void 0 : payload.whatsappId, {
                                unread: false,
                            });
                            return [4 /*yield*/, this.emitChatUpdate(user, payload.whatsappId)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.emitChatsUpdate(user)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappGateway_1.prototype.emitStatusUpdate = function (userId, payload) {
            console.log("emitting status update", userId, payload);
            this.server
                .to("user_".concat(userId))
                .emit(exports.GATEWAY_WHATSAPP_EVENTS.LISTEN.STATUS, payload);
        };
        WhatsappGateway_1.prototype.emitChatsUpdate = function (user) {
            return __awaiter(this, void 0, void 0, function () {
                var chats;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.whatsappChatService.findAll(user)];
                        case 1:
                            chats = _a.sent();
                            this.server
                                .to("user_".concat(user.id))
                                .emit(exports.GATEWAY_WHATSAPP_EVENTS.LISTEN.CHATS, chats);
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappGateway_1.prototype.emitChatUpdate = function (user, whatsappId) {
            return __awaiter(this, void 0, void 0, function () {
                var chat;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.whatsappChatService.findOne(user, whatsappId)];
                        case 1:
                            chat = _a.sent();
                            this.server
                                .to("user_".concat(user.id))
                                .emit(exports.GATEWAY_WHATSAPP_EVENTS.LISTEN.CHAT, chat);
                            return [2 /*return*/];
                    }
                });
            });
        };
        return WhatsappGateway_1;
    }(_classSuper));
    __setFunctionName(_classThis, "WhatsappGateway");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _server_decorators = [(0, websockets_1.WebSocketServer)()];
        _handleGetStatus_decorators = [(0, common_1.UseGuards)(websocket_jwt_guard_1.WsJwtGuard), (0, websockets_1.SubscribeMessage)(exports.GATEWAY_WHATSAPP_EVENTS.TRIGGER.STATUS)];
        _handleGetChats_decorators = [(0, common_1.UseGuards)(websocket_jwt_guard_1.WsJwtGuard), (0, websockets_1.SubscribeMessage)(exports.GATEWAY_WHATSAPP_EVENTS.TRIGGER.CHAT)];
        _handleGetChat_decorators = [(0, common_1.UseGuards)(websocket_jwt_guard_1.WsJwtGuard), (0, websockets_1.SubscribeMessage)(exports.GATEWAY_WHATSAPP_EVENTS.TRIGGER.CHATS)];
        __esDecorate(_classThis, null, _handleGetStatus_decorators, { kind: "method", name: "handleGetStatus", static: false, private: false, access: { has: function (obj) { return "handleGetStatus" in obj; }, get: function (obj) { return obj.handleGetStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleGetChats_decorators, { kind: "method", name: "handleGetChats", static: false, private: false, access: { has: function (obj) { return "handleGetChats" in obj; }, get: function (obj) { return obj.handleGetChats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _handleGetChat_decorators, { kind: "method", name: "handleGetChat", static: false, private: false, access: { has: function (obj) { return "handleGetChat" in obj; }, get: function (obj) { return obj.handleGetChat; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, null, _server_decorators, { kind: "field", name: "server", static: false, private: false, access: { has: function (obj) { return "server" in obj; }, get: function (obj) { return obj.server; }, set: function (obj, value) { obj.server = value; } }, metadata: _metadata }, _server_initializers, _server_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappGateway = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappGateway = _classThis;
}();
exports.WhatsappGateway = WhatsappGateway;
