"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColumnBoolean = ColumnBoolean;
var common_1 = require("@nestjs/common");
var typeorm_1 = require("typeorm");
function ColumnBoolean(options) {
    var _a, _b;
    var isNullable = (_a = options === null || options === void 0 ? void 0 : options.nullable) !== null && _a !== void 0 ? _a : false;
    var defaultValue = (_b = options === null || options === void 0 ? void 0 : options.default) !== null && _b !== void 0 ? _b : false;
    return (0, common_1.applyDecorators)((0, typeorm_1.Column)(__assign({ type: "boolean", nullable: isNullable, default: defaultValue }, ((options === null || options === void 0 ? void 0 : options.columnName) ? { name: options.columnName } : {}))));
}
