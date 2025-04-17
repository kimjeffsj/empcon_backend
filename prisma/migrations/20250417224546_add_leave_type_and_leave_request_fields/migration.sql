-- AlterTable
ALTER TABLE "LeaveRequest" ADD COLUMN     "halfDay" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "LeaveType" ADD COLUMN     "allowsCarryOver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowsPayout" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "defaultDays" DOUBLE PRECISION,
ADD COLUMN     "requiresBalance" BOOLEAN NOT NULL DEFAULT true;
