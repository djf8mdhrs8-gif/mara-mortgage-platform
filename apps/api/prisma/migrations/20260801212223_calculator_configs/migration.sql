-- CreateTable
CREATE TABLE "calculator_configs" (
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "data" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calculator_configs_pkey" PRIMARY KEY ("key")
);
