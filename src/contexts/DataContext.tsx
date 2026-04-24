import React, { createContext, useContext } from 'react';
import { db, collection, query, orderBy, handleFirestoreError, OperationType } from '../firebase';
import { MassSchedule, Attendance, Report, TaskType } from '../types';
import { useAuth } from './AuthContext';
import { useFirestoreQuery } from '../lib/useFirestoreQuery';

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
  const enabled = !authLoading && !!currentUser;

  const { data: massSchedules = [], isLoading: msLoading } = useFirestoreQuery<MassSchedule>(
    ['massSchedules'],
    () => query(collection(db, 'massSchedules'), orderBy('date', 'asc')),
    (d) => d as MassSchedule,
    [enabled],
    {
      enabled,
      onError: (err) => handleFirestoreError(err, OperationType.GET, 'massSchedules', currentUser),
    }
  );

  const { data: attendances = [], isLoading: attLoading } = useFirestoreQuery<Attendance>(
    ['attendances'],
    () => collection(db, 'attendance') as any,
    (d) => d as Attendance,
    [enabled],
    {
      enabled,
      onError: (err) => handleFirestoreError(err, OperationType.GET, 'attendance', currentUser),
    }
  );

  const { data: reports = [], isLoading: repLoading } = useFirestoreQuery<Report>(
    ['reports'],
    () => query(collection(db, 'reports'), orderBy('createdAt', 'desc')),
    (d) => d as Report,
    [enabled],
    {
      enabled,
      onError: (err) => {
        if ((err as any)?.code !== 'permission-denied') {
          handleFirestoreError(err, OperationType.GET, 'reports', currentUser);
        }
      },
    }
  );

  const { data: taskTypes = [], isLoading: ttLoading } = useFirestoreQuery<TaskType>(
    ['taskTypes'],
    () => query(collection(db, 'taskTypes'), orderBy('name', 'asc')),
    (d) => d as TaskType,
    [enabled],
    {
      enabled,
      onError: (err) => handleFirestoreError(err, OperationType.GET, 'taskTypes', currentUser),
    }
  );

  const loading = enabled && (msLoading || attLoading || repLoading || ttLoading);

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
