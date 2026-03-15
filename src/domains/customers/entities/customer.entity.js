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
exports.Customer = void 0;
var typeorm_1 = require("typeorm");
var base_entity_1 = require("../../../shared/entities/base.entity");
var column_name_decorator_1 = require("../../../shared/decorators/columns/column-name.decorator");
var column_phone_decorator_1 = require("../../../shared/decorators/columns/column-phone.decorator");
var user_entity_1 = require("../../users/entities/user.entity");
var kanban_entity_1 = require("../../kanbans/entities/kanban.entity");
var customer_comments_entity_1 = require("./customer-comments.entity");
var column_boolean_decorator_1 = require("../../../shared/decorators/columns/column-boolean.decorator");
var Customer = function () {
    var _classDecorators = [(0, typeorm_1.Entity)("customers"), (0, typeorm_1.Unique)(["userId", "phone"])];
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
    var _kanban_decorators;
    var _kanban_initializers = [];
    var _kanban_extraInitializers = [];
    var _comments_decorators;
    var _comments_initializers = [];
    var _comments_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _phone_decorators;
    var _phone_initializers = [];
    var _phone_extraInitializers = [];
    var _ignored_decorators;
    var _ignored_initializers = [];
    var _ignored_extraInitializers = [];
    var _pending_decorators;
    var _pending_initializers = [];
    var _pending_extraInitializers = [];
    var Customer = _classThis = /** @class */ (function (_super) {
        __extends(Customer_1, _super);
        function Customer_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.user = __runInitializers(_this, _user_initializers, void 0);
            _this.userId = (__runInitializers(_this, _user_extraInitializers), __runInitializers(_this, _userId_initializers, void 0));
            _this.kanban = (__runInitializers(_this, _userId_extraInitializers), __runInitializers(_this, _kanban_initializers, void 0));
            _this.comments = (__runInitializers(_this, _kanban_extraInitializers), __runInitializers(_this, _comments_initializers, void 0));
            _this.name = (__runInitializers(_this, _comments_extraInitializers), __runInitializers(_this, _name_initializers, void 0));
            _this.phone = (__runInitializers(_this, _name_extraInitializers), __runInitializers(_this, _phone_initializers, void 0));
            _this.ignored = (__runInitializers(_this, _phone_extraInitializers), __runInitializers(_this, _ignored_initializers, void 0));
            _this.pending = (__runInitializers(_this, _ignored_extraInitializers), __runInitializers(_this, _pending_initializers, void 0));
            __runInitializers(_this, _pending_extraInitializers);
            return _this;
        }
        return Customer_1;
    }(_classSuper));
    __setFunctionName(_classThis, "Customer");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _user_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }, function (user) { return user.customers; }, {
                nullable: false,
            })];
        _userId_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255 })];
        _kanban_decorators = [(0, typeorm_1.ManyToOne)(function () { return kanban_entity_1.Kanban; }, function (kanban) { return kanban.customers; }, {
                nullable: true,
            })];
        _comments_decorators = [(0, typeorm_1.OneToMany)(function () { return customer_comments_entity_1.CustomerComment; }, function (customerComments) { return customerComments.customer; })];
        _name_decorators = [(0, column_name_decorator_1.ColumnName)({ nullable: true })];
        _phone_decorators = [(0, column_phone_decorator_1.ColumnPhone)()];
        _ignored_decorators = [(0, column_boolean_decorator_1.ColumnBoolean)({ default: false })];
        _pending_decorators = [(0, column_boolean_decorator_1.ColumnBoolean)({ default: true })];
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _kanban_decorators, { kind: "field", name: "kanban", static: false, private: false, access: { has: function (obj) { return "kanban" in obj; }, get: function (obj) { return obj.kanban; }, set: function (obj, value) { obj.kanban = value; } }, metadata: _metadata }, _kanban_initializers, _kanban_extraInitializers);
        __esDecorate(null, null, _comments_decorators, { kind: "field", name: "comments", static: false, private: false, access: { has: function (obj) { return "comments" in obj; }, get: function (obj) { return obj.comments; }, set: function (obj, value) { obj.comments = value; } }, metadata: _metadata }, _comments_initializers, _comments_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _phone_decorators, { kind: "field", name: "phone", static: false, private: false, access: { has: function (obj) { return "phone" in obj; }, get: function (obj) { return obj.phone; }, set: function (obj, value) { obj.phone = value; } }, metadata: _metadata }, _phone_initializers, _phone_extraInitializers);
        __esDecorate(null, null, _ignored_decorators, { kind: "field", name: "ignored", static: false, private: false, access: { has: function (obj) { return "ignored" in obj; }, get: function (obj) { return obj.ignored; }, set: function (obj, value) { obj.ignored = value; } }, metadata: _metadata }, _ignored_initializers, _ignored_extraInitializers);
        __esDecorate(null, null, _pending_decorators, { kind: "field", name: "pending", static: false, private: false, access: { has: function (obj) { return "pending" in obj; }, get: function (obj) { return obj.pending; }, set: function (obj, value) { obj.pending = value; } }, metadata: _metadata }, _pending_initializers, _pending_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Customer = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Customer = _classThis;
}();
exports.Customer = Customer;
