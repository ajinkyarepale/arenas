-- Liquidity bots.
--
-- Bots are ordinary users that trade through the same engine as people; the
-- flag exists so the prize leaderboard can exclude them and so the organizer
-- can see at a glance who is who.

ALTER TABLE "User" ADD COLUMN "isBot" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "botPersona" TEXT;

CREATE INDEX "User_isBot_idx" ON "User"("isBot");

ALTER TABLE "Event" ADD COLUMN "botsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Event" ADD COLUMN "botIntensity" DOUBLE PRECISION NOT NULL DEFAULT 1;
