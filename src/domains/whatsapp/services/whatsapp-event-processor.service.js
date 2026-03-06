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
exports.WhatsappEventProcessorService = void 0;
var common_1 = require("@nestjs/common");
var baileys_1 = require("@whiskeysockets/baileys");
var dayjs_1 = require("dayjs");
var whatsapp_message_type_enum_1 = require("../enums/whatsapp-message-type.enum");
var WHATSAPP_PNID_SUFFIX = "@s.whatsapp.net";
var MINIMUM_PHONE_LENGTH = 10;
var COUNTRY_CODE_LENGTH = 2;
var WhatsappEventProcessorService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var WhatsappEventProcessorService = _classThis = /** @class */ (function () {
        function WhatsappEventProcessorService_1(contactService, chatService, messageService, mediaService, gateway) {
            this.contactService = contactService;
            this.chatService = chatService;
            this.messageService = messageService;
            this.mediaService = mediaService;
            this.gateway = gateway;
        }
        WhatsappEventProcessorService_1.prototype.processHistorySync = function (user, data) {
            return __awaiter(this, void 0, void 0, function () {
                var _this = this;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(data.syncType === baileys_1.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.processChats(user, data.chats)];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.processContactsFromChats(user, data.chats)];
                        case 2:
                            _a.sent();
                            return [2 /*return*/];
                        case 3:
                            if (data.syncType === baileys_1.proto.HistorySync.HistorySyncType.PUSH_NAME) {
                                setTimeout(function () {
                                    void _this.processContactsNames(user, data.contacts);
                                }, 5000);
                                return [2 /*return*/];
                            }
                            if (data.syncType === baileys_1.proto.HistorySync.HistorySyncType.RECENT) {
                                void this.processMessages(user, data.messages);
                                return [2 /*return*/];
                            }
                            if (data.syncType === baileys_1.proto.HistorySync.HistorySyncType.FULL) {
                                void this.processMessages(user, data.messages);
                                return [2 /*return*/];
                            }
                            if (data.syncType === baileys_1.proto.HistorySync.HistorySyncType.INITIAL_STATUS_V3) {
                                // No data, only sync meta for connections
                                return [2 /*return*/];
                            }
                            if (data.syncType === baileys_1.proto.HistorySync.HistorySyncType.NON_BLOCKING_DATA) {
                                // No data, only sync meta for connections
                                return [2 /*return*/];
                            }
                            console.warn("NEW SYNC TYPE!!!!! ".concat(data.syncType), JSON.stringify(data));
                            return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappEventProcessorService_1.prototype.processMessages = function (user, newMessages) {
            return __awaiter(this, void 0, void 0, function () {
                var _loop_1, this_1, _i, newMessages_1, message;
                var _this = this;
                var _a, _b, _c;
                return __generator(this, function (_d) {
                    switch (_d.label) {
                        case 0:
                            _loop_1 = function (message) {
                                var whatsappId, messageId, isFromMe, sentAt, unwrapped;
                                return __generator(this, function (_e) {
                                    switch (_e.label) {
                                        case 0: return [4 /*yield*/, new Promise(function (resolve) {
                                                setTimeout(function () {
                                                    resolve({});
                                                }, 200);
                                            })];
                                        case 1:
                                            _e.sent();
                                            whatsappId = (_a = message.key) === null || _a === void 0 ? void 0 : _a.remoteJid;
                                            messageId = (_b = message.key) === null || _b === void 0 ? void 0 : _b.id;
                                            isFromMe = !!((_c = message.key) === null || _c === void 0 ? void 0 : _c.fromMe);
                                            sentAt = message.messageTimestamp
                                                ? dayjs_1.default.unix(message.messageTimestamp).toISOString()
                                                : new Date().toISOString();
                                            if (!whatsappId)
                                                return [2 /*return*/, "continue"];
                                            if (!messageId)
                                                return [2 /*return*/, "continue"];
                                            if (message.message || message.messageTimestamp) {
                                                unwrapped = this_1.unwrapMessage(message.message);
                                                void this_1.messageService.save(user, {
                                                    messageId: messageId,
                                                    whatsappId: whatsappId,
                                                    sentAt: sentAt,
                                                    content: this_1.extractContent(unwrapped),
                                                    type: this_1.resolveMessageType(unwrapped),
                                                    me: isFromMe,
                                                });
                                                if (message.message) {
                                                    void this_1.mediaService.downloadAndStore(user, message).then(function () {
                                                        void _this.gateway.emitChatUpdate(user, whatsappId);
                                                    });
                                                }
                                            }
                                            return [2 /*return*/];
                                    }
                                });
                            };
                            this_1 = this;
                            _i = 0, newMessages_1 = newMessages;
                            _d.label = 1;
                        case 1:
                            if (!(_i < newMessages_1.length)) return [3 /*break*/, 4];
                            message = newMessages_1[_i];
                            return [5 /*yield**/, _loop_1(message)];
                        case 2:
                            _d.sent();
                            _d.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappEventProcessorService_1.prototype.processChats = function (user, newChats) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, newChats_1, chat, whatsappId, lastSentAt;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _i = 0, newChats_1 = newChats;
                            _b.label = 1;
                        case 1:
                            if (!(_i < newChats_1.length)) return [3 /*break*/, 5];
                            chat = newChats_1[_i];
                            return [4 /*yield*/, new Promise(function (resolve) {
                                    setTimeout(function () {
                                        resolve({});
                                    }, 200);
                                })];
                        case 2:
                            _b.sent();
                            whatsappId = chat === null || chat === void 0 ? void 0 : chat.id;
                            lastSentAt = chat.lastMessageRecvTimestamp
                                ? new Date(chat.lastMessageRecvTimestamp).toISOString()
                                : undefined;
                            if (!whatsappId)
                                return [3 /*break*/, 4];
                            return [4 /*yield*/, this.chatService.save(user, whatsappId, {
                                    unread: ((_a = chat.unreadCount) !== null && _a !== void 0 ? _a : 0) > 0,
                                    lastSentAt: lastSentAt,
                                })];
                        case 3:
                            _b.sent();
                            _b.label = 4;
                        case 4:
                            _i++;
                            return [3 /*break*/, 1];
                        case 5: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappEventProcessorService_1.prototype.processContactsFromChats = function (user, newChats) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, newChats_2, chat, whatsappId, isLid, phoneNumber;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _i = 0, newChats_2 = newChats;
                            _a.label = 1;
                        case 1:
                            if (!(_i < newChats_2.length)) return [3 /*break*/, 4];
                            chat = newChats_2[_i];
                            whatsappId = chat === null || chat === void 0 ? void 0 : chat.id;
                            isLid = whatsappId === null || whatsappId === void 0 ? void 0 : whatsappId.includes("@lid");
                            phoneNumber = this.extractPhoneNumber(chat.pnJid);
                            if (!(isLid && phoneNumber && whatsappId)) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.contactService.save(user, whatsappId, {
                                    phoneNumber: phoneNumber,
                                })];
                        case 2:
                            _a.sent();
                            _a.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappEventProcessorService_1.prototype.processContactsNames = function (user, newContacts) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, newContacts_1, contact, phone, name_1;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _i = 0, newContacts_1 = newContacts;
                            _b.label = 1;
                        case 1:
                            if (!(_i < newContacts_1.length)) return [3 /*break*/, 4];
                            contact = newContacts_1[_i];
                            phone = this.extractPhoneNumber(contact === null || contact === void 0 ? void 0 : contact.id);
                            name_1 = (_a = contact === null || contact === void 0 ? void 0 : contact.notify) !== null && _a !== void 0 ? _a : null;
                            if (!phone) return [3 /*break*/, 3];
                            return [4 /*yield*/, this.contactService.updateNameByPhoneNumber(user, phone, name_1)];
                        case 2:
                            _b.sent();
                            _b.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappEventProcessorService_1.prototype.processContacts = function (user, newContacts) {
            return __awaiter(this, void 0, void 0, function () {
                var _i, newContacts_2, contact, whatsappId, name_2, phoneNumber, isWhatsappIdLidId;
                var _a;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            _i = 0, newContacts_2 = newContacts;
                            _b.label = 1;
                        case 1:
                            if (!(_i < newContacts_2.length)) return [3 /*break*/, 4];
                            contact = newContacts_2[_i];
                            return [4 /*yield*/, new Promise(function (resolve) {
                                    setTimeout(function () {
                                        resolve({});
                                    }, 200);
                                })];
                        case 2:
                            _b.sent();
                            whatsappId = contact === null || contact === void 0 ? void 0 : contact.id;
                            name_2 = (_a = contact === null || contact === void 0 ? void 0 : contact.notify) !== null && _a !== void 0 ? _a : null;
                            phoneNumber = this.extractPhoneNumber(whatsappId);
                            isWhatsappIdLidId = !(whatsappId === null || whatsappId === void 0 ? void 0 : whatsappId.includes(WHATSAPP_PNID_SUFFIX));
                            if (whatsappId && isWhatsappIdLidId) {
                                void this.contactService.save(user, whatsappId, {
                                    name: name_2,
                                    phoneNumber: phoneNumber,
                                });
                                return [3 /*break*/, 3];
                            }
                            if (phoneNumber && !isWhatsappIdLidId) {
                                void this.contactService.updateNameByPhoneNumber(user, phoneNumber, name_2);
                            }
                            _b.label = 3;
                        case 3:
                            _i++;
                            return [3 /*break*/, 1];
                        case 4: return [2 /*return*/];
                    }
                });
            });
        };
        WhatsappEventProcessorService_1.prototype.processMessageUpdate = function (user, updatedMessages) {
            var _a;
            for (var _i = 0, updatedMessages_1 = updatedMessages; _i < updatedMessages_1.length; _i++) {
                var message = updatedMessages_1[_i];
                var whatsappId = (_a = message === null || message === void 0 ? void 0 : message.key) === null || _a === void 0 ? void 0 : _a.remoteJid;
                var unread = message.update.status !== baileys_1.proto.WebMessageInfo.Status.READ;
                if (!whatsappId)
                    return;
                void this.chatService.save(user, whatsappId, {
                    unread: unread,
                });
            }
        };
        WhatsappEventProcessorService_1.prototype.extractPhoneNumber = function (jid) {
            if (!(jid === null || jid === void 0 ? void 0 : jid.includes(WHATSAPP_PNID_SUFFIX)))
                return null;
            var rawNumber = jid
                .replace(WHATSAPP_PNID_SUFFIX, "")
                .slice(COUNTRY_CODE_LENGTH);
            if (rawNumber.length < MINIMUM_PHONE_LENGTH)
                return null;
            return rawNumber;
        };
        WhatsappEventProcessorService_1.prototype.unwrapMessage = function (message) {
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
        WhatsappEventProcessorService_1.prototype.resolveMessageType = function (message) {
            var _a;
            if (!message)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.UNKNOWN;
            if (message.conversation)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.TEXT;
            if (message.extendedTextMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.TEXT;
            if (message.imageMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.IMAGE;
            if (message.videoMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.VIDEO;
            if (message.ptvMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.PTV;
            if ((_a = message.audioMessage) === null || _a === void 0 ? void 0 : _a.ptt)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.VOICE;
            if (message.audioMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.AUDIO;
            if (message.documentMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.DOCUMENT;
            if (message.stickerMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.STICKER;
            if (message.lottieStickerMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.LOTTIE_STICKER;
            if (message.locationMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.LOCATION;
            if (message.liveLocationMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.LIVE_LOCATION;
            if (message.contactMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.CONTACT;
            if (message.contactsArrayMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.CONTACT_ARRAY;
            if (message.groupInviteMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.GROUP_INVITE;
            if (message.listMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.LIST;
            if (message.listResponseMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.LIST_RESPONSE;
            if (message.buttonsMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.BUTTONS;
            if (message.buttonsResponseMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.BUTTONS_RESPONSE;
            if (message.templateMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.TEMPLATE;
            if (message.reactionMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.REACTION;
            if (message.pollCreationMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.POLL;
            if (message.pollCreationMessageV2)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.POLL;
            if (message.pollCreationMessageV3)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.POLL;
            if (message.pollUpdateMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.POLL_UPDATE;
            if (message.orderMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.ORDER;
            if (message.interactiveMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.INTERACTIVE;
            if (message.interactiveResponseMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.INTERACTIVE;
            if (message.callLogMesssage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.CALL;
            if (message.bcallMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.CALL;
            if (message.albumMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.ALBUM;
            if (message.eventMessage)
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.EVENT;
            if (message.protocolMessage) {
                if (message.protocolMessage.type === 14) {
                    return this.resolveMessageType(message.protocolMessage.editedMessage);
                }
                return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.PROTOCOL;
            }
            return whatsapp_message_type_enum_1.WhatsappMessageTypeEnum.UNKNOWN;
        };
        WhatsappEventProcessorService_1.prototype.extractContent = function (message) {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
            if (!message)
                return "";
            if (message.conversation)
                return message.conversation;
            if ((_a = message.extendedTextMessage) === null || _a === void 0 ? void 0 : _a.text)
                return message.extendedTextMessage.text;
            if ((_b = message.imageMessage) === null || _b === void 0 ? void 0 : _b.caption)
                return message.imageMessage.caption;
            if ((_c = message.videoMessage) === null || _c === void 0 ? void 0 : _c.caption)
                return message.videoMessage.caption;
            if ((_d = message.ptvMessage) === null || _d === void 0 ? void 0 : _d.caption)
                return message.ptvMessage.caption;
            if ((_e = message.documentMessage) === null || _e === void 0 ? void 0 : _e.fileName)
                return message.documentMessage.fileName;
            if ((_f = message.contactMessage) === null || _f === void 0 ? void 0 : _f.displayName)
                return message.contactMessage.displayName;
            if ((_g = message.contactsArrayMessage) === null || _g === void 0 ? void 0 : _g.contacts) {
                return message.contactsArrayMessage.contacts
                    .map(function (contact) { return contact.displayName; })
                    .filter(Boolean)
                    .join(", ");
            }
            if (message.locationMessage) {
                var latitude = message.locationMessage.degreesLatitude;
                var longitude = message.locationMessage.degreesLongitude;
                if (latitude && longitude) {
                    return "https://maps.google.com/?q=".concat(latitude, ",").concat(longitude);
                }
                return (_h = message.locationMessage.name) !== null && _h !== void 0 ? _h : "";
            }
            if (message.liveLocationMessage) {
                var latitude = message.liveLocationMessage.degreesLatitude;
                var longitude = message.liveLocationMessage.degreesLongitude;
                if (latitude && longitude) {
                    return "https://maps.google.com/?q=".concat(latitude, ",").concat(longitude);
                }
                return (_j = message.liveLocationMessage.caption) !== null && _j !== void 0 ? _j : "";
            }
            if ((_k = message.groupInviteMessage) === null || _k === void 0 ? void 0 : _k.groupName)
                return message.groupInviteMessage.groupName;
            if (message.listMessage) {
                return (_m = (_l = message.listMessage.title) !== null && _l !== void 0 ? _l : message.listMessage.description) !== null && _m !== void 0 ? _m : "";
            }
            if ((_o = message.listResponseMessage) === null || _o === void 0 ? void 0 : _o.title)
                return message.listResponseMessage.title;
            if ((_p = message.buttonsMessage) === null || _p === void 0 ? void 0 : _p.contentText)
                return message.buttonsMessage.contentText;
            if ((_q = message.buttonsResponseMessage) === null || _q === void 0 ? void 0 : _q.selectedDisplayText)
                return message.buttonsResponseMessage.selectedDisplayText;
            if ((_r = message.reactionMessage) === null || _r === void 0 ? void 0 : _r.text)
                return message.reactionMessage.text;
            if ((_s = message.pollCreationMessage) === null || _s === void 0 ? void 0 : _s.name)
                return message.pollCreationMessage.name;
            if ((_t = message.pollCreationMessageV2) === null || _t === void 0 ? void 0 : _t.name)
                return message.pollCreationMessageV2.name;
            if ((_u = message.pollCreationMessageV3) === null || _u === void 0 ? void 0 : _u.name)
                return message.pollCreationMessageV3.name;
            if ((_v = message.orderMessage) === null || _v === void 0 ? void 0 : _v.message)
                return message.orderMessage.message;
            if ((_x = (_w = message.interactiveMessage) === null || _w === void 0 ? void 0 : _w.body) === null || _x === void 0 ? void 0 : _x.text)
                return message.interactiveMessage.body.text;
            if ((_y = message.templateMessage) === null || _y === void 0 ? void 0 : _y.hydratedFourRowTemplate) {
                var template = message.templateMessage.hydratedFourRowTemplate;
                return (_0 = (_z = template.hydratedContentText) !== null && _z !== void 0 ? _z : template.hydratedTitleText) !== null && _0 !== void 0 ? _0 : "";
            }
            if (message.audioMessage)
                return "";
            if (message.stickerMessage)
                return "";
            if (message.lottieStickerMessage)
                return "";
            if (message.protocolMessage) {
                if (message.protocolMessage.type === 14) {
                    // 14 is the protobuf enum for MESSAGE_EDIT
                    var text = this.extractContent(message.protocolMessage.editedMessage);
                    return text ? "[Editado] ".concat(text) : "";
                }
                return "";
            }
            console.warn("Unhandled message content parsing payload:\n".concat(JSON.stringify(message, null, 2)));
            return "";
        };
        return WhatsappEventProcessorService_1;
    }());
    __setFunctionName(_classThis, "WhatsappEventProcessorService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappEventProcessorService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappEventProcessorService = _classThis;
}();
exports.WhatsappEventProcessorService = WhatsappEventProcessorService;
