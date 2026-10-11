import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Everything release 2.0.0 adds on top of 1.0.4: new tables, new columns
 * (nullable or with a default), indexes, foreign keys and a wider enum.
 * Nothing is dropped or rewritten.
 * Every step checks first, so a database that already has part of it (a run
 * that stopped halfway, MySQL does not roll back DDL) can run it again.
 */
export class Release2Schema1791676800001 implements MigrationInterface {
  name = "Release2Schema1791676800001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.createTableIfMissing(
      queryRunner,
      "property_hunts",
      "CREATE TABLE `property_hunts` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `customerId` varchar(255) NULL, `conversationId` varchar(255) NULL, `origin` enum ('manual', 'conversation', 'customer') NOT NULL, `request` text NOT NULL, `headline` varchar(255) NULL, `summary` text NULL, `criteria` json NOT NULL, `portals` json NOT NULL, `includeCatalog` tinyint NOT NULL DEFAULT 1, `status` enum ('queued', 'running', 'finished', 'failed', 'cancelled') NOT NULL DEFAULT 'queued', `progress` json NOT NULL, `catalogMatches` int NOT NULL DEFAULT '0', `portalMatches` int NOT NULL DEFAULT '0', `creditsCharged` int NOT NULL DEFAULT '0', `errorMessage` varchar(255) NULL, `startedAt` datetime NULL, `finishedAt` datetime NULL, INDEX `IDX_6b481a3eb5939412e2a2d7fb92` (`userId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "property_matches",
      "CREATE TABLE `property_matches` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `huntId` varchar(255) NULL, `customerId` varchar(255) NULL, `propertyId` varchar(255) NULL, `origin` enum ('portal', 'catalog', 'manual') NOT NULL, `portal` enum ('zap_imoveis', 'viva_real', 'quinto_andar', 'olx', 'chaves_na_mao', 'imovelweb') NULL, `externalUrl` varchar(1024) NULL, `title` varchar(255) NOT NULL, `listing` json NULL, `coverImageUrl` varchar(1024) NULL, `price` decimal(15,2) NULL, `score` int NOT NULL DEFAULT '0', `highlights` json NOT NULL, `warnings` json NOT NULL, `status` enum ('new', 'favorite', 'discarded', 'sent') NOT NULL DEFAULT 'new', `note` text NULL, INDEX `IDX_0431de1dedceed463dc0c135c0` (`huntId`, `score`), INDEX `IDX_048a13a0585fcdb8c8b6a948a8` (`userId`, `customerId`, `status`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "portal_accounts",
      "CREATE TABLE `portal_accounts` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NULL, `portal` enum ('zap_imoveis', 'viva_real', 'quinto_andar', 'olx', 'chaves_na_mao', 'imovelweb') NOT NULL, `login` varchar(255) NOT NULL, `passwordCipher` text NULL, `sessionCipher` longtext NULL, `status` enum ('unchecked', 'awaiting_code', 'connected', 'failed') NOT NULL DEFAULT 'unchecked', `statusMessage` varchar(255) NULL, `connectedAt` datetime NULL, `lastUsedAt` datetime NULL, INDEX `IDX_e5648e7b7524dc44c386941e99` (`userId`, `portal`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "whatsapp_connections",
      "CREATE TABLE `whatsapp_connections` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `instanceName` varchar(120) NOT NULL, `webhookToken` varchar(64) NOT NULL, `status` enum ('disconnected', 'connecting', 'connected') NOT NULL DEFAULT 'disconnected', `phone` varchar(30) NULL, `profileName` varchar(255) NULL, `profilePictureUrl` text NULL, `qrCode` mediumtext NULL, `pairingCode` varchar(20) NULL, `qrCodeUpdatedAt` datetime NULL, `connectedAt` datetime NULL, UNIQUE INDEX `IDX_f553bfa59a75598cff5d1e2980` (`instanceName`), UNIQUE INDEX `REL_6ccb61882381c98f4c97b0f634` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "conversations",
      "CREATE TABLE `conversations` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `customerId` varchar(255) NULL, `remoteJid` varchar(120) NOT NULL, `phone` varchar(30) NOT NULL, `contactName` varchar(255) NULL, `profilePictureUrl` text NULL, `lastMessagePreview` varchar(255) NULL, `lastMessageAt` datetime NULL, `lastMessageDirection` enum ('inbound', 'outbound') NULL, `unreadCount` int NOT NULL DEFAULT '0', `archived` tinyint NOT NULL DEFAULT 0, `hidden` tinyint NOT NULL DEFAULT 0, INDEX `IDX_67899bc4893583c7b9e581957c` (`userId`, `lastMessageAt`), UNIQUE INDEX `IDX_864839695cf492132dd3c47990` (`userId`, `remoteJid`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "messages",
      "CREATE TABLE `messages` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `conversationId` varchar(255) NOT NULL, `externalId` varchar(128) NULL, `direction` enum ('inbound', 'outbound') NOT NULL, `type` enum ('text', 'image', 'video', 'audio', 'voice', 'document', 'sticker', 'location', 'contact', 'unsupported') NOT NULL, `status` enum ('pending', 'sent', 'delivered', 'read', 'played', 'received', 'failed') NOT NULL, `body` text NULL, `mediaStatus` enum ('none', 'downloading', 'ready', 'failed') NOT NULL DEFAULT 'none', `s3Key` varchar(512) NULL, `mimeType` varchar(120) NULL, `fileName` varchar(255) NULL, `sizeBytes` bigint NULL, `durationSeconds` int NULL, `thumbnailBase64` text NULL, `location` json NULL, `quotedExternalId` varchar(128) NULL, `aiGenerated` tinyint NOT NULL DEFAULT 0, `presentationId` varchar(64) NULL, `propertyId` varchar(255) NULL, `errorMessage` varchar(255) NULL, `sentAt` datetime(3) NOT NULL, INDEX `IDX_e168ff662c97d4f861a6620919` (`conversationId`, `sentAt`), UNIQUE INDEX `IDX_ae49eb8dd7cc71a121d2e3d131` (`userId`, `externalId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "property_legal_profiles",
      "CREATE TABLE `property_legal_profiles` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `propertyId` varchar(255) NOT NULL, `city` varchar(120) NULL, `state` varchar(2) NULL, `registrationNumber` varchar(40) NULL, `registryOffice` varchar(160) NULL, `propertyTaxNumber` varchar(60) NULL, `unionPropertyNumber` varchar(30) NULL, `owners` json NOT NULL, UNIQUE INDEX `IDX_61fa431e5fc3e34c7a2d8a2b82` (`propertyId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "property_document_lookups",
      "CREATE TABLE `property_document_lookups` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `propertyId` varchar(255) NOT NULL, `lookupKey` varchar(60) NOT NULL, `ownerDocumentNumber` varchar(14) NULL, `status` enum ('found', 'not_found', 'failed') NOT NULL, `message` varchar(255) NOT NULL, `creditsCharged` int NOT NULL DEFAULT '0', `providerCostInBrl` decimal(10,4) NULL, `documentIds` json NOT NULL, INDEX `IDX_87aa35e5b90f3b6480e7626ef5` (`propertyId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "deal_checklist_items",
      "CREATE TABLE `deal_checklist_items` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `dealId` varchar(255) NOT NULL, `party` enum ('buyer', 'seller', 'property') NOT NULL, `title` varchar(255) NOT NULL, `description` varchar(500) NULL, `status` enum ('pending', 'submitted', 'approved', 'rejected', 'restricted') NOT NULL DEFAULT 'pending', `rejectionReason` varchar(500) NULL, `screening` tinyint NOT NULL DEFAULT 0, `requestedFromCustomer` tinyint NOT NULL DEFAULT 0, `sortOrder` int NOT NULL DEFAULT '0', `submittedAt` datetime NULL, `reviewedAt` datetime NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "deal_signers",
      "CREATE TABLE `deal_signers` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `dealId` varchar(255) NOT NULL, `partnerId` varchar(255) NULL, `name` varchar(255) NOT NULL, `email` varchar(255) NULL, `phone` varchar(20) NULL, `role` enum ('buyer', 'seller', 'broker', 'witness', 'partner') NOT NULL, `signingToken` varchar(64) NOT NULL, `status` enum ('pending', 'submitted', 'signed') NOT NULL DEFAULT 'pending', `method` enum ('electronic', 'govbr', 'manual') NULL, `signedAt` datetime NULL, `signedName` varchar(255) NULL, `signedDocumentNumber` varchar(14) NULL, `signedIp` varchar(64) NULL, `signedUserAgent` varchar(500) NULL, `signedContractSha256` varchar(64) NULL, `signedDocumentId` varchar(36) NULL, UNIQUE INDEX `IDX_d37053ef01a54f600804619578` (`signingToken`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "deal_milestones",
      "CREATE TABLE `deal_milestones` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `dealId` varchar(255) NOT NULL, `title` varchar(255) NOT NULL, `dueDate` date NULL, `completedAt` datetime NULL, `sortOrder` int NOT NULL DEFAULT '0', PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "deal_events",
      "CREATE TABLE `deal_events` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `dealId` varchar(255) NOT NULL, `kind` enum ('created', 'stage', 'proposal', 'document', 'contract', 'signature', 'milestone', 'message', 'partner', 'won', 'cancelled') NOT NULL, `actor` enum ('broker', 'customer', 'partner', 'system') NOT NULL, `message` varchar(1000) NOT NULL, `visibleToCustomer` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "deal_partners",
      "CREATE TABLE `deal_partners` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `dealId` varchar(255) NOT NULL, `customerId` varchar(255) NULL, `name` varchar(255) NOT NULL, `phone` varchar(20) NULL, `email` varchar(255) NULL, `creci` varchar(20) NULL, `commissionShare` decimal(5,2) NULL, `accessToken` varchar(64) NOT NULL, UNIQUE INDEX `IDX_716155ac07d2dc16b67d4d71af` (`accessToken`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "deals",
      "CREATE TABLE `deals` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `customerId` varchar(255) NOT NULL, `propertyId` varchar(255) NULL, `stage` enum ('proposal', 'documentation', 'contract', 'closing', 'completed') NOT NULL DEFAULT 'proposal', `status` enum ('open', 'won', 'cancelled') NOT NULL DEFAULT 'open', `offerAmount` decimal(15,2) NULL, `downPaymentAmount` decimal(15,2) NULL, `paymentMethod` enum ('cash', 'financing', 'consortium', 'installments') NULL, `usesFgts` tinyint NOT NULL DEFAULT 0, `sellerType` enum ('individual', 'company', 'estate') NOT NULL DEFAULT 'individual', `commissionPercentage` decimal(5,2) NULL, `notes` text NULL, `portalToken` varchar(64) NOT NULL, `portalEnabled` tinyint NOT NULL DEFAULT 1, `contractDocumentId` varchar(36) NULL, `contractSha256` varchar(64) NULL, `contractUploadedAt` datetime NULL, `closedAt` datetime NULL, `cancellationReason` varchar(500) NULL, UNIQUE INDEX `IDX_d29f3319674721b1aee01e8939` (`portalToken`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "credit_wallets",
      "CREATE TABLE `credit_wallets` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `balance` int NOT NULL DEFAULT '0', UNIQUE INDEX `REL_2a0bdee300eb8c2dbeb66649e1` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "credit_transactions",
      "CREATE TABLE `credit_transactions` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `kind` enum ('purchase', 'usage', 'bonus', 'grant', 'refund') NOT NULL, `amount` int NOT NULL, `balanceAfter` int NOT NULL, `description` varchar(255) NOT NULL, `feature` varchar(50) NULL, `model` varchar(100) NULL, `inputTokens` int NULL, `outputTokens` int NULL, `providerCostUsd` decimal(14,8) NULL, `referenceId` varchar(100) NULL, INDEX `IDX_28f100d7c002023f0a905fd4ec` (`userId`, `created_at`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "credit_purchases",
      "CREATE TABLE `credit_purchases` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `packageKey` varchar(50) NOT NULL, `credits` int NOT NULL, `amountInBrl` decimal(10,2) NOT NULL, `status` enum ('pending', 'paid', 'expired', 'failed') NOT NULL DEFAULT 'pending', `provider` varchar(30) NOT NULL, `providerPaymentId` varchar(100) NULL, `pixCode` text NULL, `pixQrCodeBase64` mediumtext NULL, `expiresAt` datetime NULL, `paidAt` datetime NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "assistant_messages",
      "CREATE TABLE `assistant_messages` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `chatId` varchar(255) NULL, `role` enum ('user', 'assistant') NOT NULL, `content` text NOT NULL, `fromVoice` tinyint NOT NULL DEFAULT 0, `creditsCharged` int NOT NULL DEFAULT '0', `references` json NULL, `attachments` json NULL, `sentAt` datetime(3) NOT NULL, INDEX `IDX_7aa3765d60addef66927b5816d` (`chatId`, `sentAt`), INDEX `IDX_0fb0429e2a66af18eaa706b0b1` (`userId`, `sentAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "assistant_chats",
      "CREATE TABLE `assistant_chats` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `title` varchar(120) NOT NULL, `lastMessageAt` datetime(3) NOT NULL, INDEX `IDX_882a69b2b074ef6c5ea4468f6a` (`userId`, `lastMessageAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
    await this.createTableIfMissing(
      queryRunner,
      "assistant_actions",
      "CREATE TABLE `assistant_actions` (`id` varchar(36) NOT NULL, `created_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updated_at` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), `active` tinyint NOT NULL DEFAULT 1, `userId` varchar(255) NOT NULL, `messageId` varchar(255) NULL, `kind` enum ('send_message', 'schedule_visit', 'add_note', 'move_stage', 'mark_lost') NOT NULL, `status` enum ('pending', 'running', 'done', 'failed', 'cancelled') NOT NULL DEFAULT 'pending', `title` varchar(255) NOT NULL, `payload` json NOT NULL, `errorMessage` varchar(255) NULL, `executedAt` datetime NULL, INDEX `IDX_6849ec2c362049583731e600ff` (`userId`, `messageId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await this.addColumnIfMissing(
      queryRunner,
      "customers",
      "avatar",
      "ALTER TABLE `customers` ADD `avatar` json NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "avatar",
      "ALTER TABLE `users` ADD `avatar` json NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "termsVersion",
      "ALTER TABLE `users` ADD `termsVersion` varchar(20) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "termsAcceptedAt",
      "ALTER TABLE `users` ADD `termsAcceptedAt` datetime NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "termsAcceptedIp",
      "ALTER TABLE `users` ADD `termsAcceptedIp` varchar(64) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "termsAcceptedUserAgent",
      "ALTER TABLE `users` ADD `termsAcceptedUserAgent` varchar(500) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "slug",
      "ALTER TABLE `users` ADD `slug` varchar(60) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "city",
      "ALTER TABLE `users` ADD `city` varchar(120) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "phone",
      "ALTER TABLE `users` ADD `phone` varchar(20) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "creci",
      "ALTER TABLE `users` ADD `creci` varchar(30) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "bio",
      "ALTER TABLE `users` ADD `bio` varchar(500) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "workingCities",
      "ALTER TABLE `users` ADD `workingCities` json NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "salesNiches",
      "ALTER TABLE `users` ADD `salesNiches` json NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "targetClienteles",
      "ALTER TABLE `users` ADD `targetClienteles` json NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "users",
      "aiMemory",
      "ALTER TABLE `users` ADD `aiMemory` text NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "properties",
      "kind",
      "ALTER TABLE `properties` ADD `kind` enum ('house', 'apartment', 'commercial', 'land') NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "properties",
      "sourcePortal",
      "ALTER TABLE `properties` ADD `sourcePortal` varchar(40) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "properties",
      "sourceUrl",
      "ALTER TABLE `properties` ADD `sourceUrl` varchar(1024) NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "properties",
      "showOnLanding",
      "ALTER TABLE `properties` ADD `showOnLanding` tinyint NOT NULL DEFAULT 0",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "properties",
      "sourceDetails",
      "ALTER TABLE `properties` ADD `sourceDetails` json NULL",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "property_media",
      "visibleToCustomer",
      "ALTER TABLE `property_media` ADD `visibleToCustomer` tinyint NOT NULL DEFAULT 1",
    );
    await this.addColumnIfMissing(
      queryRunner,
      "documents",
      "category",
      "ALTER TABLE `documents` ADD `category` varchar(64) NULL",
    );

    await this.addIndexIfMissing(
      queryRunner,
      "users",
      "IDX_bc0c27d77ee64f0a097a5c269b",
      "ALTER TABLE `users` ADD UNIQUE INDEX `IDX_bc0c27d77ee64f0a097a5c269b` (`slug`)",
    );

    /** Only appends values, so the rows already there keep theirs. */
    await queryRunner.query(
      "ALTER TABLE `documents` CHANGE `ownerType` `ownerType` enum ('customer', 'property', 'deal', 'deal_item', 'assistant') NOT NULL",
    );

    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_hunts",
      "FK_e988441fe110fbc8e2cb0582cdf",
      "ALTER TABLE `property_hunts` ADD CONSTRAINT `FK_e988441fe110fbc8e2cb0582cdf` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_hunts",
      "FK_9fc14651b40f2674d76baa65c0d",
      "ALTER TABLE `property_hunts` ADD CONSTRAINT `FK_9fc14651b40f2674d76baa65c0d` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_matches",
      "FK_9b767ea71fafd92a68686a5d458",
      "ALTER TABLE `property_matches` ADD CONSTRAINT `FK_9b767ea71fafd92a68686a5d458` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_matches",
      "FK_ff06582434832dc5968c834ab79",
      "ALTER TABLE `property_matches` ADD CONSTRAINT `FK_ff06582434832dc5968c834ab79` FOREIGN KEY (`huntId`) REFERENCES `property_hunts`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_matches",
      "FK_ce8eadbfa38d5b3bb8ee7843b8a",
      "ALTER TABLE `property_matches` ADD CONSTRAINT `FK_ce8eadbfa38d5b3bb8ee7843b8a` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_matches",
      "FK_17a9d3755e5febaedb1a02baaa5",
      "ALTER TABLE `property_matches` ADD CONSTRAINT `FK_17a9d3755e5febaedb1a02baaa5` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "portal_accounts",
      "FK_82bfa6bec37a6a5c7044c9e8e3d",
      "ALTER TABLE `portal_accounts` ADD CONSTRAINT `FK_82bfa6bec37a6a5c7044c9e8e3d` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "whatsapp_connections",
      "FK_6ccb61882381c98f4c97b0f6342",
      "ALTER TABLE `whatsapp_connections` ADD CONSTRAINT `FK_6ccb61882381c98f4c97b0f6342` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "conversations",
      "FK_a9b3b5d51da1c75242055338b59",
      "ALTER TABLE `conversations` ADD CONSTRAINT `FK_a9b3b5d51da1c75242055338b59` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "conversations",
      "FK_5a4866f304edf4591ad785d34a4",
      "ALTER TABLE `conversations` ADD CONSTRAINT `FK_5a4866f304edf4591ad785d34a4` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "messages",
      "FK_4838cd4fc48a6ff2d4aa01aa646",
      "ALTER TABLE `messages` ADD CONSTRAINT `FK_4838cd4fc48a6ff2d4aa01aa646` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "messages",
      "FK_e5663ce0c730b2de83445e2fd19",
      "ALTER TABLE `messages` ADD CONSTRAINT `FK_e5663ce0c730b2de83445e2fd19` FOREIGN KEY (`conversationId`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_legal_profiles",
      "FK_6f86c525f9614025f6d13af69cc",
      "ALTER TABLE `property_legal_profiles` ADD CONSTRAINT `FK_6f86c525f9614025f6d13af69cc` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_legal_profiles",
      "FK_61fa431e5fc3e34c7a2d8a2b82f",
      "ALTER TABLE `property_legal_profiles` ADD CONSTRAINT `FK_61fa431e5fc3e34c7a2d8a2b82f` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "property_document_lookups",
      "FK_785e583152f0dc5040e766d8656",
      "ALTER TABLE `property_document_lookups` ADD CONSTRAINT `FK_785e583152f0dc5040e766d8656` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deal_checklist_items",
      "FK_c466cda8a0a18d2564d069afdcb",
      "ALTER TABLE `deal_checklist_items` ADD CONSTRAINT `FK_c466cda8a0a18d2564d069afdcb` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deal_signers",
      "FK_7383bbc6508a8c281c597654aef",
      "ALTER TABLE `deal_signers` ADD CONSTRAINT `FK_7383bbc6508a8c281c597654aef` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deal_milestones",
      "FK_13fb3707111f4fdbb68b5ee158c",
      "ALTER TABLE `deal_milestones` ADD CONSTRAINT `FK_13fb3707111f4fdbb68b5ee158c` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deal_events",
      "FK_31ee63a41a4aebbe93fd77e74b5",
      "ALTER TABLE `deal_events` ADD CONSTRAINT `FK_31ee63a41a4aebbe93fd77e74b5` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deal_partners",
      "FK_abdd8860f78bc56541e0f788196",
      "ALTER TABLE `deal_partners` ADD CONSTRAINT `FK_abdd8860f78bc56541e0f788196` FOREIGN KEY (`dealId`) REFERENCES `deals`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deal_partners",
      "FK_4891f49895689cbb31e2f0ce858",
      "ALTER TABLE `deal_partners` ADD CONSTRAINT `FK_4891f49895689cbb31e2f0ce858` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deals",
      "FK_2ab80c329115e938c396ed5d418",
      "ALTER TABLE `deals` ADD CONSTRAINT `FK_2ab80c329115e938c396ed5d418` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deals",
      "FK_e39412ed3656c8984363c21f561",
      "ALTER TABLE `deals` ADD CONSTRAINT `FK_e39412ed3656c8984363c21f561` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "deals",
      "FK_519428c5581e24fc0b8432fceee",
      "ALTER TABLE `deals` ADD CONSTRAINT `FK_519428c5581e24fc0b8432fceee` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "credit_wallets",
      "FK_2a0bdee300eb8c2dbeb66649e13",
      "ALTER TABLE `credit_wallets` ADD CONSTRAINT `FK_2a0bdee300eb8c2dbeb66649e13` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "credit_transactions",
      "FK_2121be176f72337ccf7cc4ef04e",
      "ALTER TABLE `credit_transactions` ADD CONSTRAINT `FK_2121be176f72337ccf7cc4ef04e` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "credit_purchases",
      "FK_38b14a50c0e054ca91137c123fc",
      "ALTER TABLE `credit_purchases` ADD CONSTRAINT `FK_38b14a50c0e054ca91137c123fc` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "assistant_messages",
      "FK_67fe0c1a32333707d64ee55398d",
      "ALTER TABLE `assistant_messages` ADD CONSTRAINT `FK_67fe0c1a32333707d64ee55398d` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "assistant_chats",
      "FK_756c2fb9f1196674442bf0911c7",
      "ALTER TABLE `assistant_chats` ADD CONSTRAINT `FK_756c2fb9f1196674442bf0911c7` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
    await this.addForeignKeyIfMissing(
      queryRunner,
      "assistant_actions",
      "FK_c5b95c13018c09f21305a6e9ea7",
      "ALTER TABLE `assistant_actions` ADD CONSTRAINT `FK_c5b95c13018c09f21305a6e9ea7` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "assistant_actions",
      "FK_c5b95c13018c09f21305a6e9ea7",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "assistant_chats",
      "FK_756c2fb9f1196674442bf0911c7",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "assistant_messages",
      "FK_67fe0c1a32333707d64ee55398d",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "credit_purchases",
      "FK_38b14a50c0e054ca91137c123fc",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "credit_transactions",
      "FK_2121be176f72337ccf7cc4ef04e",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "credit_wallets",
      "FK_2a0bdee300eb8c2dbeb66649e13",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deals",
      "FK_519428c5581e24fc0b8432fceee",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deals",
      "FK_e39412ed3656c8984363c21f561",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deals",
      "FK_2ab80c329115e938c396ed5d418",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deal_partners",
      "FK_4891f49895689cbb31e2f0ce858",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deal_partners",
      "FK_abdd8860f78bc56541e0f788196",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deal_events",
      "FK_31ee63a41a4aebbe93fd77e74b5",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deal_milestones",
      "FK_13fb3707111f4fdbb68b5ee158c",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deal_signers",
      "FK_7383bbc6508a8c281c597654aef",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "deal_checklist_items",
      "FK_c466cda8a0a18d2564d069afdcb",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_document_lookups",
      "FK_785e583152f0dc5040e766d8656",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_legal_profiles",
      "FK_61fa431e5fc3e34c7a2d8a2b82f",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_legal_profiles",
      "FK_6f86c525f9614025f6d13af69cc",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "messages",
      "FK_e5663ce0c730b2de83445e2fd19",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "messages",
      "FK_4838cd4fc48a6ff2d4aa01aa646",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "conversations",
      "FK_5a4866f304edf4591ad785d34a4",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "conversations",
      "FK_a9b3b5d51da1c75242055338b59",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "whatsapp_connections",
      "FK_6ccb61882381c98f4c97b0f6342",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "portal_accounts",
      "FK_82bfa6bec37a6a5c7044c9e8e3d",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_matches",
      "FK_17a9d3755e5febaedb1a02baaa5",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_matches",
      "FK_ce8eadbfa38d5b3bb8ee7843b8a",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_matches",
      "FK_ff06582434832dc5968c834ab79",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_matches",
      "FK_9b767ea71fafd92a68686a5d458",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_hunts",
      "FK_9fc14651b40f2674d76baa65c0d",
    );
    await this.dropForeignKeyIfPresent(
      queryRunner,
      "property_hunts",
      "FK_e988441fe110fbc8e2cb0582cdf",
    );

    /** Fails while documents still point to the new owner types, on purpose. */
    await queryRunner.query(
      "ALTER TABLE `documents` CHANGE `ownerType` `ownerType` enum ('customer', 'property') NOT NULL",
    );

    await this.dropIndexIfPresent(
      queryRunner,
      "users",
      "IDX_bc0c27d77ee64f0a097a5c269b",
    );

    await this.dropColumnIfPresent(queryRunner, "documents", "category");
    await this.dropColumnIfPresent(
      queryRunner,
      "property_media",
      "visibleToCustomer",
    );
    await this.dropColumnIfPresent(queryRunner, "properties", "sourceDetails");
    await this.dropColumnIfPresent(queryRunner, "properties", "showOnLanding");
    await this.dropColumnIfPresent(queryRunner, "properties", "sourceUrl");
    await this.dropColumnIfPresent(queryRunner, "properties", "sourcePortal");
    await this.dropColumnIfPresent(queryRunner, "properties", "kind");
    await this.dropColumnIfPresent(queryRunner, "users", "aiMemory");
    await this.dropColumnIfPresent(queryRunner, "users", "targetClienteles");
    await this.dropColumnIfPresent(queryRunner, "users", "salesNiches");
    await this.dropColumnIfPresent(queryRunner, "users", "workingCities");
    await this.dropColumnIfPresent(queryRunner, "users", "bio");
    await this.dropColumnIfPresent(queryRunner, "users", "creci");
    await this.dropColumnIfPresent(queryRunner, "users", "phone");
    await this.dropColumnIfPresent(queryRunner, "users", "city");
    await this.dropColumnIfPresent(queryRunner, "users", "slug");
    await this.dropColumnIfPresent(
      queryRunner,
      "users",
      "termsAcceptedUserAgent",
    );
    await this.dropColumnIfPresent(queryRunner, "users", "termsAcceptedIp");
    await this.dropColumnIfPresent(queryRunner, "users", "termsAcceptedAt");
    await this.dropColumnIfPresent(queryRunner, "users", "termsVersion");
    await this.dropColumnIfPresent(queryRunner, "users", "avatar");
    await this.dropColumnIfPresent(queryRunner, "customers", "avatar");

    await this.dropTableIfPresent(queryRunner, "assistant_actions");
    await this.dropTableIfPresent(queryRunner, "assistant_chats");
    await this.dropTableIfPresent(queryRunner, "assistant_messages");
    await this.dropTableIfPresent(queryRunner, "credit_purchases");
    await this.dropTableIfPresent(queryRunner, "credit_transactions");
    await this.dropTableIfPresent(queryRunner, "credit_wallets");
    await this.dropTableIfPresent(queryRunner, "deals");
    await this.dropTableIfPresent(queryRunner, "deal_partners");
    await this.dropTableIfPresent(queryRunner, "deal_events");
    await this.dropTableIfPresent(queryRunner, "deal_milestones");
    await this.dropTableIfPresent(queryRunner, "deal_signers");
    await this.dropTableIfPresent(queryRunner, "deal_checklist_items");
    await this.dropTableIfPresent(queryRunner, "property_document_lookups");
    await this.dropTableIfPresent(queryRunner, "property_legal_profiles");
    await this.dropTableIfPresent(queryRunner, "messages");
    await this.dropTableIfPresent(queryRunner, "conversations");
    await this.dropTableIfPresent(queryRunner, "whatsapp_connections");
    await this.dropTableIfPresent(queryRunner, "portal_accounts");
    await this.dropTableIfPresent(queryRunner, "property_matches");
    await this.dropTableIfPresent(queryRunner, "property_hunts");
  }

  private async createTableIfMissing(
    queryRunner: QueryRunner,
    table: string,
    sql: string,
  ) {
    if (await queryRunner.hasTable(table)) return;
    await queryRunner.query(sql);
  }

  private async addColumnIfMissing(
    queryRunner: QueryRunner,
    table: string,
    column: string,
    sql: string,
  ) {
    if (await queryRunner.hasColumn(table, column)) return;
    await queryRunner.query(sql);
  }

  private async addIndexIfMissing(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    sql: string,
  ) {
    if (await this.hasIndex(queryRunner, table, name)) return;
    await queryRunner.query(sql);
  }

  private async dropIndexIfPresent(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ) {
    if (!(await this.hasIndex(queryRunner, table, name))) return;
    await queryRunner.query(`ALTER TABLE \`${table}\` DROP INDEX \`${name}\``);
  }

  private async hasIndex(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ) {
    const rows = (await queryRunner.query(
      "SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1",
      [table, name],
    )) as unknown[];
    return rows.length > 0;
  }

  private async addForeignKeyIfMissing(
    queryRunner: QueryRunner,
    table: string,
    name: string,
    sql: string,
  ) {
    if (await this.hasForeignKey(queryRunner, table, name)) return;
    await queryRunner.query(sql);
  }

  private async dropForeignKeyIfPresent(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ) {
    if (!(await this.hasForeignKey(queryRunner, table, name))) return;
    await queryRunner.query(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${name}\``,
    );
  }

  private async dropColumnIfPresent(
    queryRunner: QueryRunner,
    table: string,
    column: string,
  ) {
    if (!(await queryRunner.hasColumn(table, column))) return;
    await queryRunner.query(
      `ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``,
    );
  }

  private async dropTableIfPresent(queryRunner: QueryRunner, table: string) {
    if (!(await queryRunner.hasTable(table))) return;
    await queryRunner.query(`DROP TABLE \`${table}\``);
  }

  private async hasForeignKey(
    queryRunner: QueryRunner,
    table: string,
    name: string,
  ) {
    const rows = (await queryRunner.query(
      "SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = ? AND CONSTRAINT_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'",
      [table, name],
    )) as unknown[];
    return rows.length > 0;
  }
}
