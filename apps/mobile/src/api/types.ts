export interface MeResponse {
  email: string;
  display_name: string;
  role_label: string;
  is_hr_admin: boolean;
  is_manager: boolean;
  workspace: string;
  tenant_name: string;
  employee: {
    id: number;
    full_name: string;
    employee_code: string;
    department: string | null;
  } | null;
}

export interface PunchToday {
  today: string;
  logs: { log_type: string; log_time: string; is_within_fence: boolean | null }[];
  status: string | null;
  working_minutes: number;
}

export interface LeaveBalance {
  leave_type_id: number;
  leave_type: string;
  code: string;
  available: number;
  used: number;
}

export interface LeaveRequest {
  id: number;
  leave_type: string;
  leave_type_code: string;
  from_date: string;
  to_date: string;
  total_days: number;
  half_day_type: string;
  status: string;
  reason: string;
  applied_at: string | null;
  employee_name?: string;
}

export interface PayslipItem {
  id: number;
  year: number;
  month: number;
  label: string;
  net_pay: number | null;
}

export interface NotificationItem {
  id: number;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}
