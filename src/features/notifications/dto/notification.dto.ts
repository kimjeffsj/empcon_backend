import {
  PaginatedResponse,
  PaginationQueryParams,
} from "@/common/dto/common.dto";
import { NotificationType } from "@prisma/client";

export interface NotificationDto {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  relatedId?: string;
  sendEmail?: boolean;
  priority?: "low" | "normal" | "high";
}

export interface NotificationQueryParams extends PaginationQueryParams {
  unreadOnly?: string;
  type?: NotificationType;
  startDate?: string;
  endDate?: string;
}

export type PaginatedNotificationsResponse = PaginatedResponse<NotificationDto>;
