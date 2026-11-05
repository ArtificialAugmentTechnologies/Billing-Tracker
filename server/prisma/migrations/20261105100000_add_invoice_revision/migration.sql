-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "revisionOfId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_revisionOfId_key" ON "Invoice"("revisionOfId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_revisionOfId_fkey" FOREIGN KEY ("revisionOfId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
