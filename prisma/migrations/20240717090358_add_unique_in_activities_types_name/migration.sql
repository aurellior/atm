/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `activities_types` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "activities_types_name_key" ON "activities_types"("name");
