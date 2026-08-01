-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('ALL', 'BORROWERS', 'REALTORS');

-- CreateEnum
CREATE TYPE "ScheduledBroadcastStatus" AS ENUM ('PENDING', 'SENT', 'CANCELLED');

-- CreateTable
CREATE TABLE "scheduled_broadcasts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" "BroadcastAudience" NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" "ScheduledBroadcastStatus" NOT NULL DEFAULT 'PENDING',
    "recipients" INTEGER,
    "delivered" INTEGER,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_broadcasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "scheduled_broadcasts_status_sendAt_idx" ON "scheduled_broadcasts"("status", "sendAt");
