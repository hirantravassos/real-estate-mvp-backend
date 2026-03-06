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
exports.Kanban = void 0;
var typeorm_1 = require("typeorm");
var base_entity_1 = require("../../../shared/entities/base.entity");
var column_name_decorator_1 = require("../../../shared/decorators/columns/column-name.decorator");
var user_entity_1 = require("../../users/entities/user.entity");
var customer_entity_1 = require("../../customers/entities/customer.entity");
var column_long_text_decorator_1 = require("../../../shared/decorators/columns/column-long-text.decorator");
var Kanban = function () {
    var _classDecorators = [(0, typeorm_1.Entity)("kanbans")];
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
    var _customers_decorators;
    var _customers_initializers = [];
    var _customers_extraInitializers = [];
    var _name_decorators;
    var _name_initializers = [];
    var _name_extraInitializers = [];
    var _description_decorators;
    var _description_initializers = [];
    var _description_extraInitializers = [];
    var Kanban = _classThis = /** @class */ (function (_super) {
        __extends(Kanban_1, _super);
        function Kanban_1() {
            var _this = _super !== null && _super.apply(this, arguments) || this;
            _this.user = __runInitializers(_this, _user_initializers, void 0);
            _this.userId = (__runInitializers(_this, _user_extraInitializers), __runInitializers(_this, _userId_initializers, void 0));
            _this.customers = (__runInitializers(_this, _userId_extraInitializers), __runInitializers(_this, _customers_initializers, void 0));
            _this.name = (__runInitializers(_this, _customers_extraInitializers), __runInitializers(_this, _name_initializers, void 0));
            _this.description = (__runInitializers(_this, _name_extraInitializers), __runInitializers(_this, _description_initializers, void 0));
            __runInitializers(_this, _description_extraInitializers);
            return _this;
        }
        return Kanban_1;
    }(_classSuper));
    __setFunctionName(_classThis, "Kanban");
    (function () {
        var _a;
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create((_a = _classSuper[Symbol.metadata]) !== null && _a !== void 0 ? _a : null) : void 0;
        _user_decorators = [(0, typeorm_1.ManyToOne)(function () { return user_entity_1.User; }, {
                nullable: false,
            })];
        _userId_decorators = [(0, typeorm_1.Column)({ type: "varchar", length: 255 })];
        _customers_decorators = [(0, typeorm_1.OneToMany)(function () { return customer_entity_1.Customer; }, function (customer) { return customer.kanban; })];
        _name_decorators = [(0, column_name_decorator_1.ColumnName)()];
        _description_decorators = [(0, column_long_text_decorator_1.ColumnLongText)({ nullable: true })];
        __esDecorate(null, null, _user_decorators, { kind: "field", name: "user", static: false, private: false, access: { has: function (obj) { return "user" in obj; }, get: function (obj) { return obj.user; }, set: function (obj, value) { obj.user = value; } }, metadata: _metadata }, _user_initializers, _user_extraInitializers);
        __esDecorate(null, null, _userId_decorators, { kind: "field", name: "userId", static: false, private: false, access: { has: function (obj) { return "userId" in obj; }, get: function (obj) { return obj.userId; }, set: function (obj, value) { obj.userId = value; } }, metadata: _metadata }, _userId_initializers, _userId_extraInitializers);
        __esDecorate(null, null, _customers_decorators, { kind: "field", name: "customers", static: false, private: false, access: { has: function (obj) { return "customers" in obj; }, get: function (obj) { return obj.customers; }, set: function (obj, value) { obj.customers = value; } }, metadata: _metadata }, _customers_initializers, _customers_extraInitializers);
        __esDecorate(null, null, _name_decorators, { kind: "field", name: "name", static: false, private: false, access: { has: function (obj) { return "name" in obj; }, get: function (obj) { return obj.name; }, set: function (obj, value) { obj.name = value; } }, metadata: _metadata }, _name_initializers, _name_extraInitializers);
        __esDecorate(null, null, _description_decorators, { kind: "field", name: "description", static: false, private: false, access: { has: function (obj) { return "description" in obj; }, get: function (obj) { return obj.description; }, set: function (obj, value) { obj.description = value; } }, metadata: _metadata }, _description_initializers, _description_extraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        Kanban = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return Kanban = _classThis;
}();
exports.Kanban = Kanban;
