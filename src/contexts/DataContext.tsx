import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, collection, onSnapshot, query, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { MassSchedule, Attendance, Report, TaskType } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  massSchedules: MassSchedule[];
  attendances: Attendance[];
  reports: Report[];
  taskTypes: TaskType[];
  loading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [massSchedules, setMassSchedules] = useState<MassSchedule[]>([]);
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

    const unsubMass = onSnapshot(query(collection(db, 'massSchedules'), orderBy('date', 'asc')), (snap) => {
      setMassSchedules(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MassSchedule)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'massSchedules', currentUser));

    const unsubAttendances = onSnapshot(collection(db, 'attendance'), (snap) => {
      setAttendances(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendance)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'attendance', currentUser));

    const unsubReports = onSnapshot(query(collection(db, 'reports'), orderBy('createdAt', 'desc')), (snap) => {
      setReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
    }, (error) => {
      if (error.code === 'permission-denied') {
        setReports([]);
      } else {
        handleFirestoreError(error, OperationType.GET, 'reports', currentUser);
      }
    });

    const unsubTaskTypes = onSnapshot(query(collection(db, 'taskTypes'), orderBy('name', 'asc')), (snap) => {
      setTaskTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskType)));
    }, (error) => handleFirestoreError(error, OperationType.GET, 'taskTypes', currentUser));

    setLoading(false);

    return () => {
      unsubMass();
      unsubAttendances();
      unsubReports();
      unsubTaskTypes();
    };
  }, [currentUser, authLoading]);

  return (
    <DataContext.Provider value={{ massSchedules, attendances, reports, taskTypes, loading }}>
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
