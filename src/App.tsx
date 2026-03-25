import React, { useState, useEffect, Suspense } from 'react';
import { MobileWrapper } from './components/MobileWrapper'; 
import { BottomNav } from './components/BottomNav';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ChatProvider } from './contexts/ChatContext';
import { auth, db, onAuthStateChanged, collection, onSnapshot, doc, getDoc, query, where, setDoc, serverTimestamp } from './firebase';
import { Screen, UserAccount, Task, Notification, Inventory, Role, Badge } from './types';
import { Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';

// ==========================================
// 1. LAZY LOADING SEMUA HALAMAN (SCREENS)
// ==========================================
const SplashScreen = React.lazy(() => import('./screens/SplashScreen'));
const LoginScreen = React.lazy(() => import('./screens/LoginScreen'));
const RegisterScreen = React.lazy(() => import('./screens/RegisterScreen'));
const UserVerificationScreen = React.lazy(() => import('./screens/UserVerificationScreen'));
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

// ==========================================
// 2. KOMPONEN UTAMA APLIKASI
// ==========================================
export default function App() {
  // --- State Navigasi & Sesi ---
  const [currentScreen, setCurrentScreen] = useState<Screen>('SPLASH');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // --- State Database Global ---
  const [usersDb, setUsersDb] = useState<UserAccount[]>([]);
  const [tasksDb, setTasksDb] = useState<Task[]>([]);
  const [inventoryDb, setInventoryDb] = useState<Inventory[]>([]);
  const [notificationsDb, setNotificationsDb] = useState<Notification[]>([]);
  const [badgesDb, setBadgesDb] = useState<Badge[]>([]);

  // Pantau Status Online/Offline
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

  // Pantau Status Autentikasi User (Login/Logout)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ambil data detail user dari Firestore
        let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (!userDoc.exists()) {
          // Jika user belum ada (misal login Google pertama kali), buatkan dengan status PENDING
          const isSuperAdmin = firebaseUser.email === "fad2beth@gmail.com";
          const newUser: any = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User Baru',
            email: firebaseUser.email,
            role: isSuperAdmin ? 'SUPERADMIN' : 'USER',
            status: isSuperAdmin ? 'ACTIVE' : 'PENDING',
            img: firebaseUser.photoURL || '1',
            points: 0,
            level: 1,
            completedTasksCount: 0,
            createdAt: serverTimestamp()
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        }

        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as UserAccount;
          setCurrentUser(userData);
          
          // Redirect berdasarkan Role
          if (currentScreen === 'SPLASH' || currentScreen === 'LOGIN' || currentScreen === 'REGISTER') {
            if (userData.status === 'PENDING') {
              alert("Akun Anda sedang menunggu verifikasi dari Superadmin. Silakan hubungi pengurus jika pendaftaran Anda belum disetujui.");
              auth.signOut();
              setCurrentScreen('LOGIN');
            } else if (userData.status === 'REJECTED') {
              alert("Pendaftaran Anda ditolak. Silakan hubungi pengurus untuk informasi lebih lanjut.");
              auth.signOut();
              setCurrentScreen('LOGIN');
            } else if (userData.role === 'SUPERADMIN' || userData.role.startsWith('ADMIN_')) {
              setCurrentScreen('ADMIN_DASHBOARD');
            } else {
              setCurrentScreen('USER_DASHBOARD');
            }
          }
        }
      } else {
        setCurrentUser(null);
        if (currentScreen !== 'REGISTER' && currentScreen !== 'SPLASH') {
          setCurrentScreen('LOGIN');
        }
      }
    });

    return () => unsubscribe();
  }, [currentScreen]);

  // Sinkronisasi Data Global dari Firestore secara Real-time
  useEffect(() => {
    if (!currentUser) return; // Hanya tarik data jika sudah login

    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setUsersDb(snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as UserAccount)));
    }, (error) => console.error("Users Snapshot Error:", error));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasksDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => console.error("Tasks Snapshot Error:", error));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventoryDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inventory)));
    }, (error) => console.error("Inventory Snapshot Error:", error));

    // Untuk notifikasi, jika admin ambil semua, jika user ambil yang miliknya atau broadcast
    const isAdmin = currentUser.role === 'SUPERADMIN' || currentUser.role.startsWith('ADMIN_');
    const notifQuery = isAdmin 
      ? collection(db, 'notifications') 
      : query(collection(db, 'notifications'), where('userId', 'in', [currentUser.uid, 'ALL']));

    const unsubNotifs = onSnapshot(notifQuery, (snap) => {
      const allNotifs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotificationsDb(allNotifs);
    }, (error) => console.error("Notifications Snapshot Error:", error));

    const unsubBadges = onSnapshot(collection(db, 'badges'), (snap) => {
      setBadgesDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Badge)));
    }, (error) => console.error("Badges Snapshot Error:", error));

    return () => {
      unsubUsers();
      unsubTasks();
      unsubInventory();
      unsubNotifs();
      unsubBadges();
    };
  }, [currentUser]);

  const handleLogout = () => {
    auth.signOut();
    setCurrentScreen('LOGIN');
  };

  const handleDemoLogin = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'SUPERADMIN' || user.role.startsWith('ADMIN_')) {
      setCurrentScreen('ADMIN_DASHBOARD');
    } else {
      setCurrentScreen('USER_DASHBOARD');
    }
  };

  // ==========================================
  // 3. PENGATURAN ROUTER (SWITCH CASE LAYAR)
  // ==========================================
  const renderScreen = () => {
    switch (currentScreen) {
      case 'SPLASH':
        return <SplashScreen onFinish={() => setCurrentScreen(currentUser ? (currentUser.role.startsWith('ADMIN') || currentUser.role === 'SUPERADMIN' ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD') : 'LOGIN')} />;
      case 'LOGIN':
        return <LoginScreen onDemoLogin={handleDemoLogin} onNavigate={setCurrentScreen} usersDb={usersDb} />;
      case 'REGISTER':
        return <RegisterScreen onNavigate={setCurrentScreen} />;
      case 'USER_VERIFICATION':
        return <UserVerificationScreen onNavigate={setCurrentScreen} />;
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onNavigate={setCurrentScreen} onLogout={handleLogout} role={currentUser?.role} user={currentUser} usersDb={usersDb} tasksDb={tasksDb} notificationsDb={notificationsDb} setSelectedTaskId={setSelectedTaskId} isOnline={isOnline} />;
      case 'USER_DASHBOARD':
        return <UserDashboard onNavigate={setCurrentScreen} onLogout={handleLogout} user={currentUser} tasksDb={tasksDb} notificationsDb={notificationsDb} usersDb={usersDb} setSelectedTaskId={setSelectedTaskId} isOnline={isOnline} />;
      case 'CREATE_TASK':
        return <CreateTaskScreen onNavigate={setCurrentScreen} currentUser={currentUser} usersDb={usersDb} inventoryDb={inventoryDb} />;
      case 'INVENTORY':
        return <InventoryScreen onNavigate={setCurrentScreen} role={currentUser?.role} usersDb={usersDb} inventoryDb={inventoryDb} currentUser={currentUser} />;
      case 'ATTENDANCE':
        return <AttendanceScreen onNavigate={setCurrentScreen} role={currentUser?.role || 'USER'} currentUser={currentUser} tasksDb={tasksDb} />;
      case 'MASS_SCHEDULE':
        return <MassScheduleScreen onNavigate={setCurrentScreen} role={currentUser?.role || 'USER'} usersDb={usersDb} currentUser={currentUser} />;
      case 'VCAST_MANAGER':
        return <VCastManagerScreen onNavigate={setCurrentScreen} role={currentUser?.role} usersDb={usersDb} />;
      case 'TASKS':
        return <TasksScreen onNavigate={setCurrentScreen} role={currentUser?.role} tasksDb={tasksDb} usersDb={usersDb} setSelectedTaskId={setSelectedTaskId} />;
      case 'TASK_DETAIL':
        return <TaskDetail onNavigate={setCurrentScreen} role={currentUser?.role} usersDb={usersDb} taskId={selectedTaskId} tasksDb={tasksDb} inventoryDb={inventoryDb} />;
      case 'TASK_UPDATE':
        return <TaskUpdate onNavigate={setCurrentScreen} taskId={selectedTaskId} tasksDb={tasksDb} />;
      case 'TEAM':
        return <TeamScreen onNavigate={setCurrentScreen} role={currentUser?.role} usersDb={usersDb} currentUser={currentUser} />;
      case 'PROFILE':
        return <Profile onNavigate={setCurrentScreen} onLogout={handleLogout} user={currentUser} />;
      case 'EDIT_PROFILE':
        return <EditProfile onNavigate={setCurrentScreen} user={currentUser} />;
      case 'APP_SETTINGS':
        return <AppSettings onNavigate={setCurrentScreen} />;
      case 'NOTIFICATIONS':
        return <Notifications onNavigate={setCurrentScreen} role={currentUser?.role || 'USER'} notificationsDb={notificationsDb} />;
      case 'NOTIFICATION_SETTINGS':
        return <NotificationSettings onNavigate={setCurrentScreen} user={currentUser} />;
      case 'CHANGE_PASSWORD':
        return <ChangePassword onNavigate={setCurrentScreen} currentUser={currentUser} setUsersDb={setUsersDb} setCurrentUser={setCurrentUser} />;
      case 'HELP_CENTER':
        return <HelpCenter onNavigate={setCurrentScreen} />;
      case 'LIVE_CHAT':
        return <LiveChat onNavigate={setCurrentScreen} role={currentUser?.role || 'USER'} currentUser={currentUser} />;
      case 'EMAIL_SUPPORT':
        return <EmailSupport onNavigate={setCurrentScreen} />;
      case 'ADMIN_DATA_MANAGEMENT':
        return <AdminDataManagement onNavigate={setCurrentScreen} usersDb={usersDb} tasksDb={tasksDb} inventoryDb={inventoryDb} notificationsDb={notificationsDb} badgesDb={badgesDb} />;
      case 'REPORTS':
        return <ReportsScreen onNavigate={setCurrentScreen} role={currentUser?.role || 'USER'} currentUser={currentUser} tasksDb={tasksDb} usersDb={usersDb} />;
      case 'TASK_TYPE_MANAGEMENT':
        return <TaskTypeManagement onNavigate={setCurrentScreen} />;
      case 'PERFORMANCE_STATS':
        return <PerformanceStats onNavigate={setCurrentScreen} role={currentUser?.role} tasksDb={tasksDb} badgesDb={badgesDb} currentUser={currentUser} />;
      default:
        return <SplashScreen onFinish={() => setCurrentScreen('LOGIN')} />;
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
              onNavigate={setCurrentScreen} 
              role={currentUser?.role}
              unreadNotifications={notificationsDb.filter(n => !n.read).length}
            />
          </MobileWrapper>
        </ChatProvider>
      </DataProvider>
    </AuthProvider>
  );
}