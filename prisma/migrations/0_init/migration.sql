-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STANDARD', 'HELPDESK', 'ADMIN');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('NUOVO', 'IN_VALUTAZIONE', 'RISOLTO', 'CHIUSO', 'NON_RISOLVIBILE', 'ANNULLATO');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('BASSA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TicketCategory" AS ENUM ('TMS', 'WMS', 'AMMINISTRATIVO', 'ALTRO');

-- CreateEnum
CREATE TYPE "TicketOrigin" AS ENUM ('PORTALE', 'EMAIL');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('INTERNAL_NOTE', 'USER_COMMUNICATION');

-- CreateEnum
CREATE TYPE "StartupStatus" AS ENUM ('NUOVO', 'IN_LAVORAZIONE', 'CONCLUSO');

-- CreateEnum
CREATE TYPE "SubactivityStatus" AS ENUM ('DA_FARE', 'IN_CORSO', 'COMPLETATA');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STANDARD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'NUOVO',
    "priority" "TicketPriority" NOT NULL DEFAULT 'BASSA',
    "category" "TicketCategory" NOT NULL DEFAULT 'ALTRO',
    "origin" "TicketOrigin" NOT NULL DEFAULT 'PORTALE',
    "contact" TEXT NOT NULL,
    "targetCloseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "creatorId" TEXT,
    "operatorId" TEXT,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "senderId" TEXT,
    "senderEmail" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'USER_COMMUNICATION',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticketId" TEXT,
    "messageId" TEXT,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_activities" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "clientProject" TEXT,
    "startDate" TIMESTAMP(3),
    "targetCompleteDate" TIMESTAMP(3),
    "status" "StartupStatus" NOT NULL DEFAULT 'NUOVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "startup_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "startup_subactivities" (
    "id" TEXT NOT NULL,
    "startupActivityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "responsibleId" TEXT,
    "status" "SubactivityStatus" NOT NULL DEFAULT 'DA_FARE',
    "progressNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "startup_subactivities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticketNumber_key" ON "tickets"("ticketNumber");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_ticketId_fkey" FOREIGN KEY ("attachments_ticketId_fkey") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_subactivities" ADD CONSTRAINT "startup_subactivities_startupActivityId_fkey" FOREIGN KEY ("startupActivityId") REFERENCES "startup_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "startup_subactivities" ADD CONSTRAINT "startup_subactivities_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
