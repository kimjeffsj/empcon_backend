-- AddForeignKey
ALTER TABLE "PayCalculation" ADD CONSTRAINT "PayCalculation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
