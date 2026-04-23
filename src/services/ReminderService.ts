import { 
  db, collection, addDoc, serverTimestamp, 
  query, where, getDocs, OperationType, handleFirestoreError 
} from '../firebase';
import { Task, UserAccount, Notification, Attendance } from '../types';
import { format, addDays, isSameDay, parseISO, isAfter, subMinutes, parse } from 'date-fns';

export class ReminderService {
  /**
   * Check for H-1 reminders for the current user
   */
  static async checkH1Reminders(currentUser: UserAccount, tasks: Task[], notifications: Notification[]) {
    if (!currentUser || !tasks.length) return;

    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');

    // Filter tasks for tomorrow assigned to current user
    const tomorrowTasks = tasks.filter(task => 
      task.date === tomorrowStr && 
      task.assignedUsers?.includes(currentUser.uid || currentUser.id) &&
      task.status !== 'COMPLETED'
    );

    for (const task of tomorrowTasks) {
      const reminderType = `H1_${task.id}`;
      
      // Check if notification already exists
      const alreadyNotified = notifications.some(n => n.type === reminderType);

      if (!alreadyNotified) {
        try {
          await addDoc(collection(db, 'notifications'), {
            userId: currentUser.uid || currentUser.id,
            title: '📅 Pengingat H-1 Tugas',
            message: `Besok Anda memiliki tugas "${task.title}" pada pukul ${task.time}. Jangan lupa bersiap!`,
            read: false,
            type: reminderType,
            createdAt: serverTimestamp()
          });
          console.log(`H-1 Reminder sent for task: ${task.id}`);
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'notifications');
        }
      }
    }
  }

  /**
   * Check for attendance reminders
   * If user is assigned to a task today, and it's past start time but no attendance record
   */
  static async checkAttendanceReminders(
    currentUser: UserAccount, 
    tasks: Task[], 
    notifications: Notification[],
    attendances: Attendance[]
  ) {
    if (!currentUser || !tasks.length) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();

    // Filter tasks for today assigned to current user
    const todayTasks = tasks.filter(task => 
      task.date === todayStr && 
      task.assignedUsers?.includes(currentUser.uid || currentUser.id) &&
      task.status !== 'COMPLETED'
    );

    for (const task of todayTasks) {
      const reminderType = `ATTENDANCE_${task.id}`;
      
      // Extract start time from "HH:mm - HH:mm" or just "HH:mm"
      const startTimeStr = task.time.split(' - ')[0];
      
      try {
        const taskTime = parse(startTimeStr, 'HH:mm', new Date());
        
        // If it's 5 minutes before or after start time
        const startTime = subMinutes(taskTime, 5);
        
        // Check if we are in the reminder window (e.g., from 5 mins before until 30 mins after)
        const isTimeForReminder = isAfter(now, startTime);

        if (isTimeForReminder) {
          // Check if user already checked in
          const hasCheckedIn = attendances.some(a => 
            a.targetId === task.id && 
            a.userId === (currentUser.uid || currentUser.id) && 
            a.targetType === 'TASK'
          );

          if (!hasCheckedIn) {
            // Check if notification already exists
            const alreadyNotified = notifications.some(n => n.type === reminderType);

            if (!alreadyNotified) {
              await addDoc(collection(db, 'notifications'), {
                userId: currentUser.uid || currentUser.id,
                title: '📍 Pengingat Presensi',
                message: `Tugas "${task.title}" sudah dimulai atau akan segera dimulai. Silakan lakukan presensi sekarang!`,
                read: false,
                type: reminderType,
                createdAt: serverTimestamp()
              });
              console.log(`Attendance Reminder sent for task: ${task.id}`);
            }
          }
        }
      } catch (e) {
        console.error("Error parsing task time:", task.time, e);
      }
    }
  }
}
