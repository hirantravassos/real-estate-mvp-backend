"use strict";
// @ts-nocheck
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
Object.defineProperty(exports, "__esModule", { value: true });
var baileys_1 = require("@whiskeysockets/baileys");
var initialBootstrap = {
    chats: [
        {
            participant: [],
            id: "253716653465766@lid",
            unreadCount: 8,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772758078,
                high: 0,
                unsigned: true,
            },
            notSpam: false,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    127, 77, 72, 57, 144, 181, 201, 72, 75, 206, 117, 145, 49, 66, 241,
                    239, 78, 128, 244, 78, 29, 14, 164, 29, 181, 164, 24, 42, 91, 49, 114,
                    34,
                ],
            },
            pnJid: "5513920001834@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "253716653465766@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "253716653465766@lid",
                            fromMe: false,
                            id: "AC2880BC15F433BA68BFB2247A1DE7F5",
                        },
                        message: {
                            conversation: "Br",
                            messageContextInfo: {
                                messageSecret: "mIYUJgalCXof0VnxqTud3JpfCMORIMtrkv09bMoxQVU=",
                            },
                        },
                        messageTimestamp: "1772758078",
                        messageSecret: "mIYUJgalCXof0VnxqTud3JpfCMORIMtrkv09bMoxQVU=",
                        reportingTokenInfo: {
                            reportingTag: "ARDXsUIQbyL77vHlwMolgBq+uRc=",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772758078,
        },
        {
            participant: [],
            id: "31886541906116@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772671054,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 35, 141, 110, 46, 72, 37, 83, 91, 87],
            },
            tcTokenTimestamp: {
                low: 1772576027,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    115, 193, 144, 157, 77, 175, 224, 193, 105, 225, 122, 234, 49, 201, 1,
                    21, 102, 59, 3, 216, 113, 240, 83, 166, 126, 228, 96, 10, 14, 237,
                    214, 51,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1772671031,
                high: 0,
                unsigned: true,
            },
            pnJid: "5513981787979@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "31886541906116@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "31886541906116@lid",
                            fromMe: true,
                            id: "A51B71A1A02F91B6A7B9CDB4A23CE804",
                        },
                        message: {
                            conversation: "Be",
                            messageContextInfo: {
                                messageSecret: "xIrkU7fIpoWR2k7nZkSRm96RSx2AjppLN88s3bIBGPI=",
                            },
                        },
                        messageTimestamp: "1772671054",
                        status: "DELIVERY_ACK",
                        userReceipt: [
                            {
                                userJid: "31886541906116@lid",
                                receiptTimestamp: "1772671054",
                                readTimestamp: "0",
                                playedTimestamp: "0",
                            },
                        ],
                        messageSecret: "xIrkU7fIpoWR2k7nZkSRm96RSx2AjppLN88s3bIBGPI=",
                        originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "554799890690@s.whatsapp.net",
            unreadCount: 1,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772576593,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 35, 117, 182, 145, 214, 50, 231, 187, 67],
            },
            tcTokenTimestamp: {
                low: 1772576593,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    101, 179, 226, 81, 221, 201, 145, 34, 250, 178, 4, 235, 71, 132, 95,
                    251, 8, 25, 121, 57, 133, 189, 164, 184, 45, 216, 85, 180, 243, 227,
                    218, 93,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1767891817,
                high: 0,
                unsigned: true,
            },
            pnJid: "554799890690@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "164145160822935@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "554799890690@s.whatsapp.net",
                            fromMe: false,
                            id: "AC3DD805F39F53E7A94BE07FEBF3139C",
                        },
                        message: {
                            conversation: "oi",
                            messageContextInfo: {
                                messageSecret: "6LOVdcGndcRVSrZuXayPS/+APEuLPkCGHk40UZUaY3o=",
                            },
                        },
                        messageTimestamp: "1772576593",
                        messageSecret: "6LOVdcGndcRVSrZuXayPS/+APEuLPkCGHk40UZUaY3o=",
                        reportingTokenInfo: {
                            reportingTag: "ARDmbwk3zePWUNzrPB7/5AvVSCk=",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772576593,
        },
        {
            participant: [],
            id: "5513997430960@s.whatsapp.net",
            unreadCount: 1,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772576472,
                high: 0,
                unsigned: true,
            },
            notSpam: false,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 35, 196, 123, 124, 237, 43, 132, 84, 155],
            },
            tcTokenTimestamp: {
                low: 1772576472,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    26, 147, 142, 37, 77, 241, 151, 172, 76, 87, 131, 75, 110, 109, 224,
                    226, 181, 228, 147, 42, 53, 210, 176, 61, 165, 237, 115, 16, 133, 83,
                    213, 118,
                ],
            },
            pnJid: "5513997430960@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "102224634060936@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "5513997430960@s.whatsapp.net",
                            fromMe: false,
                            id: "AC2A0829C658FF37C5A094A41E736331",
                        },
                        message: {
                            conversation: "Oi",
                            messageContextInfo: {
                                messageSecret: "WDmdFU6OZck7IpTl9AmmKeIQL1rqjHoZMdwsN1CjU9g=",
                            },
                        },
                        messageTimestamp: "1772576472",
                        messageSecret: "WDmdFU6OZck7IpTl9AmmKeIQL1rqjHoZMdwsN1CjU9g=",
                        reportingTokenInfo: {
                            reportingTag: "ARARHDZQaRINAzVLYwffFUNITlQ=",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772576472,
        },
        {
            participant: [],
            id: "10046582825112@lid",
            unreadCount: 2,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772576466,
                high: 0,
                unsigned: true,
            },
            notSpam: false,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 35, 126, 15, 228, 156, 103, 32, 220, 234],
            },
            tcTokenTimestamp: {
                low: 1772576466,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    59, 6, 117, 111, 104, 186, 104, 85, 92, 237, 166, 85, 24, 137, 21, 32,
                    230, 95, 231, 12, 33, 127, 75, 106, 0, 204, 162, 107, 133, 176, 74,
                    77,
                ],
            },
            pnJid: "5513991689344@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "10046582825112@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "10046582825112@lid",
                            fromMe: false,
                            id: "A5EC857B100BD0198D2F856B4F84D23E",
                        },
                        message: {
                            conversation: "Fábio aqui",
                            messageContextInfo: {
                                messageSecret: "AGj64LYWwXJPGmmArubZz8HAZAKct2BusWF2OgOX6oc=",
                            },
                        },
                        messageTimestamp: "1772576466",
                        messageSecret: "AGj64LYWwXJPGmmArubZz8HAZAKct2BusWF2OgOX6oc=",
                        reportingTokenInfo: {
                            reportingTag: "ARA9z2nb6/apsngHfzyM8zeF81c=",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772576466,
        },
        {
            participant: [],
            id: "276424162332892@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772575082,
                high: 0,
                unsigned: true,
            },
            notSpam: false,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 35, 197, 46, 83, 113, 202, 231, 165, 156],
            },
            tcTokenTimestamp: {
                low: 1772575082,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    97, 116, 48, 52, 183, 81, 185, 151, 135, 247, 50, 92, 231, 13, 76,
                    101, 109, 44, 142, 75, 54, 231, 178, 247, 30, 27, 49, 20, 145, 83,
                    107, 104,
                ],
            },
            pnJid: "5511940172526@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "276424162332892@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "276424162332892@lid",
                            fromMe: false,
                            id: "A5418AAB422AEA74069FFD349574B19F",
                        },
                        message: {
                            audioMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7117-24/591280825_890225510664793_3864625533524999945_n.enc?ccb=11-4&oh=01_Q5Aa3wFCrzZ1aLwUwvp8_lui4XWZBXEsmXlGyAyD8ZOOo3PKRQ&oe=69CEB626&_nc_sid=5e03e0&mms3=true",
                                mimetype: "audio/ogg; codecs=opus",
                                fileSha256: "ffuYJ9DnyvcePFleYCbVqWA4oth9htIA+ykUgsYLbo4=",
                                fileLength: "10889",
                                seconds: 5,
                                ptt: true,
                                mediaKey: "YvA5FwaE9U521VgWTCA+0MG2kg3s9QcYLCwTfDoCRms=",
                                fileEncSha256: "D+JfcctpwQiJHpopYHxkLkU4pnLGdpOdSKSTWqNvydk=",
                                directPath: "/v/t62.7117-24/591280825_890225510664793_3864625533524999945_n.enc?ccb=11-4&oh=01_Q5Aa3wFCrzZ1aLwUwvp8_lui4XWZBXEsmXlGyAyD8ZOOo3PKRQ&oe=69CEB626&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1772575079",
                                contextInfo: {},
                                waveform: "AAMAAAAAAAAAAAAAAAAAAAAAIEtfWEZFOkNQQDxKRy8AAAAAAAAcJEVRQy4GAAAAAAAAGCQRRUw5CyA5DkNMRw==",
                            },
                            messageContextInfo: {
                                messageSecret: "7/4H9M99WqSws6hSKY8S61/zgzyv0AOJkXmpNRcc93E=",
                            },
                        },
                        messageTimestamp: "1772575082",
                        status: "PLAYED",
                        mediaData: {
                            localPath: "Media/WhatsApp Business Voice Notes/202610/PTT-20260303-WA0001.opus",
                        },
                        messageSecret: "7/4H9M99WqSws6hSKY8S61/zgzyv0AOJkXmpNRcc93E=",
                        reportingTokenInfo: {
                            reportingTag: "ARBGnyayTneFQHJub1hmOewvb8c=",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772575082,
        },
        {
            participant: [],
            id: "0@s.whatsapp.net",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1772311211,
                high: 0,
                unsigned: true,
            },
            name: "WhatsApp Business",
            notSpam: false,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            commentsCount: 1000000,
            locked: false,
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "0@s.whatsapp.net",
                            fromMe: false,
                            id: "26788010434135272-1",
                        },
                        message: {
                            templateMessage: {
                                hydratedFourRowTemplate: {
                                    videoMessage: {
                                        mimetype: "video/mp4",
                                        fileSha256: "ABDsYPsVNKsFdNnHJxlGQD4sEbmM+F0eMAMWZma6D54=",
                                        fileLength: "10543810",
                                        seconds: 17,
                                        mediaKey: "X4ISMXjp2xx1ijEt3mAjtmj/EFiEuAOEC6GANmNzFm4=",
                                        caption: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                                        fileEncSha256: "w4mSjdPV2bjMixk93ZIGzLEymjieJ6aMihfB0rPpjRE=",
                                        contextInfo: {
                                            pairedMediaType: "NOT_PAIRED_MEDIA",
                                        },
                                        staticUrl: "https://static.whatsapp.net/downloadable?category=PSA&id=988932680392422835&num=2ce72344-7b78-4497-bb4e-571042d06b58&_nc_cat=1",
                                    },
                                    hydratedContentText: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                                    hydratedButtons: [
                                        {
                                            urlButton: {
                                                displayText: "Get started",
                                                url: "whatsapp-smb://biztab/quick-replies",
                                            },
                                            index: 0,
                                        },
                                    ],
                                },
                                contextInfo: {},
                                hydratedTemplate: {
                                    videoMessage: {
                                        mimetype: "video/mp4",
                                        fileSha256: "ABDsYPsVNKsFdNnHJxlGQD4sEbmM+F0eMAMWZma6D54=",
                                        fileLength: "10543810",
                                        seconds: 17,
                                        mediaKey: "X4ISMXjp2xx1ijEt3mAjtmj/EFiEuAOEC6GANmNzFm4=",
                                        caption: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                                        fileEncSha256: "w4mSjdPV2bjMixk93ZIGzLEymjieJ6aMihfB0rPpjRE=",
                                        contextInfo: {
                                            pairedMediaType: "NOT_PAIRED_MEDIA",
                                        },
                                        staticUrl: "https://static.whatsapp.net/downloadable?category=PSA&id=988932680392422835&num=2ce72344-7b78-4497-bb4e-571042d06b58&_nc_cat=1",
                                    },
                                    hydratedContentText: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                                    hydratedButtons: [
                                        {
                                            urlButton: {
                                                displayText: "Get started",
                                                url: "whatsapp-smb://biztab/quick-replies",
                                            },
                                            index: 0,
                                        },
                                    ],
                                },
                            },
                            messageContextInfo: {
                                messageSecret: "QNJqun3mxvIlDMJfsBkZsd0MGeq6lZW1X9+FWWiOhps=",
                            },
                        },
                        messageTimestamp: "1772311211",
                        messageSecret: "QNJqun3mxvIlDMJfsBkZsd0MGeq6lZW1X9+FWWiOhps=",
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772311211,
        },
        {
            participant: [],
            id: "235987800207434@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1770837474,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    216, 212, 113, 91, 130, 184, 118, 164, 225, 90, 190, 87, 204, 183,
                    211, 65, 2, 49, 80, 175, 18, 21, 83, 11, 4, 122, 240, 70, 68, 69, 248,
                    36,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1770837475,
                high: 0,
                unsigned: true,
            },
            pnJid: "5511952998629@s.whatsapp.net",
            shareOwnPn: true,
            commentsCount: 1000000,
            locked: false,
            accountLid: "235987800207434@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "235987800207434@lid",
                            fromMe: true,
                            id: "A5F0920FB6E06EEC19EEA1D9C521FDEF",
                        },
                        message: {
                            conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                            messageContextInfo: {
                                messageSecret: "zbCCvUZ5IDTkB1GLmptj7DI1kgf3E9VNe9W9IqEVb94=",
                            },
                        },
                        messageTimestamp: "1770837474",
                        status: "SERVER_ACK",
                        messageC2STimestamp: "1770837475",
                        messageSecret: "zbCCvUZ5IDTkB1GLmptj7DI1kgf3E9VNe9W9IqEVb94=",
                        originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "135962071957533@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1770418873,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 33, 201, 36, 160, 248, 136, 70, 92, 237],
            },
            tcTokenTimestamp: {
                low: 1770414887,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    211, 11, 95, 9, 230, 8, 197, 86, 91, 125, 245, 196, 145, 83, 6, 227,
                    167, 89, 10, 176, 168, 7, 2, 220, 208, 62, 116, 213, 80, 134, 179, 2,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1770414891,
                high: 0,
                unsigned: true,
            },
            pnJid: "556132073332@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "135962071957533@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "135962071957533@lid",
                            fromMe: false,
                            id: "9E60F1184D7B98D01D",
                        },
                        message: {
                            conversation: "Para mais informações, visite o portal do Governo Federal em gov.br.",
                        },
                        messageTimestamp: "1770418873",
                        reportingTokenInfo: {
                            reportingTag: "AQ+svIAwpBY4wINPmMP3rA==",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1770418873,
        },
        {
            participant: [],
            id: "130361568825482@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1770144902,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    15, 55, 54, 192, 51, 198, 192, 153, 177, 154, 184, 93, 178, 201, 243,
                    184, 219, 246, 98, 220, 220, 11, 71, 116, 105, 228, 37, 51, 1, 48,
                    195, 60,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1770144902,
                high: 0,
                unsigned: true,
            },
            pnJid: "5521959572925@s.whatsapp.net",
            shareOwnPn: true,
            commentsCount: 1000000,
            locked: false,
            accountLid: "130361568825482@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "130361568825482@lid",
                            fromMe: true,
                            id: "A52BACCBD74A1ECE58D326BDBE75FE5B",
                        },
                        message: {
                            conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                            messageContextInfo: {
                                messageSecret: "++3YRbNzafFleS03HgL+F9V9YaqAkc0rvVMBa0RLAkE=",
                            },
                        },
                        messageTimestamp: "1770144902",
                        status: "SERVER_ACK",
                        messageSecret: "++3YRbNzafFleS03HgL+F9V9YaqAkc0rvVMBa0RLAkE=",
                        originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "19624443789541@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1769796912,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    20, 155, 114, 127, 86, 244, 216, 200, 54, 136, 32, 220, 214, 42, 165,
                    83, 30, 102, 3, 83, 207, 34, 47, 31, 137, 207, 82, 14, 114, 44, 33,
                    96,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1769796912,
                high: 0,
                unsigned: true,
            },
            pnJid: "5596920018547@s.whatsapp.net",
            shareOwnPn: true,
            commentsCount: 1000000,
            locked: false,
            accountLid: "19624443789541@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "19624443789541@lid",
                            fromMe: true,
                            id: "A51624DF9B96D572A114759D5124F530",
                        },
                        message: {
                            conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                            messageContextInfo: {
                                messageSecret: "2SYJ/UyLAbydHEnnq2wU67JkUSl+r7t8aafeWM1PXSg=",
                            },
                        },
                        messageTimestamp: "1769796912",
                        status: "SERVER_ACK",
                        messageSecret: "2SYJ/UyLAbydHEnnq2wU67JkUSl+r7t8aafeWM1PXSg=",
                        originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "52502267465973@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1768840205,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 31, 74, 79, 143, 93, 11, 200, 89, 186],
            },
            tcTokenTimestamp: {
                low: 1768840202,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    157, 172, 128, 4, 124, 167, 90, 100, 94, 100, 162, 158, 151, 243, 99,
                    112, 154, 190, 28, 192, 12, 147, 121, 3, 121, 91, 147, 225, 65, 127,
                    207, 29,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1768840205,
                high: 0,
                unsigned: true,
            },
            pnJid: "5511939416210@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "52502267465973@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "52502267465973@lid",
                            fromMe: true,
                            id: "A5929469637041B33D46C8BC7E65714C",
                        },
                        message: {
                            conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                            messageContextInfo: {
                                messageSecret: "8W/1BBXu2P8Q1HHb+sBNojHRJXUVGrhIjCoOx8ddUtA=",
                            },
                        },
                        messageTimestamp: "1768840205",
                        status: "READ",
                        userReceipt: [
                            {
                                userJid: "52502267465973@lid",
                                receiptTimestamp: "0",
                                readTimestamp: "1768840205",
                                playedTimestamp: "0",
                            },
                        ],
                        messageSecret: "8W/1BBXu2P8Q1HHb+sBNojHRJXUVGrhIjCoOx8ddUtA=",
                        originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "264767604322319@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1768323437,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 30, 222, 156, 8, 143, 188, 133, 179, 225],
            },
            tcTokenTimestamp: {
                low: 1768323345,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    188, 67, 159, 208, 250, 45, 184, 142, 240, 142, 19, 196, 82, 222, 153,
                    161, 65, 198, 198, 61, 198, 195, 79, 5, 241, 230, 213, 47, 171, 127,
                    212, 114,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1768323347,
                high: 0,
                unsigned: true,
            },
            pnJid: "5511983926782@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "264767604322319@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "264767604322319@lid",
                            fromMe: false,
                            id: "A5A12CB8BAE7553D40CAE83E04D57F69",
                        },
                        message: {
                            conversation: "Eu não coloquei uma pedra nesse valor não mano tô vindo até você aí pra ver como vamo resolver isso e da um cheque mate nisso aí no resumo",
                            messageContextInfo: {
                                messageSecret: "CSrX9EPTp8r7qrAWdFMjZagTbBrkqxhyaO3T7O6p54A=",
                            },
                        },
                        messageTimestamp: "1768323437",
                        messageSecret: "CSrX9EPTp8r7qrAWdFMjZagTbBrkqxhyaO3T7O6p54A=",
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1768323437,
        },
        {
            participant: [],
            id: "188180284313837@lid",
            unreadCount: 0,
            readOnly: false,
            ephemeralExpiration: 0,
            ephemeralSettingTimestamp: {
                low: 0,
                high: 0,
                unsigned: false,
            },
            conversationTimestamp: {
                low: 1767925345,
                high: 0,
                unsigned: true,
            },
            notSpam: true,
            archived: false,
            disappearingMode: {
                initiator: "CHANGED_IN_CHAT",
            },
            unreadMentionCount: 0,
            markedAsUnread: false,
            tcToken: {
                type: "Buffer",
                data: [4, 1, 30, 0, 36, 90, 165, 202, 174, 172, 24],
            },
            tcTokenTimestamp: {
                low: 1767925175,
                high: 0,
                unsigned: true,
            },
            contactPrimaryIdentityKey: {
                type: "Buffer",
                data: [
                    252, 236, 90, 226, 4, 223, 3, 105, 66, 249, 139, 37, 84, 15, 163, 251,
                    47, 218, 61, 0, 183, 199, 18, 103, 152, 245, 224, 29, 6, 216, 242,
                    120,
                ],
            },
            tcTokenSenderTimestamp: {
                low: 1767925175,
                high: 0,
                unsigned: true,
            },
            pnJid: "5511972202550@s.whatsapp.net",
            shareOwnPn: true,
            lidOriginType: "general",
            commentsCount: 1000000,
            locked: false,
            accountLid: "188180284313837@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "188180284313837@lid",
                            fromMe: false,
                            id: "08D7EED404EB1C4CDE",
                        },
                        message: {
                            placeholderMessage: {
                                type: "MASK_LINKED_DEVICES",
                            },
                        },
                        messageTimestamp: "1767925345",
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1767925345,
        },
    ],
    messages: [
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC2880BC15F433BA68BFB2247A1DE7F5",
            },
            message: {
                conversation: "Br",
                messageContextInfo: {
                    messageSecret: "mIYUJgalCXof0VnxqTud3JpfCMORIMtrkv09bMoxQVU=",
                },
            },
            messageTimestamp: "1772758078",
            messageSecret: "mIYUJgalCXof0VnxqTud3JpfCMORIMtrkv09bMoxQVU=",
            reportingTokenInfo: {
                reportingTag: "ARDXsUIQbyL77vHlwMolgBq+uRc=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC2F3389D7EE57A6A7F94DCDA4EE256A",
            },
            message: {
                conversation: "Dm",
                messageContextInfo: {
                    messageSecret: "ZwldWMB/ZeuvZ2npPGVBJT7qhndC7s7ovB1U3Ms1Vj4=",
                },
            },
            messageTimestamp: "1772757952",
            messageSecret: "ZwldWMB/ZeuvZ2npPGVBJT7qhndC7s7ovB1U3Ms1Vj4=",
            reportingTokenInfo: {
                reportingTag: "ARBvcpm62rdJWeo429nArkhXzJA=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACCF31E87ED2C362CB1BDF556C01060D",
            },
            message: {
                conversation: "U",
                messageContextInfo: {
                    messageSecret: "09iW/PzPCRPmzJKMLy9dmV8ZUERcFPBQYg2u1nAK8z4=",
                },
            },
            messageTimestamp: "1772757950",
            messageSecret: "09iW/PzPCRPmzJKMLy9dmV8ZUERcFPBQYg2u1nAK8z4=",
            reportingTokenInfo: {
                reportingTag: "ARDsXJIf6LPIEw7BQDuCKTlcexc=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACC865F1732EA40DCEEEAA0AE1F6B918",
            },
            message: {
                conversation: "Br",
                messageContextInfo: {
                    messageSecret: "UbooM2tWVL4fhMdgghQFHJlM8E7bi7SkeTNhRwqyNXM=",
                },
            },
            messageTimestamp: "1772748106",
            messageSecret: "UbooM2tWVL4fhMdgghQFHJlM8E7bi7SkeTNhRwqyNXM=",
            reportingTokenInfo: {
                reportingTag: "ARBTpSZB01MsOWkNG8iQDoZf9ts=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACFCA07165CE4EDF9E2711C0C5DF68E8",
            },
            message: {
                conversation: "Cê",
                messageContextInfo: {
                    messageSecret: "R/RP2KFLhIBF4NTIl7yrwy6zaAiIErX4Ms7t3goe1lk=",
                },
            },
            messageTimestamp: "1772748070",
            messageSecret: "R/RP2KFLhIBF4NTIl7yrwy6zaAiIErX4Ms7t3goe1lk=",
            reportingTokenInfo: {
                reportingTag: "ARDNOZkWzZIq8Nd/v6NOuTplw2k=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC74151102594808256429D6747C82CD",
            },
            message: {
                conversation: "My",
                messageContextInfo: {
                    messageSecret: "Syhr/wfJcWSDjlE37+zGUXaKVzNdwGobUKSDMDn8T9c=",
                },
            },
            messageTimestamp: "1772748068",
            messageSecret: "Syhr/wfJcWSDjlE37+zGUXaKVzNdwGobUKSDMDn8T9c=",
            reportingTokenInfo: {
                reportingTag: "ARCetiiyUTIFLoREtP7n2XS6BUU=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACA1501B73FD7625A7603F5CC8CFC180",
            },
            message: {
                conversation: "Ou",
                messageContextInfo: {
                    messageSecret: "I6oWHE6KeseFn+vjYoHpcjsy4oRS4nt8UOSnBhsoZQk=",
                },
            },
            messageTimestamp: "1772748060",
            messageSecret: "I6oWHE6KeseFn+vjYoHpcjsy4oRS4nt8UOSnBhsoZQk=",
            reportingTokenInfo: {
                reportingTag: "ARD7vdRFljGNbhNe/jvxamvqb1s=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC6685823AE0E5915713C5F9EB6FA43B",
            },
            message: {
                conversation: "NY",
                messageContextInfo: {
                    messageSecret: "a/A4SW8tyVR27AA+oGrqDL6CfG/tBa2j2MUBRLFDUDY=",
                },
            },
            messageTimestamp: "1772746571",
            messageSecret: "a/A4SW8tyVR27AA+oGrqDL6CfG/tBa2j2MUBRLFDUDY=",
            reportingTokenInfo: {
                reportingTag: "ARC8ehN3GHytHTkKxImLiD7AT4c=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACEDBA65598A53873EA7679C55E32C83",
            },
            message: {
                conversation: "He",
                messageContextInfo: {
                    messageSecret: "lCnO7GFFR/I3XCjyCgyrRoVRZ6b/ncsJKFT9i6FxWHU=",
                },
            },
            messageTimestamp: "1772746563",
            messageSecret: "lCnO7GFFR/I3XCjyCgyrRoVRZ6b/ncsJKFT9i6FxWHU=",
            reportingTokenInfo: {
                reportingTag: "ARAmdGX4dIaAuC97I+aii6WxGXc=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC62EE637EFB01A6421D031B4E682681",
            },
            message: {
                conversation: "Br",
                messageContextInfo: {
                    messageSecret: "I74OtMpLFvqgzO3RAmLWibtWZEfi2Hwd6JLpNhFxo0I=",
                },
            },
            messageTimestamp: "1772746553",
            messageSecret: "I74OtMpLFvqgzO3RAmLWibtWZEfi2Hwd6JLpNhFxo0I=",
            reportingTokenInfo: {
                reportingTag: "ARD04lUbmHlpxWbUIdFHQ/pWk1c=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACD129B127498ECF48CE3B654DFA2CE9",
            },
            message: {
                conversation: "It",
                messageContextInfo: {
                    messageSecret: "MuDZnOaDSS6UftlXSUm/rOWsd5hx3TjqHLvXUGB9xZc=",
                },
            },
            messageTimestamp: "1772746543",
            messageSecret: "MuDZnOaDSS6UftlXSUm/rOWsd5hx3TjqHLvXUGB9xZc=",
            reportingTokenInfo: {
                reportingTag: "ARA4GKpx4jCYDdMzry4k9vP0Dr0=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC009C14B5194E107454F129B0FBADBB",
            },
            message: {
                conversation: "Oi",
                messageContextInfo: {
                    messageSecret: "jkBJRKnEAJoQ5SXi1WBR+10KBw3pALF7j2qxvpGdG+E=",
                },
            },
            messageTimestamp: "1772746507",
            messageSecret: "jkBJRKnEAJoQ5SXi1WBR+10KBw3pALF7j2qxvpGdG+E=",
            reportingTokenInfo: {
                reportingTag: "ARBt+1vP92mSPUVpCcAiPTcgXjU=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC09B4585174C6C7FBC6CA1673816727",
            },
            message: {
                conversation: "Fui",
                messageContextInfo: {
                    messageSecret: "l5yFOV1TVF6Zj3R9eDiN1OsxbJmPae4YGYS7/TJRhOM=",
                },
            },
            messageTimestamp: "1772746478",
            messageSecret: "l5yFOV1TVF6Zj3R9eDiN1OsxbJmPae4YGYS7/TJRhOM=",
            reportingTokenInfo: {
                reportingTag: "ARA8uWyYzIlBatDn85tPlvxkPoQ=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACB83B489F2D100AD2FF917630CC1D5C",
            },
            message: {
                conversation: "Go",
                messageContextInfo: {
                    messageSecret: "i8yJRoTapPsIsM+qdoC6H4jh0TVdD4HqzSH/R2CXhvg=",
                },
            },
            messageTimestamp: "1772746470",
            messageSecret: "i8yJRoTapPsIsM+qdoC6H4jh0TVdD4HqzSH/R2CXhvg=",
            reportingTokenInfo: {
                reportingTag: "ARACVpEgOvvL7xEQ6m0dL+TJ+1Q=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACE98D976C67BBF778C82376C19C31EA",
            },
            message: {
                conversation: "Go",
                messageContextInfo: {
                    messageSecret: "O/O7LFx9Nco4874FxkkW+z0pW5eO/p9G+aOBXz7fV3U=",
                },
            },
            messageTimestamp: "1772746448",
            messageSecret: "O/O7LFx9Nco4874FxkkW+z0pW5eO/p9G+aOBXz7fV3U=",
            reportingTokenInfo: {
                reportingTag: "ARCsUpImTDZqlnIEqA+YgFdMdjc=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACCEA253A051E409163494061EB156D6",
            },
            message: {
                conversation: "Oi",
                messageContextInfo: {
                    messageSecret: "jdIpVA8/7Aj/qGpVGz9K4PccJ5aKVby5YkvLsgs0ISU=",
                },
            },
            messageTimestamp: "1772746002",
            messageSecret: "jdIpVA8/7Aj/qGpVGz9K4PccJ5aKVby5YkvLsgs0ISU=",
            reportingTokenInfo: {
                reportingTag: "ARDlMgKcS3iXopzECitRKfXEhco=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC6070C1D52C7CE56BDA6D67C9010301",
            },
            message: {
                protocolMessage: {
                    key: {
                        remoteJid: "253716653465766@lid",
                        fromMe: false,
                        id: "AC0D0A5E82AA5004C722F6A7A5D8A0EF",
                    },
                    type: "MESSAGE_EDIT",
                    editedMessage: {
                        conversation: "Oi vê",
                    },
                    timestampMs: "1772745927839",
                },
                messageContextInfo: {
                    messageSecret: "T5o+xkKXwgNcL1e8NpCrH8h8FDagnnL0TgyX0g568NI=",
                },
            },
            messageTimestamp: "1772745873",
            messageSecret: "T5o+xkKXwgNcL1e8NpCrH8h8FDagnnL0TgyX0g568NI=",
            reportingTokenInfo: {
                reportingTag: "ARAVi3uXSL1RemZJr/VlV8zEKzA=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC81FC4603CA1ED0F6BD6A6D711565CA",
            },
            message: {
                conversation: "Ou",
                messageContextInfo: {
                    messageSecret: "klwV7QBoYeEOns1rgalX0Y7lvyVOXKU6sCCmz4f4XH0=",
                },
            },
            messageTimestamp: "1772745796",
            messageSecret: "klwV7QBoYeEOns1rgalX0Y7lvyVOXKU6sCCmz4f4XH0=",
            reportingTokenInfo: {
                reportingTag: "ARCoRX3rcTUxkyTpXEZrXivMbvI=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACE0CF4E0D3435EBD508DE74F7A60B0D",
            },
            message: {
                conversation: "Ou",
                messageContextInfo: {
                    messageSecret: "XJGX37bjg8Axcjx2INcpANlb2sIkZb45NRaRN2n/B7o=",
                },
            },
            messageTimestamp: "1772744628",
            messageSecret: "XJGX37bjg8Axcjx2INcpANlb2sIkZb45NRaRN2n/B7o=",
            reportingTokenInfo: {
                reportingTag: "ARDuwwYqr6Ax818m7xGV/uasji8=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACAF294DAF6AE53A852E2CC984C4F384",
            },
            message: {
                conversation: "Go",
                messageContextInfo: {
                    messageSecret: "45rPt/tFUBahG0ASWNjs3ImTZyYLvB1yBsKNmBCrY7s=",
                },
            },
            messageTimestamp: "1772744556",
            messageSecret: "45rPt/tFUBahG0ASWNjs3ImTZyYLvB1yBsKNmBCrY7s=",
            reportingTokenInfo: {
                reportingTag: "ARDfFAz7ClYi0dTNabdMIUnVpp8=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC23213F9BF206FBDF7A6B02A44F40E9",
            },
            message: {
                conversation: "By",
                messageContextInfo: {
                    messageSecret: "sb5mmlunoX+aIbEMtasngJbLKBY7XcwrWaP++KJ6+bs=",
                },
            },
            messageTimestamp: "1772743956",
            messageSecret: "sb5mmlunoX+aIbEMtasngJbLKBY7XcwrWaP++KJ6+bs=",
            reportingTokenInfo: {
                reportingTag: "ARD4AlnNtso+pE21Ds55DENuX74=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC69F274AD73385CB3C61E3209A36927",
            },
            message: {
                conversation: "NY hi",
                messageContextInfo: {
                    messageSecret: "eSQ6D57DUJZTDOIEX2al/KRwVzZBkZ5SuD7SHb8geUo=",
                },
            },
            messageTimestamp: "1772743894",
            messageSecret: "eSQ6D57DUJZTDOIEX2al/KRwVzZBkZ5SuD7SHb8geUo=",
            reportingTokenInfo: {
                reportingTag: "ARAjM8eV2ZY6Gb5be2LEIIs/79A=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC2DE06E2400E763C3C4B689B680AFAA",
            },
            message: {
                conversation: "Ou",
                messageContextInfo: {
                    messageSecret: "KUAe+/u0TXkTa/sjdSz85FYC5VaEn/NBpIpprw/blyE=",
                },
            },
            messageTimestamp: "1772743768",
            messageSecret: "KUAe+/u0TXkTa/sjdSz85FYC5VaEn/NBpIpprw/blyE=",
            reportingTokenInfo: {
                reportingTag: "ARAZLpSJU8e2ob4da5ODSUYna0w=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACD484151A58C275B43F95B8B530817F",
            },
            message: {
                conversation: "Teste",
                messageContextInfo: {
                    messageSecret: "V4LUPV9pn7QDrqKvdbMkykJTrhCinHmKBs4VTzB6a74=",
                },
            },
            messageTimestamp: "1772743633",
            messageSecret: "V4LUPV9pn7QDrqKvdbMkykJTrhCinHmKBs4VTzB6a74=",
            reportingTokenInfo: {
                reportingTag: "ARBzPjt5DWDDVtGRESvlFlshdNU=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC5640A97C9029F54D39D182C5E69FC9",
            },
            message: {
                conversation: "Oi",
                messageContextInfo: {
                    messageSecret: "xvPrQOnOzCTE6La13ZUqi4gyDwoQ04mvw9osnlRFLtI=",
                },
            },
            messageTimestamp: "1772742888",
            messageSecret: "xvPrQOnOzCTE6La13ZUqi4gyDwoQ04mvw9osnlRFLtI=",
            reportingTokenInfo: {
                reportingTag: "ARBzrO/+EiKBSIXJDTlfMSHjyls=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC8163F25D841C78B611C03DF962F4E2",
            },
            message: {
                conversation: "Hmmm",
                messageContextInfo: {
                    messageSecret: "0u5etDWE0WX2p++CWIZnrhpRdB2PpXhoPEQ9PDQtkxI=",
                },
            },
            messageTimestamp: "1772742596",
            messageSecret: "0u5etDWE0WX2p++CWIZnrhpRdB2PpXhoPEQ9PDQtkxI=",
            reportingTokenInfo: {
                reportingTag: "ARCYlmG71iUEHNnmQoeKtzvHVuw=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACCDF69A87D3D54636EDC991A6267BA5",
            },
            message: {
                conversation: "Jo",
                messageContextInfo: {
                    messageSecret: "Eg4SIqzmjfM+zThzU0lfB1BAcgGBgMhSc2JNYNdiIjo=",
                },
            },
            messageTimestamp: "1772742397",
            messageSecret: "Eg4SIqzmjfM+zThzU0lfB1BAcgGBgMhSc2JNYNdiIjo=",
            reportingTokenInfo: {
                reportingTag: "ARDQQy3F44yjPSGDpHidY43JElE=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "AC7D4121228F07BD563F9E99ACDB9C82",
            },
            message: {
                conversation: "Oi",
                messageContextInfo: {
                    messageSecret: "Q2Udrsvp+O6aTofnpt6+cW/jRzV2P4bekviAKSVSfT4=",
                },
            },
            messageTimestamp: "1772742252",
            reactions: [
                {
                    key: {
                        remoteJid: "253716653465766@lid",
                        fromMe: false,
                        id: "AC232FFA615E04F806802B1FC828B52A",
                    },
                    text: "👍",
                    senderTimestampMs: "1772742260134",
                },
            ],
            messageSecret: "Q2Udrsvp+O6aTofnpt6+cW/jRzV2P4bekviAKSVSfT4=",
            reportingTokenInfo: {
                reportingTag: "ARCFaOoBy7cGBI06AEhddLirgBE=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: false,
                id: "ACCE4AEA85D4471360A94352507B43E7",
            },
            message: {
                conversation: "Teste",
                messageContextInfo: {
                    messageSecret: "eAqMd9IoVauVtjshvoeNOxUV8KYaoAqm09qnV58cP/c=",
                },
            },
            messageTimestamp: "1772742096",
            messageSecret: "eAqMd9IoVauVtjshvoeNOxUV8KYaoAqm09qnV58cP/c=",
            reportingTokenInfo: {
                reportingTag: "ARCMcsa90NMRH/bJMrokmSR6qdg=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "253716653465766@lid",
                fromMe: true,
                id: "A5AD1D95017C07679D3FBD40288081C6",
            },
            messageTimestamp: "1772742097",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "31886541906116@lid",
                fromMe: true,
                id: "A51B71A1A02F91B6A7B9CDB4A23CE804",
            },
            message: {
                conversation: "Be",
                messageContextInfo: {
                    messageSecret: "xIrkU7fIpoWR2k7nZkSRm96RSx2AjppLN88s3bIBGPI=",
                },
            },
            messageTimestamp: "1772671054",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "31886541906116@lid",
                    receiptTimestamp: "1772671054",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "xIrkU7fIpoWR2k7nZkSRm96RSx2AjppLN88s3bIBGPI=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "AC3DD805F39F53E7A94BE07FEBF3139C",
            },
            message: {
                conversation: "oi",
                messageContextInfo: {
                    messageSecret: "6LOVdcGndcRVSrZuXayPS/+APEuLPkCGHk40UZUaY3o=",
                },
            },
            messageTimestamp: "1772576593",
            messageSecret: "6LOVdcGndcRVSrZuXayPS/+APEuLPkCGHk40UZUaY3o=",
            reportingTokenInfo: {
                reportingTag: "ARDmbwk3zePWUNzrPB7/5AvVSCk=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "5513997430960@s.whatsapp.net",
                fromMe: false,
                id: "AC2A0829C658FF37C5A094A41E736331",
            },
            message: {
                conversation: "Oi",
                messageContextInfo: {
                    messageSecret: "WDmdFU6OZck7IpTl9AmmKeIQL1rqjHoZMdwsN1CjU9g=",
                },
            },
            messageTimestamp: "1772576472",
            messageSecret: "WDmdFU6OZck7IpTl9AmmKeIQL1rqjHoZMdwsN1CjU9g=",
            reportingTokenInfo: {
                reportingTag: "ARARHDZQaRINAzVLYwffFUNITlQ=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "10046582825112@lid",
                fromMe: false,
                id: "A5EC857B100BD0198D2F856B4F84D23E",
            },
            message: {
                conversation: "Fábio aqui",
                messageContextInfo: {
                    messageSecret: "AGj64LYWwXJPGmmArubZz8HAZAKct2BusWF2OgOX6oc=",
                },
            },
            messageTimestamp: "1772576466",
            messageSecret: "AGj64LYWwXJPGmmArubZz8HAZAKct2BusWF2OgOX6oc=",
            reportingTokenInfo: {
                reportingTag: "ARA9z2nb6/apsngHfzyM8zeF81c=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "276424162332892@lid",
                fromMe: false,
                id: "A5418AAB422AEA74069FFD349574B19F",
            },
            message: {
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7117-24/591280825_890225510664793_3864625533524999945_n.enc?ccb=11-4&oh=01_Q5Aa3wFCrzZ1aLwUwvp8_lui4XWZBXEsmXlGyAyD8ZOOo3PKRQ&oe=69CEB626&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/ogg; codecs=opus",
                    fileSha256: "ffuYJ9DnyvcePFleYCbVqWA4oth9htIA+ykUgsYLbo4=",
                    fileLength: "10889",
                    seconds: 5,
                    ptt: true,
                    mediaKey: "YvA5FwaE9U521VgWTCA+0MG2kg3s9QcYLCwTfDoCRms=",
                    fileEncSha256: "D+JfcctpwQiJHpopYHxkLkU4pnLGdpOdSKSTWqNvydk=",
                    directPath: "/v/t62.7117-24/591280825_890225510664793_3864625533524999945_n.enc?ccb=11-4&oh=01_Q5Aa3wFCrzZ1aLwUwvp8_lui4XWZBXEsmXlGyAyD8ZOOo3PKRQ&oe=69CEB626&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1772575079",
                    contextInfo: {},
                    waveform: "AAMAAAAAAAAAAAAAAAAAAAAAIEtfWEZFOkNQQDxKRy8AAAAAAAAcJEVRQy4GAAAAAAAAGCQRRUw5CyA5DkNMRw==",
                },
                messageContextInfo: {
                    messageSecret: "7/4H9M99WqSws6hSKY8S61/zgzyv0AOJkXmpNRcc93E=",
                },
            },
            messageTimestamp: "1772575082",
            status: "PLAYED",
            mediaData: {
                localPath: "Media/WhatsApp Business Voice Notes/202610/PTT-20260303-WA0001.opus",
            },
            messageSecret: "7/4H9M99WqSws6hSKY8S61/zgzyv0AOJkXmpNRcc93E=",
            reportingTokenInfo: {
                reportingTag: "ARBGnyayTneFQHJub1hmOewvb8c=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "0@s.whatsapp.net",
                fromMe: false,
                id: "26788010434135272-1",
            },
            message: {
                templateMessage: {
                    hydratedFourRowTemplate: {
                        videoMessage: {
                            mimetype: "video/mp4",
                            fileSha256: "ABDsYPsVNKsFdNnHJxlGQD4sEbmM+F0eMAMWZma6D54=",
                            fileLength: "10543810",
                            seconds: 17,
                            mediaKey: "X4ISMXjp2xx1ijEt3mAjtmj/EFiEuAOEC6GANmNzFm4=",
                            caption: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                            fileEncSha256: "w4mSjdPV2bjMixk93ZIGzLEymjieJ6aMihfB0rPpjRE=",
                            contextInfo: {
                                pairedMediaType: "NOT_PAIRED_MEDIA",
                            },
                            staticUrl: "https://static.whatsapp.net/downloadable?category=PSA&id=988932680392422835&num=2ce72344-7b78-4497-bb4e-571042d06b58&_nc_cat=1",
                        },
                        hydratedContentText: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                        hydratedButtons: [
                            {
                                urlButton: {
                                    displayText: "Get started",
                                    url: "whatsapp-smb://biztab/quick-replies",
                                },
                                index: 0,
                            },
                        ],
                    },
                    contextInfo: {},
                    hydratedTemplate: {
                        videoMessage: {
                            mimetype: "video/mp4",
                            fileSha256: "ABDsYPsVNKsFdNnHJxlGQD4sEbmM+F0eMAMWZma6D54=",
                            fileLength: "10543810",
                            seconds: 17,
                            mediaKey: "X4ISMXjp2xx1ijEt3mAjtmj/EFiEuAOEC6GANmNzFm4=",
                            caption: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                            fileEncSha256: "w4mSjdPV2bjMixk93ZIGzLEymjieJ6aMihfB0rPpjRE=",
                            contextInfo: {
                                pairedMediaType: "NOT_PAIRED_MEDIA",
                            },
                            staticUrl: "https://static.whatsapp.net/downloadable?category=PSA&id=988932680392422835&num=2ce72344-7b78-4497-bb4e-571042d06b58&_nc_cat=1",
                        },
                        hydratedContentText: "*Respond faster and type less with quick replies* 🚀\n\nAutomate answers to common questions and answer more chats in less time.\n\n💨 Handle multiple inquiries at once\n\n💯 Provide consistent, professional responses\n\n✅ No typing needed",
                        hydratedButtons: [
                            {
                                urlButton: {
                                    displayText: "Get started",
                                    url: "whatsapp-smb://biztab/quick-replies",
                                },
                                index: 0,
                            },
                        ],
                    },
                },
                messageContextInfo: {
                    messageSecret: "QNJqun3mxvIlDMJfsBkZsd0MGeq6lZW1X9+FWWiOhps=",
                },
            },
            messageTimestamp: "1772311211",
            messageSecret: "QNJqun3mxvIlDMJfsBkZsd0MGeq6lZW1X9+FWWiOhps=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "235987800207434@lid",
                fromMe: true,
                id: "A5F0920FB6E06EEC19EEA1D9C521FDEF",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "zbCCvUZ5IDTkB1GLmptj7DI1kgf3E9VNe9W9IqEVb94=",
                },
            },
            messageTimestamp: "1770837474",
            status: "SERVER_ACK",
            messageC2STimestamp: "1770837475",
            messageSecret: "zbCCvUZ5IDTkB1GLmptj7DI1kgf3E9VNe9W9IqEVb94=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "135962071957533@lid",
                fromMe: false,
                id: "9E60F1184D7B98D01D",
            },
            message: {
                conversation: "Para mais informações, visite o portal do Governo Federal em gov.br.",
            },
            messageTimestamp: "1770418873",
            reportingTokenInfo: {
                reportingTag: "AQ+svIAwpBY4wINPmMP3rA==",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "130361568825482@lid",
                fromMe: true,
                id: "A52BACCBD74A1ECE58D326BDBE75FE5B",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "++3YRbNzafFleS03HgL+F9V9YaqAkc0rvVMBa0RLAkE=",
                },
            },
            messageTimestamp: "1770144902",
            status: "SERVER_ACK",
            messageSecret: "++3YRbNzafFleS03HgL+F9V9YaqAkc0rvVMBa0RLAkE=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "19624443789541@lid",
                fromMe: true,
                id: "A51624DF9B96D572A114759D5124F530",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "2SYJ/UyLAbydHEnnq2wU67JkUSl+r7t8aafeWM1PXSg=",
                },
            },
            messageTimestamp: "1769796912",
            status: "SERVER_ACK",
            messageSecret: "2SYJ/UyLAbydHEnnq2wU67JkUSl+r7t8aafeWM1PXSg=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "52502267465973@lid",
                fromMe: true,
                id: "A5929469637041B33D46C8BC7E65714C",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "8W/1BBXu2P8Q1HHb+sBNojHRJXUVGrhIjCoOx8ddUtA=",
                },
            },
            messageTimestamp: "1768840205",
            status: "READ",
            userReceipt: [
                {
                    userJid: "52502267465973@lid",
                    receiptTimestamp: "0",
                    readTimestamp: "1768840205",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "8W/1BBXu2P8Q1HHb+sBNojHRJXUVGrhIjCoOx8ddUtA=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "264767604322319@lid",
                fromMe: false,
                id: "A5A12CB8BAE7553D40CAE83E04D57F69",
            },
            message: {
                conversation: "Eu não coloquei uma pedra nesse valor não mano tô vindo até você aí pra ver como vamo resolver isso e da um cheque mate nisso aí no resumo",
                messageContextInfo: {
                    messageSecret: "CSrX9EPTp8r7qrAWdFMjZagTbBrkqxhyaO3T7O6p54A=",
                },
            },
            messageTimestamp: "1768323437",
            messageSecret: "CSrX9EPTp8r7qrAWdFMjZagTbBrkqxhyaO3T7O6p54A=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "188180284313837@lid",
                fromMe: false,
                id: "08D7EED404EB1C4CDE",
            },
            message: {
                placeholderMessage: {
                    type: "MASK_LINKED_DEVICES",
                },
            },
            messageTimestamp: "1767925345",
            isMentionedInStatus: false,
        },
    ],
    contacts: [
        {
            id: "253716653465766@lid",
            phoneNumber: "5513920001834@s.whatsapp.net",
        },
        {
            id: "31886541906116@lid",
            phoneNumber: "5513981787979@s.whatsapp.net",
        },
        {
            id: "10046582825112@lid",
            phoneNumber: "5513991689344@s.whatsapp.net",
        },
        {
            id: "276424162332892@lid",
            phoneNumber: "5511940172526@s.whatsapp.net",
        },
        {
            id: "0@s.whatsapp.net",
            name: "WhatsApp Business",
        },
        {
            id: "235987800207434@lid",
            phoneNumber: "5511952998629@s.whatsapp.net",
        },
        {
            id: "135962071957533@lid",
            phoneNumber: "556132073332@s.whatsapp.net",
        },
        {
            id: "130361568825482@lid",
            phoneNumber: "5521959572925@s.whatsapp.net",
        },
        {
            id: "19624443789541@lid",
            phoneNumber: "5596920018547@s.whatsapp.net",
        },
        {
            id: "52502267465973@lid",
            phoneNumber: "5511939416210@s.whatsapp.net",
        },
        {
            id: "264767604322319@lid",
            phoneNumber: "5511983926782@s.whatsapp.net",
        },
        {
            id: "188180284313837@lid",
            phoneNumber: "5511972202550@s.whatsapp.net",
        },
    ],
    syncType: 0,
    progress: null,
    isLatest: false,
    peerDataRequestSessionId: null,
};
var pushName = {
    chats: [],
    messages: [],
    contacts: [
        {
            id: "5513997430960@s.whatsapp.net",
            notify: "Fábio Calumbi",
        },
        {
            id: "554799890690@s.whatsapp.net",
            notify: "Paulo",
        },
        {
            id: "5511992659620@s.whatsapp.net",
            notify: "Antonieta",
        },
        {
            id: "5511947656924@s.whatsapp.net",
            notify: "Jose Francisco",
        },
        {
            id: "5511963289644@s.whatsapp.net",
            notify: "labrahao53",
        },
        {
            id: "5511989972827@s.whatsapp.net",
            notify: "Jacimar Guimarães",
        },
        {
            id: "5513991676416@s.whatsapp.net",
            notify: "Fernanda Nobrega 💖💕",
        },
        {
            id: "5511939416210@s.whatsapp.net",
            notify: ".",
        },
        {
            id: "5513920001834@s.whatsapp.net",
            notify: "Hiran Travassos",
        },
    ],
    syncType: 4,
    progress: null,
    isLatest: false,
    peerDataRequestSessionId: null,
};
var recent = {
    chats: [
        {
            participant: [],
            id: "status@broadcast",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "status@broadcast",
                            fromMe: false,
                            id: "ACBF136764923236D282E71B7B61F092",
                        },
                        message: {
                            videoMessage: {
                                url: "https://mmg.whatsapp.net/v/t62.7161-24/593614424_784494244704402_6527664939107920215_n.enc?ccb=11-4&oh=01_Q5Aa3wFD0_n-V6MKGuOnbJG2oD55tFcrYsPz6bAKOswByIu4xg&oe=69D14B64&_nc_sid=5e03e0&mms3=true",
                                mimetype: "video/mp4",
                                fileSha256: "KHUnyIA+ezV2tMzm2wHAZjr3whz9x0D4XRYf4ccRJnw=",
                                fileLength: "6383438",
                                seconds: 35,
                                mediaKey: "opQWVGokJ7gv8JJCEuEwbxu7huwkvdUo2VCcCawdM2U=",
                                height: 850,
                                width: 382,
                                fileEncSha256: "jrHPGTtXssorIsGxHDB1y4Veh44B08+dRRtMnynfKrI=",
                                directPath: "/v/t62.7161-24/593614424_784494244704402_6527664939107920215_n.enc?ccb=11-4&oh=01_Q5Aa3wFD0_n-V6MKGuOnbJG2oD55tFcrYsPz6bAKOswByIu4xg&oe=69D14B64&_nc_sid=5e03e0",
                                mediaKeyTimestamp: "1772746039",
                                contextInfo: {
                                    pairedMediaType: "NOT_PAIRED_MEDIA",
                                    statusSourceType: "VIDEO",
                                },
                                streamingSidecar: "2e2bdKSgJCwVOVJDDAjjBgZkV5vOUUjAVyZmDa2bLm87c76I2hnbfdBNljF5CtnPDemObSixQ19sfFt5qm3qphqxSA4YWA12iwS/FSxglu3X//UbX/eKgqjlIvtmUbd3g+yBBmHLtbawsdYbfFTNtgUqOiW4auoj/AUaCl+7/ENtA3nz+SBRftyf55z7j7rIs9mO1r9PG22fnftgzinyKSorZ2AytdF3qnztDbdMxKJU/byA9UR2EfmAq6h6iQg7yxPuulpdPmNSmxGbvGxpiNCa4uAV3GuFSdMNQvMa9fTy3tG36vjFw2cyBBCgRFzNUBHGll5Bpfzion3d2BqnGEj4yJbGBQSFTTy/xD9A06ePmysBSNGRlGpJY8lkhrMHib9au4c3jBMvS/Mwbmpfs4u4UZzOG8DdZc46YShh9R4CjmMqVn3l4Xcpg8KOduwpUSUrwvw287yqqoO4uMbbgUTpxfCL8Tlxju7bkaQd7zycefmRoZ6FvjVRUrUVXWafmuwDpJCU/O0pO1C3Fqq1GXAAIkZLA5LoiJnlpwTD+uHkOiusnBz/tsbCcICnvYwgywMIU3rrFq0/88Pc6mLLRIhp4hes5moVLnQyPCuNj+vb7LwTOqKlrD+eD2Q4215AsuP6bQbOHwWLZ2X6Fyph7MsAWTnLqPCIPiOBCqCtRUwkOmRKASTIJS34cNicRAS+tdM9E6bJnl8WySRv7OZOdGm2Eh3az3UNEAuqGNQxgVToAyAvdN4xTZ7/XIXu0QGS9zeAyXi02euW3QPzmctrXXbwzGjza++DIvmutqVgIgWvrhwMsH4zC9k2yM4Tbo+Ocnes9TyUJp2ALAH/+VmY+/SExHAZ1aBRV5oJ3UXz0oku85857cURdSjyAKLFRtfR3FZhI7uI8kkS29rjYmcoAWCRYSz33RDmxHPqXx3HmpNoS++RIkbcs2IVss0npBVwKB685W4UR5iDW1uInsXxWSEtUm/daVx6ZkLi/4poLs1WPdEfiumeQcQFK8rfg3WXn+fyJAByeSs/9xNdeOrgWaPca4yY+au+5pllf5ZFJvfKNYRJWGNRnVIUH/VCXW9M0YgiuTgeFeWbdTIhARYYUXlIlt2h09bGCAAna6R8OCJE9pvfj8ig8MbyJ0tpoe94OFvJ+y+H7Bqaj2NvLC/qvhe+oRUDcQqLLsgUetb1INc7i9wb0ytvua4bF21MC2HO6JC1yTHJq146kPyUlXCSULLo/+W7BFDO2IeY+YAnP8vhkJDklbQ73RIzOxWt3MC6eT7qROIZS/+oVlRmr6oeO6RTySE=",
                                thumbnailDirectPath: "/v/t62.36147-24/554686997_2325123181307270_7625986332890184022_n.enc?ccb=11-4&oh=01_Q5Aa3wGgKa-2vtOw1u4z7w0N2nnvWCOka_M01yXEnEJT-hCz_A&oe=69D17876&_nc_sid=5e03e0",
                                thumbnailSha256: "ociIkZs6qB5EuU8U+w3rOXo4HeYpzFdAkFo3aKcdlvU=",
                                thumbnailEncSha256: "q12ZhMCgls/7/Cr5iRIo3L69CUtPtN6iQifKd5LXHZw=",
                            },
                            messageContextInfo: {
                                messageSecret: "ix/lWHxvKFfk7Oy88fk8cfoEI4wuznM7d+oQoGFTjCQ=",
                            },
                        },
                        messageTimestamp: "1772746479",
                        participant: "5513997430960@s.whatsapp.net",
                        messageSecret: "ix/lWHxvKFfk7Oy88fk8cfoEI4wuznM7d+oQoGFTjCQ=",
                        reportingTokenInfo: {
                            reportingTag: "ARDD/jYAvsAHlVXJDk1NRmiMg70=",
                        },
                        isMentionedInStatus: false,
                    },
                },
            ],
            lastMessageRecvTimestamp: 1772746479,
        },
        {
            participant: [],
            id: "26946725482604@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "26946725482604@lid",
                            fromMe: true,
                            id: "A5237B8D3DBEC18082584B336D4E1120",
                        },
                        messageTimestamp: "1772311225",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "5501937029221@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "5501937029221@lid",
                            fromMe: true,
                            id: "A51605405AE715FF784405035F5E0339",
                        },
                        messageTimestamp: "1772016480",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "67594228912250@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "67594228912250@lid",
                            fromMe: true,
                            id: "A59FF7291348C6BD4EB2AD7678551CC4",
                        },
                        messageTimestamp: "1771381223",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "271433678721164@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "271433678721164@lid",
                            fromMe: true,
                            id: "A513A7D406F5214D73C7ABF4BA80F2DD",
                        },
                        messageTimestamp: "1771381223",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "81673165254762@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "81673165254762@lid",
                            fromMe: true,
                            id: "A599BC73AB8F18959366D06ABD7FECB5",
                        },
                        messageTimestamp: "1770418876",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "94275169697921@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "94275169697921@lid",
                            fromMe: true,
                            id: "A55C6C5B62DFBEBB083AEFE723BB0DE5",
                        },
                        messageTimestamp: "1770326630",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "279280768540790@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "279280768540790@lid",
                            fromMe: true,
                            id: "A5D2206CF8DD0BA5E612BE5070214C45",
                        },
                        messageTimestamp: "1770210940",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "201288004411451@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "201288004411451@lid",
                            fromMe: true,
                            id: "A5128F6F0E804175C115DDCDD9A53BA2",
                        },
                        messageTimestamp: "1769725450",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "93437181325427@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "93437181325427@lid",
                            fromMe: true,
                            id: "A56C22FC5FDE39C1ECE3DE257DD1C318",
                        },
                        messageTimestamp: "1769111609",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "245474611183764@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "245474611183764@lid",
                            fromMe: true,
                            id: "A5F43E8424A0D31FF4CD581D4F741D1F",
                        },
                        messageTimestamp: "1768784406",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "120117484601366@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "120117484601366@lid",
                            fromMe: true,
                            id: "A54CF3B8F3C12380EFF7D1CFEF00A989",
                        },
                        messageTimestamp: "1768080689",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
    ],
    messages: [
        {
            key: {
                remoteJid: "status@broadcast",
                fromMe: false,
                id: "ACBF136764923236D282E71B7B61F092",
            },
            message: {
                videoMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7161-24/593614424_784494244704402_6527664939107920215_n.enc?ccb=11-4&oh=01_Q5Aa3wFD0_n-V6MKGuOnbJG2oD55tFcrYsPz6bAKOswByIu4xg&oe=69D14B64&_nc_sid=5e03e0&mms3=true",
                    mimetype: "video/mp4",
                    fileSha256: "KHUnyIA+ezV2tMzm2wHAZjr3whz9x0D4XRYf4ccRJnw=",
                    fileLength: "6383438",
                    seconds: 35,
                    mediaKey: "opQWVGokJ7gv8JJCEuEwbxu7huwkvdUo2VCcCawdM2U=",
                    height: 850,
                    width: 382,
                    fileEncSha256: "jrHPGTtXssorIsGxHDB1y4Veh44B08+dRRtMnynfKrI=",
                    directPath: "/v/t62.7161-24/593614424_784494244704402_6527664939107920215_n.enc?ccb=11-4&oh=01_Q5Aa3wFD0_n-V6MKGuOnbJG2oD55tFcrYsPz6bAKOswByIu4xg&oe=69D14B64&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1772746039",
                    contextInfo: {
                        pairedMediaType: "NOT_PAIRED_MEDIA",
                        statusSourceType: "VIDEO",
                    },
                    streamingSidecar: "2e2bdKSgJCwVOVJDDAjjBgZkV5vOUUjAVyZmDa2bLm87c76I2hnbfdBNljF5CtnPDemObSixQ19sfFt5qm3qphqxSA4YWA12iwS/FSxglu3X//UbX/eKgqjlIvtmUbd3g+yBBmHLtbawsdYbfFTNtgUqOiW4auoj/AUaCl+7/ENtA3nz+SBRftyf55z7j7rIs9mO1r9PG22fnftgzinyKSorZ2AytdF3qnztDbdMxKJU/byA9UR2EfmAq6h6iQg7yxPuulpdPmNSmxGbvGxpiNCa4uAV3GuFSdMNQvMa9fTy3tG36vjFw2cyBBCgRFzNUBHGll5Bpfzion3d2BqnGEj4yJbGBQSFTTy/xD9A06ePmysBSNGRlGpJY8lkhrMHib9au4c3jBMvS/Mwbmpfs4u4UZzOG8DdZc46YShh9R4CjmMqVn3l4Xcpg8KOduwpUSUrwvw287yqqoO4uMbbgUTpxfCL8Tlxju7bkaQd7zycefmRoZ6FvjVRUrUVXWafmuwDpJCU/O0pO1C3Fqq1GXAAIkZLA5LoiJnlpwTD+uHkOiusnBz/tsbCcICnvYwgywMIU3rrFq0/88Pc6mLLRIhp4hes5moVLnQyPCuNj+vb7LwTOqKlrD+eD2Q4215AsuP6bQbOHwWLZ2X6Fyph7MsAWTnLqPCIPiOBCqCtRUwkOmRKASTIJS34cNicRAS+tdM9E6bJnl8WySRv7OZOdGm2Eh3az3UNEAuqGNQxgVToAyAvdN4xTZ7/XIXu0QGS9zeAyXi02euW3QPzmctrXXbwzGjza++DIvmutqVgIgWvrhwMsH4zC9k2yM4Tbo+Ocnes9TyUJp2ALAH/+VmY+/SExHAZ1aBRV5oJ3UXz0oku85857cURdSjyAKLFRtfR3FZhI7uI8kkS29rjYmcoAWCRYSz33RDmxHPqXx3HmpNoS++RIkbcs2IVss0npBVwKB685W4UR5iDW1uInsXxWSEtUm/daVx6ZkLi/4poLs1WPdEfiumeQcQFK8rfg3WXn+fyJAByeSs/9xNdeOrgWaPca4yY+au+5pllf5ZFJvfKNYRJWGNRnVIUH/VCXW9M0YgiuTgeFeWbdTIhARYYUXlIlt2h09bGCAAna6R8OCJE9pvfj8ig8MbyJ0tpoe94OFvJ+y+H7Bqaj2NvLC/qvhe+oRUDcQqLLsgUetb1INc7i9wb0ytvua4bF21MC2HO6JC1yTHJq146kPyUlXCSULLo/+W7BFDO2IeY+YAnP8vhkJDklbQ73RIzOxWt3MC6eT7qROIZS/+oVlRmr6oeO6RTySE=",
                    thumbnailDirectPath: "/v/t62.36147-24/554686997_2325123181307270_7625986332890184022_n.enc?ccb=11-4&oh=01_Q5Aa3wGgKa-2vtOw1u4z7w0N2nnvWCOka_M01yXEnEJT-hCz_A&oe=69D17876&_nc_sid=5e03e0",
                    thumbnailSha256: "ociIkZs6qB5EuU8U+w3rOXo4HeYpzFdAkFo3aKcdlvU=",
                    thumbnailEncSha256: "q12ZhMCgls/7/Cr5iRIo3L69CUtPtN6iQifKd5LXHZw=",
                },
                messageContextInfo: {
                    messageSecret: "ix/lWHxvKFfk7Oy88fk8cfoEI4wuznM7d+oQoGFTjCQ=",
                },
            },
            messageTimestamp: "1772746479",
            participant: "5513997430960@s.whatsapp.net",
            messageSecret: "ix/lWHxvKFfk7Oy88fk8cfoEI4wuznM7d+oQoGFTjCQ=",
            reportingTokenInfo: {
                reportingTag: "ARDD/jYAvsAHlVXJDk1NRmiMg70=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "31886541906116@lid",
                fromMe: true,
                id: "A5AD7C41BEE8B1ACF37E1B317C673A99",
            },
            message: {
                conversation: "No",
                messageContextInfo: {
                    messageSecret: "glQhyjUOtaeYN7/F6HmC2v9SvcNrlMcwgLebrxeLXzs=",
                },
            },
            messageTimestamp: "1772671031",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "31886541906116@lid",
                    receiptTimestamp: "1772671031",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "glQhyjUOtaeYN7/F6HmC2v9SvcNrlMcwgLebrxeLXzs=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "31886541906116@lid",
                fromMe: false,
                id: "A5F89E5CE0582786BDA24B90BF21D7FC",
            },
            message: {
                conversation: "Ffjidf",
                messageContextInfo: {
                    messageSecret: "a5yVO9eBm65LlRwLJcDaoyIo7cviYcZhsvvHjpl7o+8=",
                },
            },
            messageTimestamp: "1772576028",
            messageSecret: "a5yVO9eBm65LlRwLJcDaoyIo7cviYcZhsvvHjpl7o+8=",
            reportingTokenInfo: {
                reportingTag: "ARD/+i7WmKFIXMPatn7v/1JdMnA=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "31886541906116@lid",
                fromMe: false,
                id: "A59BC816A2510F0C115A63F02A53526C",
            },
            message: {
                conversation: "Kgvccv",
                messageContextInfo: {
                    messageSecret: "+gjj7/zfTDOhs0wdcmpmA8Z+fJlYVjD1aq2XDP0kfTo=",
                },
            },
            messageTimestamp: "1772576027",
            messageSecret: "+gjj7/zfTDOhs0wdcmpmA8Z+fJlYVjD1aq2XDP0kfTo=",
            reportingTokenInfo: {
                reportingTag: "ARB1dcDjdxaiirbmftNdETIGXX0=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "31886541906116@lid",
                fromMe: false,
                id: "A5365C1D71F0DB525EBBBCFFFA06766B",
            },
            message: {
                conversation: "Iggrdd",
                messageContextInfo: {
                    messageSecret: "PMN6R1o2RM4exqRFNoZZHwosytUGWoIKEOg1kvqjlOU=",
                },
            },
            messageTimestamp: "1772576025",
            messageSecret: "PMN6R1o2RM4exqRFNoZZHwosytUGWoIKEOg1kvqjlOU=",
            reportingTokenInfo: {
                reportingTag: "ARDtqQjiHM7s5nzwsSiVYekvEO0=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "31886541906116@lid",
                fromMe: true,
                id: "A5E613B2390EB549FB3C6139E11AAB2B",
            },
            messageTimestamp: "1772576026",
            status: "PENDING",
            messageStubType: "BIZ_COEX_PRIVACY_INIT",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB07C3DAA90883E2BC0A6",
            },
            message: {
                extendedTextMessage: {
                    text: "Olá, \n\nEste número é apenas para mensagens automáticas, não é o número de suporte e não oferecemos suporte pelo WhatsApp. Se você está procurando suporte, visite nosso site:\n\nhttps://www.taaqi.app",
                    matchedText: "https://www.taaqi.app",
                    description: "Conecte-se com produtos e serviços locais em um só lugar. Crie seu negócio online ou descubra novas opções perto de você.",
                    title: "Taaqi - Tudo está aqui!",
                    previewType: "NONE",
                    inviteLinkGroupTypeV2: "DEFAULT",
                },
            },
            messageTimestamp: "1767892778",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767892778",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "AC82EB2613E1559433B25C2EA9161F06",
            },
            message: {
                conversation: "mas chegou DIAS DEPOIS KKKKK",
                messageContextInfo: {
                    messageSecret: "0P/q6CZIysdEt8kr8omQWIC+EKUlZgz0yzY5rQBDYvQ=",
                },
            },
            messageTimestamp: "1767892777",
            messageSecret: "0P/q6CZIysdEt8kr8omQWIC+EKUlZgz0yzY5rQBDYvQ=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB040C60AC85ED33CFB26",
            },
            message: {
                extendedTextMessage: {
                    text: "Olá, \n\nEste número é apenas para mensagens automáticas, não é o número de suporte e não oferecemos suporte pelo WhatsApp. Se você está procurando suporte, visite nosso site:\n\nhttps://www.taaqi.app",
                    matchedText: "https://www.taaqi.app",
                    description: "Conecte-se com produtos e serviços locais em um só lugar. Crie seu negócio online ou descubra novas opções perto de você.",
                    title: "Taaqi - Tudo está aqui!",
                    previewType: "NONE",
                    inviteLinkGroupTypeV2: "DEFAULT",
                },
            },
            messageTimestamp: "1767892771",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767892771",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "ACCCDAF11991E499224ED835AEFC17A2",
            },
            message: {
                conversation: "vc tipo, avisou as msg",
                messageContextInfo: {
                    messageSecret: "D/+nJ+K4fwlZvhc/wpQgOpj4QRFRqpyOHGn1Aigmnj8=",
                },
            },
            messageTimestamp: "1767892770",
            messageSecret: "D/+nJ+K4fwlZvhc/wpQgOpj4QRFRqpyOHGn1Aigmnj8=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB0AE83FE33369A8B770C",
            },
            message: {
                extendedTextMessage: {
                    text: "Olá, \n\nEste número é apenas para mensagens automáticas, não é o número de suporte e não oferecemos suporte pelo WhatsApp. Se você está procurando suporte, visite nosso site:\n\nhttps://www.taaqi.app",
                    matchedText: "https://www.taaqi.app",
                    description: "Conecte-se com produtos e serviços locais em um só lugar. Crie seu negócio online ou descubra novas opções perto de você.",
                    title: "Taaqi - Tudo está aqui!",
                    previewType: "NONE",
                    inviteLinkGroupTypeV2: "DEFAULT",
                },
            },
            messageTimestamp: "1767892765",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767892766",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "AC48C4939DED9A1B0E1DA1AA27E97569",
            },
            message: {
                conversation: "viado",
                messageContextInfo: {
                    messageSecret: "Xl8zEct/udHjFTZFOa/RyySStL41FTRmN5Sut46xZcY=",
                },
            },
            messageTimestamp: "1767892764",
            messageSecret: "Xl8zEct/udHjFTZFOa/RyySStL41FTRmN5Sut46xZcY=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB0E924AEE8B330114E52",
            },
            message: {
                extendedTextMessage: {
                    text: "Olá, \n\nEste número é apenas para mensagens automáticas, não é o número de suporte e não oferecemos suporte pelo WhatsApp. Se você está procurando suporte, visite nosso site:\n\nhttps://www.taaqi.app",
                    matchedText: "https://www.taaqi.app",
                    description: "https://www.taaqi.app",
                    title: "www.taaqi.app",
                    previewType: "NONE",
                    inviteLinkGroupTypeV2: "DEFAULT",
                },
            },
            messageTimestamp: "1767892763",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767892764",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "ACF9FEDBAB29EBBEBC8FE3ED9E785096",
            },
            message: {
                conversation: "ah porra",
                messageContextInfo: {
                    messageSecret: "IVoXNUhJA3+HBEsm1hDmtC958NXPraGCia5rCgm8az4=",
                },
            },
            messageTimestamp: "1767892759",
            messageSecret: "IVoXNUhJA3+HBEsm1hDmtC958NXPraGCia5rCgm8az4=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "A59392B4023A8E6F0D5844CA060BFEC1",
            },
            message: {
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7117-24/564233883_871382022279015_1572860056241287073_n.enc?ccb=11-4&oh=01_Q5Aa3gFknW4wULXQr_DgtTG5LLZk0qAoIX4glkFOXMH1WRvB2w&oe=69875AA4&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/ogg; codecs=opus",
                    fileSha256: "9JoBqS82QCHQS1SCH3nIyk1UDNtyM9IaxTK+QJLSTLI=",
                    fileLength: "29326",
                    seconds: 12,
                    ptt: true,
                    mediaKey: "UTcvAPJsh6MWpcoCiEXTckVpcXLJuWba+l0fjxiKeJo=",
                    fileEncSha256: "YgwUqhHMMkCPt7xTK/oZRQot6gER+rB74MlQaPHUi/U=",
                    directPath: "/v/t62.7117-24/564233883_871382022279015_1572860056241287073_n.enc?ccb=11-4&oh=01_Q5Aa3gFknW4wULXQr_DgtTG5LLZk0qAoIX4glkFOXMH1WRvB2w&oe=69875AA4&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1767891806",
                    contextInfo: {
                        stanzaId: "ACAFC2D89B8490B3AA227D48BD0E3630",
                        participant: "164145160822935@lid",
                        quotedMessage: {
                            conversation: "eu não me chamo José Aldo e não tenho nenhum conhecido com esse nome",
                        },
                        quotedType: "EXPLICIT",
                    },
                    waveform: "ADY5ICY4Ml5SNSsINlUrTC86IyglPz9KVDouAEwKOSAiJ0NJMgQPTzRPLyNJWz4qUVtaPDs1Gww9VBEABhtWJA==",
                },
                messageContextInfo: {
                    messageSecret: "y3VcQBi1acpxgDbrPzSx8lIvcBN3T71nwtb7PcG8woY=",
                },
            },
            messageTimestamp: "1767891817",
            status: "DELIVERY_ACK",
            mediaData: {
                localPath: "Media/WhatsApp Business Voice Notes/202602/PTT-20260108-WA0000.opus",
            },
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767891818",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "y3VcQBi1acpxgDbrPzSx8lIvcBN3T71nwtb7PcG8woY=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB0201C00ACA58DBA734A",
            },
            message: {
                extendedTextMessage: {
                    text: "Olá, \n\nEste número é apenas para mensagens automáticas, não é o número de suporte e não oferecemos suporte pelo WhatsApp. Se você está procurando suporte, visite nosso site:\n\nhttps://www.taaqi.app",
                    matchedText: "https://www.taaqi.app",
                    description: "Conecte-se com produtos e serviços locais em um só lugar. Crie seu negócio online ou descubra novas opções perto de você.",
                    title: "Taaqi - Tudo está aqui!",
                    previewType: "NONE",
                    contextInfo: {
                        stanzaId: "ACAFC2D89B8490B3AA227D48BD0E3630",
                        participant: "164145160822935@lid",
                        quotedMessage: {
                            conversation: "eu não me chamo José Aldo e não tenho nenhum conhecido com esse nome",
                        },
                        quotedType: "EXPLICIT",
                    },
                    inviteLinkGroupTypeV2: "DEFAULT",
                },
            },
            messageTimestamp: "1767794283",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767794283",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "ACAFC2D89B8490B3AA227D48BD0E3630",
            },
            message: {
                conversation: "eu não me chamo José Aldo e não tenho nenhum conhecido com esse nome",
                messageContextInfo: {
                    messageSecret: "0ZnO2vTqzYMa2He2sRoBoKHY8tjAmHrgl6ReAr53pZw=",
                },
            },
            messageTimestamp: "1767794282",
            messageSecret: "0ZnO2vTqzYMa2He2sRoBoKHY8tjAmHrgl6ReAr53pZw=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB0B55AC3ECA95F09F794",
            },
            message: {
                extendedTextMessage: {
                    text: "Olá, \n\nEste número é apenas para mensagens automáticas, não é o número de suporte e não oferecemos suporte pelo WhatsApp. Se você está procurando suporte, visite nosso site:\n\nhttps://www.taaqi.app",
                    matchedText: "https://www.taaqi.app",
                    description: "https://www.taaqi.app",
                    title: "www.taaqi.app",
                    previewType: "NONE",
                    contextInfo: {
                        stanzaId: "AC2416928AE8275BC1DEA2C1033A7E49",
                        participant: "164145160822935@lid",
                        quotedMessage: {
                            conversation: "bom dia",
                        },
                        quotedType: "EXPLICIT",
                    },
                    inviteLinkGroupTypeV2: "DEFAULT",
                },
            },
            messageTimestamp: "1767794272",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767794272",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: false,
                id: "AC2416928AE8275BC1DEA2C1033A7E49",
            },
            message: {
                conversation: "bom dia",
                messageContextInfo: {
                    messageSecret: "wyEthO2c9UV0TvlZMA5roCo3/WqD8q+uc5RT+9Y4L2c=",
                },
            },
            messageTimestamp: "1767794269",
            messageSecret: "wyEthO2c9UV0TvlZMA5roCo3/WqD8q+uc5RT+9Y4L2c=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB0CDBDB5D32031409600",
            },
            message: {
                conversation: "Olá Jose Aldo, seu cadastro foi confirmado com sucesso.\n\nEstamos muito felizes por você fazer parte da Taaqi, seja bem-vindo!",
            },
            messageTimestamp: "1767793544",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793545",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB069EB43E4E1947B7EB1",
            },
            message: {
                conversation: "Olá Jose Aldo!\n\nPara confirmar seu cadastro, acesse:\n\nhttp://192.168.0.5:3001/auth/sign-up/validate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU2YTQ4Mzc4LTZjYTYtNGNjYy04NjAzLTYyNTczM2QwMDEwYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6MDk6MjMuMzEzWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6Mzk6MjkuMDAwWiIsImFjdGl2ZSI6MSwibmFtZSI6Ikpvc2UgQWxkbyIsInBob25lIjoiNDc5OTg5MDY5MCIsImVtYWlsIjoiaGlyYW50cmF2YXNzb3MrY29sYWJvcmFkb3JAZ21haWwuY29tIiwiaW1hZ2UiOm51bGwsImlhdCI6MTc2Nzc5MzUyNCwiZXhwIjoxNzY4Mzk4MzI0fQ.G6iax8pag9J0FzsB_w2UYKtYBL7htd6HYn-ncHYJmxQ",
            },
            messageTimestamp: "1767793524",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793526",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB03E224D1E588F96198A",
            },
            message: {
                conversation: "Olá Jose Aldo!\n\nPara confirmar seu cadastro, acesse:\n\nhttp://192.168.0.5:3001/auth/sign-up/validate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU2YTQ4Mzc4LTZjYTYtNGNjYy04NjAzLTYyNTczM2QwMDEwYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6MDk6MjMuMzEzWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6Mzk6MjkuMDAwWiIsImFjdGl2ZSI6MSwibmFtZSI6Ikpvc2UgQWxkbyIsInBob25lIjoiNDc5OTg5MDY5MCIsImVtYWlsIjoiaGlyYW50cmF2YXNzb3MrY29sYWJvcmFkb3JAZ21haWwuY29tIiwiaW1hZ2UiOm51bGwsImlhdCI6MTc2Nzc5MzUyMiwiZXhwIjoxNzY4Mzk4MzIyfQ.lbPepQi3jWlcAZ_JtSJcqkdihoaeOl3E0RVqVP1Eja4",
            },
            messageTimestamp: "1767793523",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793525",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB06432B8FBDD6117BD5B",
            },
            message: {
                conversation: "Olá Jose Aldo!\n\nPara confirmar seu cadastro, acesse:\n\nhttp://192.168.0.5:3001/auth/sign-up/validate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU2YTQ4Mzc4LTZjYTYtNGNjYy04NjAzLTYyNTczM2QwMDEwYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6MDk6MjMuMzEzWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6Mzk6MjkuMDAwWiIsImFjdGl2ZSI6MSwibmFtZSI6Ikpvc2UgQWxkbyIsInBob25lIjoiNDc5OTg5MDY5MCIsImVtYWlsIjoiaGlyYW50cmF2YXNzb3MrY29sYWJvcmFkb3JAZ21haWwuY29tIiwiaW1hZ2UiOm51bGwsImlhdCI6MTc2Nzc5MzQ0OCwiZXhwIjoxNzY4Mzk4MjQ4fQ.MuiIV0YMnU7scFhYJxbuBY5VXrWsJhdVjyUtxUYLX80",
            },
            messageTimestamp: "1767793448",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793449",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB0941742B4DEDA01B5EB",
            },
            message: {
                conversation: "Olá Jose Aldo!\n\nPara confirmar seu cadastro, acesse:\n\nhttp://192.168.0.5:3001/auth/sign-up/validate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU2YTQ4Mzc4LTZjYTYtNGNjYy04NjAzLTYyNTczM2QwMDEwYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6MDk6MjMuMzEzWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6Mzk6MjkuMDAwWiIsImFjdGl2ZSI6MSwibmFtZSI6Ikpvc2UgQWxkbyIsInBob25lIjoiNDc5OTg5MDY5MCIsImVtYWlsIjoiaGlyYW50cmF2YXNzb3MrY29sYWJvcmFkb3JAZ21haWwuY29tIiwiaW1hZ2UiOm51bGwsImlhdCI6MTc2Nzc5MzQ0NiwiZXhwIjoxNzY4Mzk4MjQ2fQ.gvjhDRDKNetDMaseJF8FNZJVLfJEinjqHDiLvZTgY7s",
            },
            messageTimestamp: "1767793446",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793448",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB018B4BF4170BFB48B08",
            },
            message: {
                conversation: "Olá Jose Aldo!\n\nPara confirmar seu cadastro, acesse:\n\nhttp://192.168.0.5:3001/auth/sign-up/validate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU2YTQ4Mzc4LTZjYTYtNGNjYy04NjAzLTYyNTczM2QwMDEwYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6MDk6MjMuMzEzWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6Mzk6MjkuMDAwWiIsImFjdGl2ZSI6MSwibmFtZSI6Ikpvc2UgQWxkbyIsInBob25lIjoiNDc5OTg5MDY5MCIsImVtYWlsIjoiaGlyYW50cmF2YXNzb3MrY29sYWJvcmFkb3JAZ21haWwuY29tIiwiaW1hZ2UiOm51bGwsImlhdCI6MTc2Nzc5MzMxNSwiZXhwIjoxNzY4Mzk4MTE1fQ.1_fHLsbp2Be2LOxLoAQrkTZzuAwTuBPt83UchaAC7kc",
            },
            messageTimestamp: "1767793315",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793317",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "554799890690@s.whatsapp.net",
                fromMe: true,
                id: "3EB04FA47677B6D620CDDC",
            },
            message: {
                conversation: "Olá Jose Aldo!\n\nPara confirmar seu cadastro, acesse:\n\nhttp://192.168.0.5:3001/auth/sign-up/validate/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjU2YTQ4Mzc4LTZjYTYtNGNjYy04NjAzLTYyNTczM2QwMDEwYyIsImNyZWF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6MDk6MjMuMzEzWiIsInVwZGF0ZWRBdCI6IjIwMjYtMDEtMDdUMTM6Mzk6MjkuMDAwWiIsImFjdGl2ZSI6MSwibmFtZSI6Ikpvc2UgQWxkbyIsInBob25lIjoiNDc5OTg5MDY5MCIsImVtYWlsIjoiaGlyYW50cmF2YXNzb3MrY29sYWJvcmFkb3JAZ21haWwuY29tIiwiaW1hZ2UiOm51bGwsImlhdCI6MTc2Nzc5MzMxMywiZXhwIjoxNzY4Mzk4MTEzfQ.nivDWkrm9-xoafcabzAsA9aJvP22LagsZsZHjKiBDlg",
            },
            messageTimestamp: "1767793314",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "554799890690@s.whatsapp.net",
                    receiptTimestamp: "1767793315",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "10046582825112@lid",
                fromMe: false,
                id: "A525BA9F75DEB76C0FB229808F019509",
            },
            message: {
                conversation: "Oi",
                messageContextInfo: {
                    messageSecret: "P5MsWLq8hbrMXsm9QjErrewQ3i7AJ9JRHy8fnLcFYts=",
                },
            },
            messageTimestamp: "1772576463",
            messageSecret: "P5MsWLq8hbrMXsm9QjErrewQ3i7AJ9JRHy8fnLcFYts=",
            reportingTokenInfo: {
                reportingTag: "ARDxBmficVgW36kpIo1O4TPYtbM=",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "10046582825112@lid",
                fromMe: true,
                id: "A5814F47C07CBD0754797F4D4758DC1C",
            },
            messageTimestamp: "1772576465",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "276424162332892@lid",
                fromMe: true,
                id: "A5A100D0AF66341C9C7D4A222D25C85E",
            },
            messageTimestamp: "1772575084",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "26946725482604@lid",
                fromMe: true,
                id: "A5237B8D3DBEC18082584B336D4E1120",
            },
            messageTimestamp: "1772311225",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "5501937029221@lid",
                fromMe: true,
                id: "A51605405AE715FF784405035F5E0339",
            },
            messageTimestamp: "1772016480",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "67594228912250@lid",
                fromMe: true,
                id: "A59FF7291348C6BD4EB2AD7678551CC4",
            },
            messageTimestamp: "1771381223",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "271433678721164@lid",
                fromMe: true,
                id: "A513A7D406F5214D73C7ABF4BA80F2DD",
            },
            messageTimestamp: "1771381223",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "235987800207434@lid",
                fromMe: true,
                id: "A5CA4D9060EA0EB927B01FA6D63CE5F4",
            },
            messageTimestamp: "1770837473",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "81673165254762@lid",
                fromMe: true,
                id: "A599BC73AB8F18959366D06ABD7FECB5",
            },
            messageTimestamp: "1770418876",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "135962071957533@lid",
                fromMe: true,
                id: "A523FCBD884F2AC6A956D00A06156042",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "uk9rWUv9T99wj3f7+FaMYhsnfUdr+YnJ+GBuD8NUsUE=",
                },
            },
            messageTimestamp: "1770414891",
            status: "DELIVERY_ACK",
            userReceipt: [
                {
                    userJid: "135962071957533@lid",
                    receiptTimestamp: "1770414891",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "uk9rWUv9T99wj3f7+FaMYhsnfUdr+YnJ+GBuD8NUsUE=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "135962071957533@lid",
                fromMe: false,
                id: "ECD97C72D599E52D0C",
            },
            message: {
                templateMessage: {
                    hydratedFourRowTemplate: {
                        hydratedContentText: "Olá, TIAGO.\n\nO Governo do Brasil tem um recado importante para você que mora na cidade de POA: sábado (07/02) é o Dia D de Vacinação contra sarampo e febre amarela. \n\nProcure a UBS mais próxima, muitos pontos de vacinação na sua cidade estarão abertos das 8h às 17h. Proteja sua saúde e a da sua família.\n\nEm caso de dúvidas, busque o site do Ministério da Saúde ou ligue 136.\n\nDeseja continuar recebendo informações deste programa do Governo do Brasil?",
                        hydratedButtons: [
                            {
                                quickReplyButton: {
                                    displayText: "Sim",
                                    id: "Sim",
                                },
                                index: 0,
                            },
                            {
                                quickReplyButton: {
                                    displayText: "Não",
                                    id: "Não",
                                },
                                index: 1,
                            },
                        ],
                    },
                    hydratedTemplate: {
                        hydratedContentText: "Olá, TIAGO.\n\nO Governo do Brasil tem um recado importante para você que mora na cidade de POA: sábado (07/02) é o Dia D de Vacinação contra sarampo e febre amarela. \n\nProcure a UBS mais próxima, muitos pontos de vacinação na sua cidade estarão abertos das 8h às 17h. Proteja sua saúde e a da sua família.\n\nEm caso de dúvidas, busque o site do Ministério da Saúde ou ligue 136.\n\nDeseja continuar recebendo informações deste programa do Governo do Brasil?",
                        hydratedButtons: [
                            {
                                quickReplyButton: {
                                    displayText: "Sim",
                                    id: "Sim",
                                },
                                index: 0,
                            },
                            {
                                quickReplyButton: {
                                    displayText: "Não",
                                    id: "Não",
                                },
                                index: 1,
                            },
                        ],
                    },
                },
            },
            messageTimestamp: "1770414887",
            reportingTokenInfo: {
                reportingTag: "AQ+J/pn+foBhI3pkwSfX5g==",
            },
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "135962071957533@lid",
                fromMe: true,
                id: "A58E426A829F31F1B63BFBB8453CDCF1",
            },
            messageTimestamp: "1770414889",
            status: "PENDING",
            messageStubType: "BIZ_PRIVACY_MODE_INIT_FB",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "94275169697921@lid",
                fromMe: true,
                id: "A55C6C5B62DFBEBB083AEFE723BB0DE5",
            },
            messageTimestamp: "1770326630",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "279280768540790@lid",
                fromMe: true,
                id: "A5D2206CF8DD0BA5E612BE5070214C45",
            },
            messageTimestamp: "1770210940",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "130361568825482@lid",
                fromMe: true,
                id: "A5370076988D3F481B1523BC53C129EA",
            },
            messageTimestamp: "1770144900",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "19624443789541@lid",
                fromMe: true,
                id: "A594EF9A19216EF735E29986CB5170AF",
            },
            messageTimestamp: "1769796910",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "201288004411451@lid",
                fromMe: true,
                id: "A5128F6F0E804175C115DDCDD9A53BA2",
            },
            messageTimestamp: "1769725450",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "93437181325427@lid",
                fromMe: true,
                id: "A56C22FC5FDE39C1ECE3DE257DD1C318",
            },
            messageTimestamp: "1769111609",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "52502267465973@lid",
                fromMe: false,
                id: "ACA379F0E4CD91043EB488D570EECFA8",
            },
            message: {
                audioMessage: {
                    url: "https://mmg.whatsapp.net/v/t62.7117-24/618565416_1531193431318799_2350362726682312244_n.enc?ccb=11-4&oh=01_Q5Aa3gEuBWyv1liSosmUuQP4JzYu9EHBVSwbQuKMDJnU7fiCvw&oe=6995CC8C&_nc_sid=5e03e0&mms3=true",
                    mimetype: "audio/ogg; codecs=opus",
                    fileSha256: "U3TgFCt0K1o+fLw7qwdGoDjZiY1b75bA3bNlAg0Ctwg=",
                    fileLength: "20685",
                    seconds: 9,
                    ptt: true,
                    mediaKey: "dl1HPWWeq7Y/aTYrvFX1cz060aCXRh5JRMs85864Ns8=",
                    fileEncSha256: "p1tSDmyLH+p7OVdCl1Mj50tkY5cEyFGITqmIErCAz7o=",
                    directPath: "/v/t62.7117-24/618565416_1531193431318799_2350362726682312244_n.enc?ccb=11-4&oh=01_Q5Aa3gEuBWyv1liSosmUuQP4JzYu9EHBVSwbQuKMDJnU7fiCvw&oe=6995CC8C&_nc_sid=5e03e0",
                    mediaKeyTimestamp: "1768840194",
                    contextInfo: {},
                    waveform: "AAAAMQVFTxwSQAcAABE0Q0Q7NTYaIDtGLCM7TTlMPEk+NDYNAAAAOkVLSTFOPSQnLjpRMDo9UzcpEDkqMjA+Og==",
                },
                messageContextInfo: {
                    messageSecret: "lrcS8bWROhYPpczfhe3/RhRqKytcx4Ej3EXw4UKWINs=",
                },
            },
            messageTimestamp: "1768840202",
            status: "PLAYED",
            mediaData: {
                localPath: "Media/WhatsApp Business Voice Notes/202604/PTT-20260119-WA0000.opus",
            },
            messageSecret: "lrcS8bWROhYPpczfhe3/RhRqKytcx4Ej3EXw4UKWINs=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "52502267465973@lid",
                fromMe: true,
                id: "A5815741DE7AC3A50C987EC57D8A9D50",
            },
            messageTimestamp: "1768840203",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "245474611183764@lid",
                fromMe: true,
                id: "A5F43E8424A0D31FF4CD581D4F741D1F",
            },
            messageTimestamp: "1768784406",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "264767604322319@lid",
                fromMe: false,
                id: "A52F6932F07FAD754E35ECB5A8392DD7",
            },
            message: {
                conversation: "Então tô vindo aqui pra fala da quele valor de 250 reais que a inda não chego até hoje",
                messageContextInfo: {
                    messageSecret: "uDEvpeQdXh+/TYaf/dGb/U6IHO5QggBbutEO1k8k7Wo=",
                },
            },
            messageTimestamp: "1768323381",
            messageSecret: "uDEvpeQdXh+/TYaf/dGb/U6IHO5QggBbutEO1k8k7Wo=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "264767604322319@lid",
                fromMe: true,
                id: "A5D20325E63F26FAB333710641912764",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "MG96RmZmuedhDbQK+mm6FL5QtohtrezE8q+0RELhxUQ=",
                },
            },
            messageTimestamp: "1768323347",
            status: "READ",
            userReceipt: [
                {
                    userJid: "264767604322319@lid",
                    receiptTimestamp: "0",
                    readTimestamp: "1768323348",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "MG96RmZmuedhDbQK+mm6FL5QtohtrezE8q+0RELhxUQ=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "264767604322319@lid",
                fromMe: false,
                id: "A51CA4015B37FBDCD3DA9A1B27410B4B",
            },
            message: {
                conversation: "Eae mano blz boa tarde  aqui e o Marcelo lembra",
                messageContextInfo: {
                    messageSecret: "x3LK1x2z6ewyWdcsTqQKloEEYLLpfWGEiYzS7YN7Fsk=",
                },
            },
            messageTimestamp: "1768323345",
            messageSecret: "x3LK1x2z6ewyWdcsTqQKloEEYLLpfWGEiYzS7YN7Fsk=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "264767604322319@lid",
                fromMe: true,
                id: "A5AE693FE22A2901AAFE0494535F7A63",
            },
            messageTimestamp: "1768323346",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "120117484601366@lid",
                fromMe: true,
                id: "A54CF3B8F3C12380EFF7D1CFEF00A989",
            },
            messageTimestamp: "1768080689",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "188180284313837@lid",
                fromMe: true,
                id: "A5ECE0B9D33CC5FBDCD275D46D1A5724",
            },
            message: {
                conversation: "Olá, obrigado por escolher a Taaqi!\n\nAcesse https://www.taaqi.com.br, para obter um suporte direto e especializado. \n\nCaso prefira ser atendido por aqui, por favor nos informe seu email e número utilizados para realizar o login.",
                messageContextInfo: {
                    messageSecret: "1IYKNuulE9nbYIDbtuP1bncYKVtBkGLsA6SkWnUeBDA=",
                },
            },
            messageTimestamp: "1767925175",
            status: "DELIVERY_ACK",
            messageC2STimestamp: "1767925176",
            userReceipt: [
                {
                    userJid: "188180284313837@lid",
                    receiptTimestamp: "1767925176",
                    readTimestamp: "0",
                    playedTimestamp: "0",
                },
            ],
            messageSecret: "1IYKNuulE9nbYIDbtuP1bncYKVtBkGLsA6SkWnUeBDA=",
            originalSelfAuthorUserJidString: "5511912258166@s.whatsapp.net",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "188180284313837@lid",
                fromMe: false,
                id: "6F3A3BF99FEA92FD53",
            },
            message: {
                placeholderMessage: {
                    type: "MASK_LINKED_DEVICES",
                },
            },
            messageTimestamp: "1767925175",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "188180284313837@lid",
                fromMe: true,
                id: "A592E78F7A74BE616A67D03BA6D68961",
            },
            messageTimestamp: "1767925175",
            status: "PENDING",
            messageStubType: "BIZ_PRIVACY_MODE_INIT_FB",
            isMentionedInStatus: false,
        },
    ],
    contacts: [
        {
            id: "status@broadcast",
        },
        {
            id: "26946725482604@lid",
        },
        {
            id: "5501937029221@lid",
        },
        {
            id: "67594228912250@lid",
        },
        {
            id: "271433678721164@lid",
        },
        {
            id: "81673165254762@lid",
        },
        {
            id: "94275169697921@lid",
        },
        {
            id: "279280768540790@lid",
        },
        {
            id: "201288004411451@lid",
        },
        {
            id: "93437181325427@lid",
        },
        {
            id: "245474611183764@lid",
        },
        {
            id: "120117484601366@lid",
        },
    ],
    syncType: 3,
    progress: 100,
    isLatest: false,
    peerDataRequestSessionId: null,
};
var full = {
    chats: [
        {
            participant: [],
            id: "268216513372411@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "268216513372411@lid",
                            fromMe: true,
                            id: "A5ADF58DC6B735F34760F1834EDEA7BF",
                        },
                        messageTimestamp: "1767763178",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "79843576266970@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "79843576266970@lid",
                            fromMe: true,
                            id: "A58266275C2CD50DA1F849EB46B360F0",
                        },
                        messageTimestamp: "1767413322",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "229080737775715@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "229080737775715@lid",
                            fromMe: true,
                            id: "A5D224728036FB7B33D8EC8064CCB2C4",
                        },
                        messageTimestamp: "1766607603",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "191469860221120@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "191469860221120@lid",
                            fromMe: true,
                            id: "A5F18307903BBD38CB0348E22741E6DF",
                        },
                        messageTimestamp: "1766214646",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "150083488210973@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "150083488210973@lid",
                            fromMe: true,
                            id: "A5286CAACDCFBC979547EE0F0212DDD9",
                        },
                        messageTimestamp: "1765614292",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "180594835226667@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "180594835226667@lid",
                            fromMe: true,
                            id: "A580913D94CFB8A3599D6CD0F173CD99",
                        },
                        messageTimestamp: "1764943023",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "213382682648806@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "213382682648806@lid",
                            fromMe: true,
                            id: "A5B1E66352D79E07CA9672AFC98A3518",
                        },
                        messageTimestamp: "1764364568",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "47618637992019@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "47618637992019@lid",
                            fromMe: true,
                            id: "A5B52E54663A90B0A93CBE25D91B43E5",
                        },
                        messageTimestamp: "1764205202",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "218828818653332@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "218828818653332@lid",
                            fromMe: true,
                            id: "A5BF27C3E6E5DADBE86F84CF5C2D9734",
                        },
                        messageTimestamp: "1764055604",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "38646820401270@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "38646820401270@lid",
                            fromMe: true,
                            id: "A59795335CE189932B490DA2230B6777",
                        },
                        messageTimestamp: "1764028743",
                        status: "PENDING",
                        messageStubType: "BLOCK_CONTACT",
                        messageStubParameters: ["true"],
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "277643916259510@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "277643916259510@lid",
                            fromMe: true,
                            id: "A5E48B216562F441E38AE0E5795E6C71",
                        },
                        messageTimestamp: "1763936083",
                        status: "PENDING",
                        messageStubType: "BLOCK_CONTACT",
                        messageStubParameters: ["true"],
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "134565687488735@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "134565687488735@lid",
                            fromMe: true,
                            id: "A53D04AEA0202C056582162D8393BD40",
                        },
                        messageTimestamp: "1763911393",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
        {
            participant: [],
            id: "158123650244827@lid",
            messages: [
                {
                    message: {
                        key: {
                            remoteJid: "158123650244827@lid",
                            fromMe: true,
                            id: "A539E6C2FA08DD611B5D1FA442BEF6AD",
                        },
                        messageTimestamp: "1763670186",
                        status: "PENDING",
                        messageStubType: "E2E_ENCRYPTED",
                        isMentionedInStatus: false,
                    },
                },
            ],
        },
    ],
    messages: [
        {
            key: {
                remoteJid: "268216513372411@lid",
                fromMe: true,
                id: "A5ADF58DC6B735F34760F1834EDEA7BF",
            },
            messageTimestamp: "1767763178",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "79843576266970@lid",
                fromMe: true,
                id: "A58266275C2CD50DA1F849EB46B360F0",
            },
            messageTimestamp: "1767413322",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "229080737775715@lid",
                fromMe: true,
                id: "A5D224728036FB7B33D8EC8064CCB2C4",
            },
            messageTimestamp: "1766607603",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "191469860221120@lid",
                fromMe: true,
                id: "A5F18307903BBD38CB0348E22741E6DF",
            },
            messageTimestamp: "1766214646",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "150083488210973@lid",
                fromMe: true,
                id: "A5286CAACDCFBC979547EE0F0212DDD9",
            },
            messageTimestamp: "1765614292",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "180594835226667@lid",
                fromMe: true,
                id: "A580913D94CFB8A3599D6CD0F173CD99",
            },
            messageTimestamp: "1764943023",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "213382682648806@lid",
                fromMe: true,
                id: "A5B1E66352D79E07CA9672AFC98A3518",
            },
            messageTimestamp: "1764364568",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "47618637992019@lid",
                fromMe: true,
                id: "A5B52E54663A90B0A93CBE25D91B43E5",
            },
            messageTimestamp: "1764205202",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "218828818653332@lid",
                fromMe: true,
                id: "A5BF27C3E6E5DADBE86F84CF5C2D9734",
            },
            messageTimestamp: "1764055604",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "38646820401270@lid",
                fromMe: true,
                id: "A59795335CE189932B490DA2230B6777",
            },
            messageTimestamp: "1764028743",
            status: "PENDING",
            messageStubType: "BLOCK_CONTACT",
            messageStubParameters: ["true"],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "38646820401270@lid",
                fromMe: true,
                id: "A5705BB5091EA46C3399250859BF5F0A",
            },
            messageTimestamp: "1764028743",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "277643916259510@lid",
                fromMe: true,
                id: "A5E48B216562F441E38AE0E5795E6C71",
            },
            messageTimestamp: "1763936083",
            status: "PENDING",
            messageStubType: "BLOCK_CONTACT",
            messageStubParameters: ["true"],
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "277643916259510@lid",
                fromMe: true,
                id: "A5A73AEC1E2705E093045EC07B99EF74",
            },
            messageTimestamp: "1763936083",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "134565687488735@lid",
                fromMe: true,
                id: "A53D04AEA0202C056582162D8393BD40",
            },
            messageTimestamp: "1763911393",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "0@s.whatsapp.net",
                fromMe: false,
                id: "2067761597375640-1",
            },
            message: {
                templateMessage: {
                    hydratedFourRowTemplate: {
                        videoMessage: {
                            mimetype: "video/mp4",
                            fileSha256: "Y5JwWF78+4crKVg+wN093uMtIlN7kINAuEZU0aQrlp4=",
                            fileLength: "15841531",
                            seconds: 21,
                            mediaKey: "DdEFrDGpkQ0q/SPr1ZjmGLjr8i068SMUQPylh+4GgIk=",
                            caption: "*Expert tips to boost clicks on your holiday ads* 💫\n\nUse these tips to create ads that stand out this holiday season:\n\n🎥 Make your ad mobile-first with vertical videos—keep them under 15 seconds\n\n🎁 Add a promotion to get customers chatting and shopping\n\n🗓️ Run ads at least 7 days before peak holiday demand to catch shoppers browsing early",
                            height: 1080,
                            width: 1080,
                            fileEncSha256: "lXliz8qk+lE8JjhYrDhv29L/sAZTOATT3nNWGwFiAsM=",
                            contextInfo: {
                                pairedMediaType: "NOT_PAIRED_MEDIA",
                            },
                            staticUrl: "https://static.whatsapp.net/downloadable?category=PSA&id=700544932198208173&num=31f74139-1876-41f2-9174-60d296c95441&_nc_cat=1",
                        },
                        hydratedContentText: "*Expert tips to boost clicks on your holiday ads* 💫\n\nUse these tips to create ads that stand out this holiday season:\n\n🎥 Make your ad mobile-first with vertical videos—keep them under 15 seconds\n\n🎁 Add a promotion to get customers chatting and shopping\n\n🗓️ Run ads at least 7 days before peak holiday demand to catch shoppers browsing early",
                        hydratedButtons: [
                            {
                                urlButton: {
                                    displayText: "Create an ad",
                                    url: "https://wa.me/biztab/advertise?wa_campaign_type=chat_psa",
                                },
                                index: 0,
                            },
                        ],
                    },
                    contextInfo: {},
                    hydratedTemplate: {
                        videoMessage: {
                            mimetype: "video/mp4",
                            fileSha256: "Y5JwWF78+4crKVg+wN093uMtIlN7kINAuEZU0aQrlp4=",
                            fileLength: "15841531",
                            seconds: 21,
                            mediaKey: "DdEFrDGpkQ0q/SPr1ZjmGLjr8i068SMUQPylh+4GgIk=",
                            caption: "*Expert tips to boost clicks on your holiday ads* 💫\n\nUse these tips to create ads that stand out this holiday season:\n\n🎥 Make your ad mobile-first with vertical videos—keep them under 15 seconds\n\n🎁 Add a promotion to get customers chatting and shopping\n\n🗓️ Run ads at least 7 days before peak holiday demand to catch shoppers browsing early",
                            height: 1080,
                            width: 1080,
                            fileEncSha256: "lXliz8qk+lE8JjhYrDhv29L/sAZTOATT3nNWGwFiAsM=",
                            contextInfo: {
                                pairedMediaType: "NOT_PAIRED_MEDIA",
                            },
                            staticUrl: "https://static.whatsapp.net/downloadable?category=PSA&id=700544932198208173&num=31f74139-1876-41f2-9174-60d296c95441&_nc_cat=1",
                        },
                        hydratedContentText: "*Expert tips to boost clicks on your holiday ads* 💫\n\nUse these tips to create ads that stand out this holiday season:\n\n🎥 Make your ad mobile-first with vertical videos—keep them under 15 seconds\n\n🎁 Add a promotion to get customers chatting and shopping\n\n🗓️ Run ads at least 7 days before peak holiday demand to catch shoppers browsing early",
                        hydratedButtons: [
                            {
                                urlButton: {
                                    displayText: "Create an ad",
                                    url: "https://wa.me/biztab/advertise?wa_campaign_type=chat_psa",
                                },
                                index: 0,
                            },
                        ],
                    },
                },
                messageContextInfo: {
                    messageSecret: "QVd8FOXtmwF69/vC0ShVg0lQzIdizY/Z2kVXs8xsV2A=",
                },
            },
            messageTimestamp: "1763833057",
            mediaData: {
                localPath: "Media/WhatsApp Business Video/Private/null-20251122-WA0000.mp4",
            },
            messageSecret: "QVd8FOXtmwF69/vC0ShVg0lQzIdizY/Z2kVXs8xsV2A=",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "0@s.whatsapp.net",
                fromMe: true,
                id: "A523F53A94244BBF6158645FF02DEBAB",
            },
            messageTimestamp: "1763833059",
            status: "PENDING",
            messageStubType: "CHAT_PSA",
            isMentionedInStatus: false,
        },
        {
            key: {
                remoteJid: "158123650244827@lid",
                fromMe: true,
                id: "A539E6C2FA08DD611B5D1FA442BEF6AD",
            },
            messageTimestamp: "1763670186",
            status: "PENDING",
            messageStubType: "E2E_ENCRYPTED",
            isMentionedInStatus: false,
        },
    ],
    contacts: [
        {
            id: "268216513372411@lid",
        },
        {
            id: "79843576266970@lid",
        },
        {
            id: "229080737775715@lid",
        },
        {
            id: "191469860221120@lid",
        },
        {
            id: "150083488210973@lid",
        },
        {
            id: "180594835226667@lid",
        },
        {
            id: "213382682648806@lid",
        },
        {
            id: "47618637992019@lid",
        },
        {
            id: "218828818653332@lid",
        },
        {
            id: "38646820401270@lid",
        },
        {
            id: "277643916259510@lid",
        },
        {
            id: "134565687488735@lid",
        },
        {
            id: "158123650244827@lid",
        },
    ],
    syncType: 2,
    progress: 100,
    isLatest: false,
    peerDataRequestSessionId: null,
};
/**
 * Fake trigger script for WhatsappEventProcessorService
 * Simulates a full sync lifecycle using the provided data constants.
 */
function simulateSync(processor, user) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // 1. INITIAL_BOOTSTRAP
                    // This triggers processChats and processContactsFromChats.
                    // Critical for mapping LID -> Phone Number.
                    console.log("Starting INITIAL_BOOTSTRAP sync...");
                    return [4 /*yield*/, processor.processHistorySync(user, {
                            chats: initialBootstrap.chats,
                            contacts: initialBootstrap.contacts,
                            messages: initialBootstrap.messages,
                            syncType: baileys_1.proto.HistorySync.HistorySyncType.INITIAL_BOOTSTRAP,
                        })];
                case 1:
                    _a.sent();
                    // 2. PUSH_NAME
                    // This triggers name gathering.
                    // Note: In your current code, this has a 5s setTimeout.
                    console.log("Starting PUSH_NAME sync...");
                    return [4 /*yield*/, processor.processHistorySync(user, {
                            chats: pushName.chats,
                            contacts: pushName.contacts,
                            messages: pushName.messages,
                            syncType: baileys_1.proto.HistorySync.HistorySyncType.PUSH_NAME,
                        })];
                case 2:
                    _a.sent();
                    // 3. RECENT
                    // Processing recent messages/status updates
                    console.log("Starting RECENT sync...");
                    return [4 /*yield*/, processor.processHistorySync(user, {
                            chats: recent.chats,
                            contacts: [],
                            messages: recent.messages,
                            syncType: baileys_1.proto.HistorySync.HistorySyncType.RECENT,
                        })];
                case 3:
                    _a.sent();
                    // 4. FULL
                    // The final sync of historical messages
                    console.log("Starting FULL sync...");
                    return [4 /*yield*/, processor.processHistorySync(user, {
                            chats: full.chats,
                            contacts: full.contacts,
                            messages: full.messages,
                            syncType: baileys_1.proto.HistorySync.HistorySyncType.FULL,
                        })];
                case 4:
                    _a.sent();
                    console.log("Fake sync simulation completed.");
                    return [2 /*return*/];
            }
        });
    });
}
simulateSync();
