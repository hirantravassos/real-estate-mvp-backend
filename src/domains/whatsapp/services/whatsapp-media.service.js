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
exports.WhatsappMediaService = void 0;
var common_1 = require("@nestjs/common");
var baileys_1 = require("@whiskeysockets/baileys");
var path_1 = require("path");
var node_fs_1 = require("node:fs");
var STORAGE_ROOT = (0, path_1.join)(process.cwd(), "storage");
var EXTENSION_BY_MIMETYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/3gpp": ".3gp",
    "audio/ogg; codecs=opus": ".ogg",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/zip": ".zip",
};
var WhatsappMediaService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WhatsappMediaService = _classThis = /** @class */ (function () {
        function WhatsappMediaService_1(messageRepository) {
            this.messageRepository = messageRepository;
            if (!(0, node_fs_1.existsSync)(STORAGE_ROOT)) {
                (0, node_fs_1.mkdirSync)(STORAGE_ROOT, { recursive: true });
            }
        }
        WhatsappMediaService_1.prototype.downloadAndStore = function (user, rawMessage) {
            return __awaiter(this, void 0, void 0, function () {
                var mediaInfo, messageId, whatsappId, buffer, userDirectory, fileName, relativePath, absolutePath, error_1;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            mediaInfo = this.extractMediaInfo(rawMessage);
                            if (!mediaInfo)
                                return [2 /*return*/];
                            messageId = (_a = rawMessage.key) === null || _a === void 0 ? void 0 : _a.id;
                            whatsappId = (_b = rawMessage.key) === null || _b === void 0 ? void 0 : _b.remoteJid;
                            if (!messageId || !whatsappId)
                                return [2 /*return*/];
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 4, , 5]);
                            return [4 /*yield*/, (0, baileys_1.downloadMediaMessage)(rawMessage, "buffer", {})];
                        case 2:
                            buffer = _c.sent();
                            userDirectory = (0, path_1.join)(STORAGE_ROOT, user.id);
                            if (!(0, node_fs_1.existsSync)(userDirectory)) {
                                (0, node_fs_1.mkdirSync)(userDirectory, { recursive: true });
                            }
                            fileName = "".concat(messageId).concat(mediaInfo.extension);
                            relativePath = "".concat(user.id, "/").concat(fileName);
                            absolutePath = (0, path_1.join)(userDirectory, fileName);
                            (0, node_fs_1.writeFileSync)(absolutePath, buffer);
                            return [4 /*yield*/, this.messageRepository.update({ messageId: messageId, whatsappId: whatsappId, userId: user.id }, { mediaPath: relativePath, mimetype: mediaInfo.mimetype })];
                        case 3:
                            _c.sent();
                            return [3 /*break*/, 5];
                        case 4:
                            error_1 = _c.sent();
                            console.warn("Media download failed for message ".concat(messageId, ":\n"), error_1 === null || error_1 === void 0 ? void 0 : error_1.message, "\n\nFailed Media Payload Report:\n".concat(JSON.stringify({ rawMessage: rawMessage, mediaInfo: mediaInfo }, null, 2)));
                            return [3 /*break*/, 5];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappMediaService_1.prototype.getAbsolutePath = function (relativePath) {
            return (0, path_1.join)(STORAGE_ROOT, relativePath);
        };
        WhatsappMediaService_1.prototype.extractMediaInfo = function (message) {
            var _a, _b, _c, _d, _e, _f;
            var content = this.unwrapMessage(message.message);
            if (!content)
                return null;
            if (content.imageMessage) {
                var mimetype = (_a = content.imageMessage.mimetype) !== null && _a !== void 0 ? _a : "image/jpeg";
                return { mimetype: mimetype, extension: this.resolveExtension(mimetype, ".jpg") };
            }
            if (content.videoMessage) {
                var mimetype = (_b = content.videoMessage.mimetype) !== null && _b !== void 0 ? _b : "video/mp4";
                return { mimetype: mimetype, extension: this.resolveExtension(mimetype, ".mp4") };
            }
            if (content.ptvMessage) {
                var mimetype = (_c = content.ptvMessage.mimetype) !== null && _c !== void 0 ? _c : "video/mp4";
                return { mimetype: mimetype, extension: this.resolveExtension(mimetype, ".mp4") };
            }
            if (content.audioMessage) {
                var mimetype = (_d = content.audioMessage.mimetype) !== null && _d !== void 0 ? _d : "audio/ogg; codecs=opus";
                return { mimetype: mimetype, extension: this.resolveExtension(mimetype, ".ogg") };
            }
            if (content.documentMessage) {
                var mimetype = (_e = content.documentMessage.mimetype) !== null && _e !== void 0 ? _e : "application/octet-stream";
                var originalFileName = content.documentMessage.fileName;
                var extension = originalFileName
                    ? this.extractExtensionFromFileName(originalFileName)
                    : this.resolveExtension(mimetype, ".bin");
                return { mimetype: mimetype, extension: extension };
            }
            if (content.stickerMessage) {
                var mimetype = (_f = content.stickerMessage.mimetype) !== null && _f !== void 0 ? _f : "image/webp";
                return { mimetype: mimetype, extension: this.resolveExtension(mimetype, ".webp") };
            }
            if (content.lottieStickerMessage) {
                var mimetype = "image/webp";
                return { mimetype: mimetype, extension: this.resolveExtension(mimetype, ".webp") };
            }
            return null;
        };
        WhatsappMediaService_1.prototype.unwrapMessage = function (message) {
            if (!message)
                return null;
            var wrapperCandidates = [
                message.viewOnceMessage,
                message.viewOnceMessageV2,
                message.viewOnceMessageV2Extension,
                message.ephemeralMessage,
                message.documentWithCaptionMessage,
                message.editedMessage,
            ];
            for (var _i = 0, wrapperCandidates_1 = wrapperCandidates; _i < wrapperCandidates_1.length; _i++) {
                var wrapper = wrapperCandidates_1[_i];
                if (wrapper === null || wrapper === void 0 ? void 0 : wrapper.message) {
                    return this.unwrapMessage(wrapper.message);
                }
            }
            return message;
        };
        WhatsappMediaService_1.prototype.resolveExtension = function (mimetype, fallback) {
            var _a;
            return (_a = EXTENSION_BY_MIMETYPE[mimetype]) !== null && _a !== void 0 ? _a : fallback;
        };
        WhatsappMediaService_1.prototype.extractExtensionFromFileName = function (fileName) {
            var lastDot = fileName.lastIndexOf(".");
            if (lastDot === -1)
                return ".bin";
            return fileName.slice(lastDot);
        };
        return WhatsappMediaService_1;
    }());
    __setFunctionName(_classThis, "WhatsappMediaService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappMediaService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappMediaService = _classThis;
}();
exports.WhatsappMediaService = WhatsappMediaService;
