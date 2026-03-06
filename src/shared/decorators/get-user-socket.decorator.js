"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetUserSocket = void 0;
var common_1 = require("@nestjs/common");
exports.GetUserSocket = (0, common_1.createParamDecorator)(function (data, context) {
    var client = context.switchToWs().getClient();
    var user = client.user;
    return data ? user === null || user === void 0 ? void 0 : user[data] : user;
});
