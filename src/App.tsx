import React, { useState, useEffect, Suspense, useRef } from 'react';
import { MobileWrapper } from './components/MobileWrapper'; 
import { BottomNav } from './components/BottomNav';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ChatProvider } from './contexts/ChatContext';
import { auth, db, onAuthStateChanged, collection, onSnapshot, doc, getDoc, query, where, setDoc, updateDoc, serverTimestamp, handleFirestoreError, OperationType } from './firebase';
import { Screen, UserAccount, Task, Notification, Inventory, Role, Badge, MassSchedule, SwapRequest } from './types';
import { Loader2 } from 'lucide-react';
import { toast, Toaster } from 'sonner';

// ==========================================
// 1. LAZY LOADING SEMUA HALAMAN (SCREENS)
// ==========================================
const SplashScreen = React.lazy(() => import('./screens/SplashScreen'));
const LoginScreen = React.lazy(() => import('./screens/LoginScreen'));
const RegisterScreen = React.lazy(() => import('./screens/RegisterScreen'));
const UserVerificationScreen = React.lazy(() => import('./screens/UserVerificationScreen'));
const TaskVerificationScreen = React.lazy(() => import('./screens/TaskVerificationScreen'));
const AdminDashboard = React.lazy(() => import('./screens/AdminDashboard'));
const UserDashboard = React.lazy(() => import('./screens/UserDashboard'));
const CreateTaskScreen = React.lazy(() => import('./screens/CreateTaskScreen'));
const InventoryScreen = React.lazy(() => import('./screens/InventoryScreen'));
const AttendanceScreen = React.lazy(() => import('./screens/AttendanceScreen'));
const MassScheduleScreen = React.lazy(() => import('./screens/MassScheduleScreen'));
const VCastManagerScreen = React.lazy(() => import('./screens/VCastManagerScreen'));
const TasksScreen = React.lazy(() => import('./screens/TasksScreen'));
const TaskDetail = React.lazy(() => import('./screens/TaskDetail'));
const TaskUpdate = React.lazy(() => import('./screens/TaskUpdate'));
const TeamScreen = React.lazy(() => import('./screens/TeamScreen'));
const Profile = React.lazy(() => import('./screens/Profile'));
const EditProfile = React.lazy(() => import('./screens/EditProfile'));
const AppSettings = React.lazy(() => import('./screens/AppSettings'));
const Notifications = React.lazy(() => import('./screens/Notifications'));
const NotificationSettings = React.lazy(() => import('./screens/NotificationSettings'));
const ChangePassword = React.lazy(() => import('./screens/ChangePassword'));
const HelpCenter = React.lazy(() => import('./screens/HelpCenter'));
const LiveChat = React.lazy(() => import('./screens/LiveChat'));
const EmailSupport = React.lazy(() => import('./screens/EmailSupport'));
const AdminDataManagement = React.lazy(() => import('./screens/AdminDataManagement'));
const ReportsScreen = React.lazy(() => import('./screens/ReportsScreen'));
const TaskTypeManagement = React.lazy(() => import('./screens/TaskTypeManagement'));
const PerformanceStats = React.lazy(() => import('./screens/PerformanceStats'));
const EditTaskScreen = React.lazy(() => import('./screens/EditTaskScreen'));
const SwapRequestScreen = React.lazy(() => import('./screens/SwapRequestScreen'));
const NewTaskAlertScreen = React.lazy(() => import('./screens/NewTaskAlertScreen'));
const HelpdeskScreen = React.lazy(() => import('./screens/HelpdeskScreen'));

// ==========================================
// 2. KOMPONEN UTAMA APLIKASI
// ==========================================
export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('SPLASH');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const currentUserRef = useRef(currentUser);

  // State Database Global
  const [usersDb, setUsersDb] = useState<UserAccount[]>([]);
  const [tasksDb, setTasksDb] = useState<Task[]>([]);
  const [inventoryDb, setInventoryDb] = useState<Inventory[]>([]);
  const [notificationsDb, setNotificationsDb] = useState<Notification[]>([]);
  const [badgesDb, setBadgesDb] = useState<Badge[]>([]);
  const [massSchedulesDb, setMassSchedulesDb] = useState<MassSchedule[]>([]);
  const [swapRequestsDb, setSwapRequestsDb] = useState<SwapRequest[]>([]);
  const [helpdeskTicketsDb, setHelpdeskTicketsDb] = useState<any[]>([]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Routing Browser
  const handleNavigate = (screen: Screen) => {
    if (screen !== currentScreen) {
      window.history.pushState({ screen }, '', `?menu=${screen.toLowerCase()}`);
      setCurrentScreen(screen);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    window.history.replaceState({ screen: currentScreen }, '', `?menu=${currentScreen.toLowerCase()}`);
    
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        let nextScreen = e.state.screen as Screen;
        const user = currentUserRef.current;
        
        if (user && (nextScreen === 'LOGIN' || nextScreen === 'SPLASH' || nextScreen === 'REGISTER')) {
          nextScreen = user.role === 'SUPERADMIN' || user.role?.startsWith('ADMIN_') ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD';
          window.history.replaceState({ screen: nextScreen }, '', `?menu=${nextScreen.toLowerCase()}`);
        }
        setCurrentScreen(nextScreen);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentScreen]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Presence Logic (Real-time Online/Offline)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const userRef = doc(db, 'users', currentUser.uid);

    const setStatus = async (online: boolean) => {
      try {
        await updateDoc(userRef, { 
          isOnline: online, 
          lastSeen: serverTimestamp() 
        });
      } catch (error) {
        // Silent fail if permission denied during logout
      }
    };

    // Set online on mount
    setStatus(true);

    const handleVisibilityChange = () => {
      setStatus(document.visibilityState === 'visible');
    };

    const handleBeforeUnload = () => {
      // Use a synchronous-like update if possible, but Firestore is async.
      // We'll just try our best here.
      setStatus(false);
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setStatus(false);
    };
  }, [currentUser?.uid]);

  // ==========================================
  // 🛡️ LOGIKA AUTENTIKASI (PINTU GERBANG UTAMA)
  // ==========================================
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          if (!userDoc.exists()) {
            if (currentScreen !== 'REGISTER') {
               toast.info("Anda belum terdaftar. Silakan lengkapi formulir pendaftaran.");
               handleNavigate('REGISTER');
            }
            return; 
          }

          const userData = { id: userDoc.id, ...userDoc.data() } as UserAccount;
          const isSuperAdmin = userData.role === 'SUPERADMIN';

          if (userData.status === 'PENDING' && !isSuperAdmin) {
            toast.warning("Akun Menunggu Verifikasi", {
              description: "Pendaftaran Anda sedang ditinjau oleh Admin.",
              duration: 4000
            });
            setTimeout(() => {
              auth.signOut();
              handleNavigate('LOGIN');
            }, 1000);
            return;
          } 
          
          if (userData.status === 'REJECTED' && !isSuperAdmin) {
            toast.error("Akses Ditolak", {
              description: "Pendaftaran Anda telah ditolak oleh Admin.",
              duration: 4000
            });
            setTimeout(() => {
              auth.signOut();
              handleNavigate('LOGIN');
            }, 1000);
            return;
          }

          setCurrentUser(userData);
          
          if (currentScreen === 'SPLASH' || currentScreen === 'LOGIN' || currentScreen === 'REGISTER') {
            if (userData.role === 'SUPERADMIN' || userData.role?.startsWith('ADMIN_')) {
              handleNavigate('ADMIN_DASHBOARD');
            } else {
              handleNavigate('NEW_TASK_ALERT');
            }
          }
        } catch (err) {
          console.error("Auth error:", err);
          handleNavigate('LOGIN');
        }
      } else {
        setCurrentUser(null);
        if (currentScreen !== 'REGISTER' && currentScreen !== 'SPLASH') {
          handleNavigate('LOGIN');
        }
      }
    });

    return () => unsubscribe();
  }, [currentScreen]);

  // Sinkronisasi Database
  useEffect(() => {
    if (!currentUser) return; 

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsersDb(snap.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          uid: doc.id, 
          ...data,
          displayName: data.displayName || (data as any).name || 'User Baru'
        } as UserAccount;
      }));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'users', currentUser));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasksDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'tasks', currentUser));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventoryDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inventory)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'inventory', currentUser));

    const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role?.startsWith('ADMIN_');
    const notifQuery = isAdmin 
      ? collection(db, 'notifications') 
      : query(collection(db, 'notifications'), where('userId', 'in', [currentUser.uid || '', 'ALL']));

    const unsubNotifs = onSnapshot(notifQuery, (snap) => {
      const allNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotificationsDb(allNotifs);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'notifications', currentUser));

    const unsubBadges = onSnapshot(collection(db, 'badges'), (snap) => {
      setBadgesDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Badge)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'badges', currentUser));

    const unsubMass = onSnapshot(collection(db, 'massSchedules'), (snap) => {
      setMassSchedulesDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MassSchedule)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'massSchedules', currentUser));

    const unsubSwap = onSnapshot(collection(db, 'swapRequests'), (snap) => {
      setSwapRequestsDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SwapRequest)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'swapRequests', currentUser));

    const unsubHelpdesk = onSnapshot(isAdmin 
      ? collection(db, 'helpdesk_tickets') 
      : query(collection(db, 'helpdesk_tickets'), where('userId', '==', currentUser.uid || '')), (snap) => {
      setHelpdeskTicketsDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'helpdesk_tickets', currentUser));

    return () => {
      unsubUsers();
      unsubTasks();
      unsubInventory();
      unsubNotifs();
      unsubBadges();
      unsubMass();
      unsubSwap();
      unsubHelpdesk();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    if (currentUser?.uid) {
      try {
        await updateDoc(doc(db, 'users', currentUser.uid), { 
          isOnline: false, 
          lastSeen: serverTimestamp() 
        });
      } catch (e) {}
    }
    auth.signOut();
    handleNavigate('LOGIN');
  };

  const handleDemoLogin = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'SUPERADMIN' || user.role?.startsWith('ADMIN_')) {
      handleNavigate('ADMIN_DASHBOARD');
    } else {
      handleNavigate('NEW_TASK_ALERT');
    }
  };

  // ==========================================
  // 3. PENGATURAN ROUTER (SWITCH CASE LAYAR)
  // ==========================================
  const renderScreen = () => {
    switch (currentScreen) {
      case 'SPLASH':
        return <SplashScreen onFinish={() => handleNavigate(currentUser ? (currentUser.role?.startsWith('ADMIN') || currentUser.role === 'SUPERADMIN' ? 'ADMIN_DASHBOARD' : 'NEW_TASK_ALERT') : 'LOGIN')} />;
      case 'LOGIN':
        return <LoginScreen onDemoLogin={handleDemoLogin} onNavigate={handleNavigate} usersDb={usersDb} />;
      case 'REGISTER':
        return <RegisterScreen onNavigate={handleNavigate} />;
      case 'USER_VERIFICATION':
        return <UserVerificationScreen onNavigate={handleNavigate} />;
      case 'TASK_VERIFICATION':
        return <TaskVerificationScreen onNavigate={handleNavigate} setSelectedTaskId={setSelectedTaskId} tasksDb={tasksDb} usersDb={usersDb} />;
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onNavigate={handleNavigate} onLogout={handleLogout} role={currentUser?.role} user={currentUser} usersDb={usersDb} tasksDb={tasksDb} notificationsDb={notificationsDb} setSelectedTaskId={setSelectedTaskId} isOnline={isOnline} swapRequestsDb={swapRequestsDb} helpdeskTicketsDb={helpdeskTicketsDb} />;
      case 'USER_DASHBOARD':
        return <UserDashboard onNavigate={handleNavigate} onLogout={handleLogout} user={currentUser} tasksDb={tasksDb} notificationsDb={notificationsDb} usersDb={usersDb} setSelectedTaskId={setSelectedTaskId} isOnline={isOnline} helpdeskTicketsDb={helpdeskTicketsDb} />;
      case 'CREATE_TASK':
        return <CreateTaskScreen onNavigate={handleNavigate} currentUser={currentUser} usersDb={usersDb} inventoryDb={inventoryDb} />;
      case 'INVENTORY':
        return <InventoryScreen onNavigate={handleNavigate} role={currentUser?.role} usersDb={usersDb} inventoryDb={inventoryDb} currentUser={currentUser} />;
      case 'ATTENDANCE':
        return <AttendanceScreen onNavigate={handleNavigate} role={currentUser?.role || 'USER'} currentUser={currentUser} tasksDb={tasksDb} />;
      case 'MASS_SCHEDULE':
        return <MassScheduleScreen onNavigate={handleNavigate} role={currentUser?.role || 'USER'} usersDb={usersDb} currentUser={currentUser} />;
      case 'VCAST_MANAGER':
        return <VCastManagerScreen onNavigate={handleNavigate} role={currentUser?.role} usersDb={usersDb} />;
      case 'TASKS':
        return <TasksScreen onNavigate={handleNavigate} role={currentUser?.role} tasksDb={tasksDb} usersDb={usersDb} setSelectedTaskId={setSelectedTaskId} />;
      case 'TASK_DETAIL':
        return <TaskDetail onNavigate={handleNavigate} role={currentUser?.role} usersDb={usersDb} taskId={selectedTaskId} tasksDb={tasksDb} inventoryDb={inventoryDb} currentUser={currentUser} />;
      case 'TASK_UPDATE':
        return <TaskUpdate onNavigate={handleNavigate} taskId={selectedTaskId} tasksDb={tasksDb} />;
      case 'EDIT_TASK':
        const taskToEdit = tasksDb.find(t => t.id === selectedTaskId);
        if (!taskToEdit) return <SplashScreen onFinish={() => handleNavigate('TASKS')} />;
        return <EditTaskScreen onNavigate={handleNavigate} currentUser={currentUser} task={taskToEdit} usersDb={usersDb} inventoryDb={inventoryDb} />;
      
      // --- PERBAIKAN: MENGIRIMKAN tasksDb KE BURSA PERTUKARAN ---
      case 'SWAP_REQUEST':
        return <SwapRequestScreen onNavigate={handleNavigate} user={currentUser} role={currentUser?.role} tasksDb={tasksDb} />;
      
      case 'TEAM':
        return <TeamScreen onNavigate={handleNavigate} role={currentUser?.role} usersDb={usersDb} currentUser={currentUser} />;
      case 'PROFILE':
        return <Profile onNavigate={handleNavigate} onLogout={handleLogout} user={currentUser} />;
      case 'EDIT_PROFILE':
        return <EditProfile onNavigate={handleNavigate} user={currentUser} />;
      case 'APP_SETTINGS':
        return <AppSettings onNavigate={handleNavigate} />;
      case 'NOTIFICATIONS':
        return <Notifications onNavigate={handleNavigate} role={currentUser?.role || 'USER'} notificationsDb={notificationsDb} />;
      case 'NOTIFICATION_SETTINGS':
        return <NotificationSettings onNavigate={handleNavigate} user={currentUser} />;
      case 'CHANGE_PASSWORD':
        return <ChangePassword onNavigate={handleNavigate} currentUser={currentUser} setUsersDb={setUsersDb} setCurrentUser={setCurrentUser} />;
      case 'HELP_CENTER':
        return <HelpCenter onNavigate={handleNavigate} />;
      case 'LIVE_CHAT':
        return <LiveChat onNavigate={handleNavigate} role={currentUser?.role || 'USER'} currentUser={currentUser} />;
      case 'EMAIL_SUPPORT':
        return <EmailSupport onNavigate={handleNavigate} />;
      case 'ADMIN_DATA_MANAGEMENT':
        return <AdminDataManagement onNavigate={handleNavigate} usersDb={usersDb} tasksDb={tasksDb} inventoryDb={inventoryDb} notificationsDb={notificationsDb} badgesDb={badgesDb} massSchedules={massSchedulesDb} currentUser={currentUser} role={currentUser?.role} />;
      case 'REPORTS':
        return <ReportsScreen onNavigate={handleNavigate} role={currentUser?.role || 'USER'} currentUser={currentUser} tasksDb={tasksDb} usersDb={usersDb} />;
      case 'TASK_TYPE_MANAGEMENT':
        return <TaskTypeManagement onNavigate={handleNavigate} />;
      case 'PERFORMANCE_STATS':
        return <PerformanceStats onNavigate={handleNavigate} role={currentUser?.role} tasksDb={tasksDb} badgesDb={badgesDb} currentUser={currentUser} />;
      case 'HELPDESK':
        return <HelpdeskScreen onNavigate={handleNavigate} role={currentUser?.role || 'USER'} currentUser={currentUser} />;
      case 'NEW_TASK_ALERT':
        return <NewTaskAlertScreen onNavigate={handleNavigate} user={currentUser} tasksDb={tasksDb} />;
      default:
        return <SplashScreen onFinish={() => handleNavigate('LOGIN')} />;
    }
  };

  // ==========================================
  // 4. RENDER UTAMA
  // ==========================================
  return (
    <AuthProvider>
      <DataProvider>
        <ChatProvider>
          <Toaster position="top-center" theme="dark" richColors />
          <MobileWrapper>
            <Suspense 
              fallback={
                <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f18] text-white">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Memuat Modul...</p>
                </div>
              }
            >
              {renderScreen()}
            </Suspense>
            <BottomNav 
              currentScreen={currentScreen} 
              onNavigate={handleNavigate} 
              role={currentUser?.role}
              unreadNotifications={notificationsDb.filter(n => !n.read).length}
            />
          </MobileWrapper>
        </ChatProvider>
      </DataProvider>
    </AuthProvider>
  );
}