export type Screen = 'SPLASH' | 'LOGIN' | 'REGISTER' | 'USER_DASHBOARD' | 'ADMIN_DASHBOARD' | 'TASK_DETAIL' | 'TASK_UPDATE' | 'NOTIFICATIONS' | 'PROFILE' | 'TASKS' | 'TEAM' | 'SCHEDULE' | 'EDIT_PROFILE' | 'NOTIFICATION_SETTINGS' | 'PERFORMANCE_STATS' | 'APP_SETTINGS' | 'CHANGE_PASSWORD' | 'HELP_CENTER' | 'LIVE_CHAT' | 'EMAIL_SUPPORT' | 'CREATE_TASK' | 'INVENTORY' | 'MASS_SCHEDULE' | 'ATTENDANCE' | 'REPORTS' | 'ADMIN_DATA_MANAGEMENT' | 'TASK_TYPE_MANAGEMENT' | 'USER_VERIFICATION' | 'VCAST_MANAGER';

export type Role = 'SUPERADMIN' | 'ADMIN_MULTIMEDIA' | 'ADMIN_PHOTO_VIDEO' | 'ADMIN_PUBLICATION' | 'USER' | null;

export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'AWAY';

export interface PortfolioLink {
  platform: string;
  url: string;
}

export interface UserAccount {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  img: string;
  password?: string;
  uid?: string;
  createdAt?: any;
  points?: number;
  level?: number;
  completedTasksCount?: number;
  status?: 'PENDING' | 'ACTIVE' | 'REJECTED';
  xp?: number;
  skills?: string[];
  availability?: AvailabilityStatus;
  portfolioLinks?: PortfolioLink[];
  quickNotes?: string;
  bio?: string;
  streak?: {
    current: number;
    lastActivity: string;
    longest: number;
  };
  stats?: {
    photography: number;
    videography: number;
    writing: number;
    design: number;
  };
  notificationPrefs?: {
    taskUpdates: boolean;
    chatMessages: boolean;
    massSchedule: boolean;
    systemAlerts: boolean;
  };
}

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  date: string;
  time: string;
  location?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_VERIFICATION' | 'COMPLETED';
  assignedUsers?: string[];
  teamLeaderId?: string;
  requiredEquipment?: string[];
  subTasks?: SubTask[];
  createdBy: string;
  createdAt: any;
  resultLink?: string;
  feedback?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  isRead?: boolean; // For backward compatibility with some screens
  type?: string;
  date?: string;
  time?: string;
  createdAt: any;
}

export interface ChatMessage {
  id: string;
  taskId: string;
  senderId: string;
  senderName?: string;
  text: string;
  image?: string;
  createdAt: any;
}

export interface Inventory {
  id: string;
  name: string;
  category: string;
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'BROKEN';
  assignedTo?: string;
  lastChecked?: any;
}

export interface MassSchedule {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  status: 'OPEN' | 'CLOSED';
  assignedUsers: string[];
  createdBy: string;
  createdAt: any;
}

export interface Attendance {
  id: string;
  targetId: string; // taskId or massId
  targetType: 'TASK' | 'MASS';
  userId: string;
  checkInTime: any;
  status: 'PRESENT' | 'LATE' | 'ABSENT';
}

export interface Report {
  id: string;
  title: string;
  period: string; // e.g., "2026-03"
  summary: string;
  stats: {
    totalTasks: number;
    completedTasks: number;
    activeUsers: number;
  };
  generatedBy: string;
  createdAt: any;
}

export interface TaskType {
  id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: any;
}

export interface Badge {
  id: string;
  userId: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  approvals: number;
  requiredApprovals: number;
  status: 'earned' | 'pending';
  approvedBy: string[];
}
