/*
  Warnings:

  - A unique constraint covering the columns `[mail]` on the table `Allmails` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Allmails_mail_key" ON "Allmails"("mail");
