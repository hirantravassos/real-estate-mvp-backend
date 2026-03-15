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
exports.ColumnName = ColumnName;
var common_1 = require("@nestjs/common");
var typeorm_1 = require("typeorm");
var field_lengths_constant_js_1 = require("../../constants/field-lengths.constant.js");
function ColumnName(options) {
    var _a, _b;
    var length = (_a = options === null || options === void 0 ? void 0 : options.maxLength) !== null && _a !== void 0 ? _a : field_lengths_constant_js_1.NAME_MAX_LENGTH;
    var nullable = (_b = options === null || options === void 0 ? void 0 : options.nullable) !== null && _b !== void 0 ? _b : false;
    return (0, common_1.applyDecorators)((0, typeorm_1.Column)(__assign(__assign({ type: "varchar", length: length, nullable: nullable }, ((options === null || options === void 0 ? void 0 : options.columnName) ? { name: options.columnName } : {})), ((options === null || options === void 0 ? void 0 : options.unique) ? { unique: true } : {}))));
}
