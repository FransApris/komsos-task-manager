import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, where, handleFirestoreError, OperationType } from '../firebase';
import { UserAccount, Task, Inventory, MassSchedule, Notification, Badge, Attendance, Report, TaskType } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  users: UserAccount[];
  tasks: Task[];
  inventory: Inventory[];
  massSchedules: MassSchedule[];
  notifications: Notification[];
  badges: Badge[];
  attendances: Attendance[];
  reports: Report[];
  taskTypes: TaskType[];
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [massSchedules, setMassSchedules] = useState<MassSchedule[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !currentUser) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserAccount)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'users'));

    const unsubTasks = onSnapshot(query(collection(db, 'tasks'), orderBy('createdAt', 'desc')), (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'tasks'));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventory(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inventory)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'inventory'));

    const unsubMass = onSnapshot(query(collection(db, 'massSchedules'), orderBy('date', 'asc')), (snap) => {
      setMassSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MassSchedule)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'massSchedules'));

    const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role.startsWith('ADMIN_');
    const notifQuery = isAdmin 
      ? query(collection(db, 'notifications'), orderBy('createdAt', 'desc'))
      : query(
          collection(db, 'notifications'), 
          where('userId', 'in', [currentUser.id, 'ALL']),
          orderBy('createdAt', 'desc')
        );

    const unsubNotifs = onSnapshot(
      notifQuery, 
      (snap) => {
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)));
      }, 
      (error) => {
        if (error.code === 'permission-denied') {
          setNotifications([]);
        } else {
          handleFirestoreError(error, OperationType.GET, 'notifications');
        }
      }
    );

    const unsubBadges = onSnapshot(collection(db, 'badges'), (snap) => {
      setBadges(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Badge)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'badges'));

    const unsubAttendances = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance'));

    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    }, (error) => {
      // Reports might be restricted to admins, so we handle this gracefully
      if (error.code === 'permission-denied') {
        setReports([]);
      } else {
        handleFirestoreError(error, OperationType.GET, 'reports');
      }
    });

    const unsubTaskTypes = onSnapshot(query(collection(db, 'taskTypes'), orderBy('name', 'asc')), (snap) => {
      setTaskTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskType)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'taskTypes'));

    setLoading(false);

    return () => {
      unsubUsers();
      unsubTasks();
      unsubInventory();
      unsubMass();
      unsubNotifs();
      unsubBadges();
      unsubAttendances();
      unsubReports();
      unsubTaskTypes();
    };
  }, [currentUser, authLoading]);

  return (
    <DataContext.Provider value={{ 
      users, tasks, inventory, massSchedules, notifications, badges, attendances, reports, taskTypes, loading 
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
