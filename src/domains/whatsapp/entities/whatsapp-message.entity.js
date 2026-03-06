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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsappMessage = void 0;
var typeorm_1 = require("typeorm");
var base_entity_1 = require("../../../shared/entities/base.entity");
var user_entity_1 = require("../../users/entities/user.entity");
var whatsapp_message_type_enum_1 = require("../enums/whatsapp-message-type.enum");
var WhatsappMessage = function () {
    var _classDecorators = [(0, typeorm_1.Entity)("whatsapp_messages"), (0, typeorm_1.Unique)("UQ_WHATSAPP_MESSAGE_COMPOSITE", ["whatsappId", "messageId", "userId"])];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _classSuper = base_entity_1.BaseEntity;
    var _user_decorators;
    var _user_initializers = [];
    var _user_extraInitializers = [];
    var _userId_decorators;
    var _userId_initializers = [];
    var _userId_extraInitializers = [];
    var _whatsappId_decorators;
    var _whatsappId_initializers = [];
    var _whatsappId_extraInitializers = [];
    var _messageId_decorators;
    var _messageId_initializers = [];
    var _messageId_extraInitializers = [];
    var _content_decorators;
    var _content_initializers = [];
    var _content_extraInitializers = [];
    var _type_decorators;
    var _type_initializers = [];
    var _type_extraInitializers = [];
    var _me_decorators;
    var _me_initializers = [];
    var _me_extraInitializers = [];
    var _sentAt_decorators;
    var _sentAt_initializers = [];
    var _sentAt_extraInitializers = [];
    var _mediaPath_decorators;
    var _mediaPath_initializers = [];
    var _mediaPath_extraInitializers = [];
    var _mimetype_decorators;
    var _mimetype_initializers = [];
    var _mimetype_extraInitializers = [];
    var WhatsappMessage = _classThis = /** @class */ (function (_super) {
        __extends(WhatsappMessage_1, _super);
        function WhatsappMessage_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.user = __runInitializers(_this, _user_initializers, void 0);
            _this.userId = (__runInitializers(_this, _user_extraInitializers), __runInitializers(_this, _userId_initializers, void 0));
            _this.whatsappId = (__runInitializers(_this, _userId_extraInitializers), __runInitializers(_this, _whatsappId_initializers, void 0));
            _this.messageId = (__runInitializers(_this, _whatsappId_extraInitializers), __runInitializers(_this, _messageId_initializers, void 0));
            _this.content = (__runInitializers(_this, _messageId_extraInitializers), __runInitializers(_this, _content_initializers, void 0));
            _this.type = (__runInitializers(_this, _content_extraInitializers), __runInitializers(_this, _type_initializers, void 0));
            _this.me = (__runInitializers(_this, _type_extraInitializers), __runInitializers(_this, _me_initializers, void 0));
            _this.sentAt = (__runInitializers(_this, _me_extraInitializers), __runInitializers(_this, _sentAt_initializers, void 0));
            _this.mediaPath = (__runInitializers(_this, _sentAt_extraInitializers), __runInitializers(_this, _mediaPath_initializers, void 0));
            _this.mimetype = (__runInitializers(_this, _mediaPath_extraInitializers), __runInitializers(_this, _mimetype_initializers, void 0));
            __runInitializers(_this, _mimetype_extraInitializers);
            return _this;
        }
        return WhatsappMessage_1;
    }(_classSuper));
    __setFunctionName(_classThis, "WhatsappMessage");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _user_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }, {
                nullable: false,
                createForeignKeyConstraints: false,
            })];
        _userId_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255 })];
        _whatsappId_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255 })];
        _messageId_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255 })];
        _content_decorators = [(0, typeorm_1.Column)({ type: "text" })];
        _type_decorators = [(0, typeorm_1.Column)({ type: "enum", enum: whatsapp_message_type_enum_1.WhatsappMessageTypeEnum })];
        _me_decorators = [(0, typeorm_1.Column)({
                type: "boolean",
                default: true,
            })];
        _sentAt_decorators = [(0, typeorm_1.Column)({ type: "datetime" })];
        _mediaPath_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 500, nullable: true })];
        _mimetype_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255, nullable: true })];
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _whatsappId_decorators, { kind: "field", name: "whatsappId", static: false, private: false, access: { has: function (obj) { return "whatsappId" in obj; }, get: function (obj) { return obj.whatsappId; }, set: function (obj, value) { obj.whatsappId = value; } }, metadata: _metadata }, _whatsappId_initializers, _whatsappId_extraInitializers);
        __esDecorate(null, null, _messageId_decorators, { kind: "field", name: "messageId", static: false, private: false, access: { has: function (obj) { return "messageId" in obj; }, get: function (obj) { return obj.messageId; }, set: function (obj, value) { obj.messageId = value; } }, metadata: _metadata }, _messageId_initializers, _messageId_extraInitializers);
        __esDecorate(null, null, _content_decorators, { kind: "field", name: "content", static: false, private: false, access: { has: function (obj) { return "content" in obj; }, get: function (obj) { return obj.content; }, set: function (obj, value) { obj.content = value; } }, metadata: _metadata }, _content_initializers, _content_extraInitializers);
        __esDecorate(null, null, _type_decorators, { kind: "field", name: "type", static: false, private: false, access: { has: function (obj) { return "type" in obj; }, get: function (obj) { return obj.type; }, set: function (obj, value) { obj.type = value; } }, metadata: _metadata }, _type_initializers, _type_extraInitializers);
        __esDecorate(null, null, _me_decorators, { kind: "field", name: "me", static: false, private: false, access: { has: function (obj) { return "me" in obj; }, get: function (obj) { return obj.me; }, set: function (obj, value) { obj.me = value; } }, metadata: _metadata }, _me_initializers, _me_extraInitializers);
        __esDecorate(null, null, _sentAt_decorators, { kind: "field", name: "sentAt", static: false, private: false, access: { has: function (obj) { return "sentAt" in obj; }, get: function (obj) { return obj.sentAt; }, set: function (obj, value) { obj.sentAt = value; } }, metadata: _metadata }, _sentAt_initializers, _sentAt_extraInitializers);
        __esDecorate(null, null, _mediaPath_decorators, { kind: "field", name: "mediaPath", static: false, private: false, access: { has: function (obj) { return "mediaPath" in obj; }, get: function (obj) { return obj.mediaPath; }, set: function (obj, value) { obj.mediaPath = value; } }, metadata: _metadata }, _mediaPath_initializers, _mediaPath_extraInitializers);
        __esDecorate(null, null, _mimetype_decorators, { kind: "field", name: "mimetype", static: false, private: false, access: { has: function (obj) { return "mimetype" in obj; }, get: function (obj) { return obj.mimetype; }, set: function (obj, value) { obj.mimetype = value; } }, metadata: _metadata }, _mimetype_initializers, _mimetype_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        WhatsappMessage = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return WhatsappMessage = _classThis;
}();
exports.WhatsappMessage = WhatsappMessage;
