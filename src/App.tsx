import React, { useState, useEffect, Suspense, useRef } from 'react';
import { MobileWrapper } from './components/MobileWrapper'; 
import { BottomNav } from './components/BottomNav';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { ChatProvider } from './contexts/ChatContext';
import { auth, db, onAuthStateChanged, collection, onSnapshot, doc, getDoc, query, where, setDoc, updateDoc, serverTimestamp, getDocFromServer, handleFirestoreError, OperationType } from './firebase';
import { Screen, UserAccount, Task, Notification, Inventory, Role, Badge, MassSchedule } from './types';
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

// ==========================================
// 2. KOMPONEN UTAMA APLIKASI
// ==========================================
export default function App() {
  // --- State Navigasi & Sesi ---
  const [currentScreen, setCurrentScreen] = useState<Screen>('SPLASH');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // --- Referensi untuk Data yang Berubah ---
  const currentUserRef = useRef(currentUser);

  // --- State Database Global ---
  const [usersDb, setUsersDb] = useState<UserAccount[]>([]);
  const [tasksDb, setTasksDb] = useState<Task[]>([]);
  const [inventoryDb, setInventoryDb] = useState<Inventory[]>([]);
  const [notificationsDb, setNotificationsDb] = useState<Notification[]>([]);
  const [badgesDb, setBadgesDb] = useState<Badge[]>([]);
  const [massSchedulesDb, setMassSchedulesDb] = useState<MassSchedule[]>([]);

  // Update referensi agar bisa dibaca oleh Event Listener HP
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // --- PENGENDALI TOMBOL BACK HP (Browser History API) ---
  const handleNavigate = (screen: Screen) => {
    if (screen !== currentScreen) {
      window.history.pushState({ screen }, '', `?menu=${screen.toLowerCase()}`);
      setCurrentScreen(screen);
    }
  };

  useEffect(() => {
    window.history.replaceState({ screen: currentScreen }, '', `?menu=${currentScreen.toLowerCase()}`);
    
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        let nextScreen = e.state.screen as Screen;
        const user = currentUserRef.current;
        
        if (user && (nextScreen === 'LOGIN' || nextScreen === 'SPLASH' || nextScreen === 'REGISTER')) {
          nextScreen = user.role === 'SUPERADMIN' || user.role.startsWith('ADMIN_') ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD';
          window.history.replaceState({ screen: nextScreen }, '', `?menu=${nextScreen.toLowerCase()}`);
        }
        
        setCurrentScreen(nextScreen);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Pantau Status Internet (Hardware Online/Offline)
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

  // ==========================================
  // FITUR BARU: LOGIKA PRESENCE (USER AKTIF)
  // ==========================================
  useEffect(() => {
    if (!currentUser) return;

    const userRef = doc(db, 'users', currentUser.uid);

    // Set status online saat komponen berhasil dimuat
    const setOnlineStatus = async () => {
      try {
        await updateDoc(userRef, { 
          isOnline: true, 
          lastSeen: serverTimestamp() 
        });
      } catch (error) {
        console.error("Gagal mengupdate status online:", error);
      }
    };
    
    setOnlineStatus();

    // Fungsi untuk mengubah status offline saat menutup tab/browser
    const handleBeforeUnload = () => {
      updateDoc(userRef, { 
        isOnline: false, 
        lastSeen: serverTimestamp() 
      }).catch(() => {});
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Pembersihan (Cleanup): Set offline saat pengguna logout atau aplikasi ditutup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updateDoc(userRef, { 
        isOnline: false, 
        lastSeen: serverTimestamp() 
      }).catch(() => {});
    };
  }, [currentUser?.uid]); // Akan dieksekusi ulang setiap kali ID pengguna berubah


  // Pantau Status Autentikasi User (Login/Logout)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isSuperAdmin = firebaseUser.email === "fad2beth@gmail.com";
        try {
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          
          if (!userDoc.exists()) {
            const newUser: any = {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User Baru',
              email: firebaseUser.email,
              role: isSuperAdmin ? 'SUPERADMIN' : 'USER',
              status: isSuperAdmin ? 'ACTIVE' : 'PENDING',
              img: firebaseUser.photoURL || '1',
              points: 0,
              level: 1,
              completedTasksCount: 0,
              createdAt: serverTimestamp()
            };
            
            try {
              await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
              userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`, firebaseUser);
            }
          }

          if (userDoc.exists()) {
            const userData = { id: userDoc.id, ...userDoc.data() } as UserAccount;
            
            if (userData.status === 'PENDING' && !isSuperAdmin) {
              if (currentScreen !== 'REGISTER') {
                toast.warning("Akun Anda sedang menunggu verifikasi dari Admin/Koordinator.", {
                  description: "Silakan hubungi pengurus jika pendaftaran Anda belum disetujui.",
                  duration: 5000
                });
                setTimeout(() => {
                  auth.signOut();
                  handleNavigate('LOGIN');
                }, 3000);
              }
              return;
            } else if (userData.status === 'REJECTED') {
              toast.error("Pendaftaran Anda ditolak.", {
                description: "Silakan hubungi pengurus untuk informasi lebih lanjut.",
                duration: 5000
              });
              setTimeout(() => {
                auth.signOut();
                handleNavigate('LOGIN');
              }, 3000);
              return;
            }

            setCurrentUser(userData);
            
            if (currentScreen === 'SPLASH' || currentScreen === 'LOGIN' || currentScreen === 'REGISTER') {
              if (userData.role === 'SUPERADMIN' || userData.role.startsWith('ADMIN_')) {
                handleNavigate('ADMIN_DASHBOARD');
              } else {
                handleNavigate('USER_DASHBOARD');
              }
            }
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`, firebaseUser);
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

  // Sinkronisasi Data Global dari Firestore secara Real-time
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
    }, (error) => console.error("Users Snapshot Error:", error));

    const unsubTasks = onSnapshot(collection(db, 'tasks'), (snap) => {
      setTasksDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    }, (error) => console.error("Tasks Snapshot Error:", error));

    const unsubInventory = onSnapshot(collection(db, 'inventory'), (snap) => {
      setInventoryDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Inventory)));
    }, (error) => console.error("Inventory Snapshot Error:", error));

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

    const unsubMass = onSnapshot(collection(db, 'massSchedules'), (snap) => {
      setMassSchedulesDb(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MassSchedule)));
    }, (error) => console.error("Mass Schedules Snapshot Error:", error));

    return () => {
      unsubUsers();
      unsubTasks();
      unsubInventory();
      unsubNotifs();
      unsubBadges();
      unsubMass();
    };
  }, [currentUser]);

  const handleLogout = () => {
    // Status offline akan ditangani otomatis oleh useEffect Presence di atas saat currentUser menjadi null
    auth.signOut();
    handleNavigate('LOGIN');
  };

  const handleDemoLogin = (user: UserAccount) => {
    setCurrentUser(user);
    if (user.role === 'SUPERADMIN' || user.role.startsWith('ADMIN_')) {
      handleNavigate('ADMIN_DASHBOARD');
    } else {
      handleNavigate('USER_DASHBOARD');
    }
  };

  // ==========================================
  // 3. PENGATURAN ROUTER (SWITCH CASE LAYAR)
  // ==========================================
  const renderScreen = () => {
    switch (currentScreen) {
      case 'SPLASH':
        return <SplashScreen onFinish={() => handleNavigate(currentUser ? (currentUser.role.startsWith('ADMIN') || currentUser.role === 'SUPERADMIN' ? 'ADMIN_DASHBOARD' : 'USER_DASHBOARD') : 'LOGIN')} />;
      case 'LOGIN':
        return <LoginScreen onDemoLogin={handleDemoLogin} onNavigate={handleNavigate} usersDb={usersDb} />;
      case 'REGISTER':
        return <RegisterScreen onNavigate={handleNavigate} />;
      case 'USER_VERIFICATION':
        return <UserVerificationScreen onNavigate={handleNavigate} />;
      case 'TASK_VERIFICATION':
        return <TaskVerificationScreen onNavigate={handleNavigate} setSelectedTaskId={setSelectedTaskId} tasksDb={tasksDb} usersDb={usersDb} />;
      case 'ADMIN_DASHBOARD':
        return <AdminDashboard onNavigate={handleNavigate} onLogout={handleLogout} role={currentUser?.role} user={currentUser} usersDb={usersDb} tasksDb={tasksDb} notificationsDb={notificationsDb} setSelectedTaskId={setSelectedTaskId} isOnline={isOnline} />;
      case 'USER_DASHBOARD':
        return <UserDashboard onNavigate={handleNavigate} onLogout={handleLogout} user={currentUser} tasksDb={tasksDb} notificationsDb={notificationsDb} usersDb={usersDb} setSelectedTaskId={setSelectedTaskId} isOnline={isOnline} />;
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
        return <AdminDataManagement onNavigate={handleNavigate} usersDb={usersDb} tasksDb={tasksDb} inventoryDb={inventoryDb} notificationsDb={notificationsDb} badgesDb={badgesDb} massSchedules={massSchedulesDb} />;
      case 'REPORTS':
        return <ReportsScreen onNavigate={handleNavigate} role={currentUser?.role || 'USER'} currentUser={currentUser} tasksDb={tasksDb} usersDb={usersDb} />;
      case 'TASK_TYPE_MANAGEMENT':
        return <TaskTypeManagement onNavigate={handleNavigate} />;
      case 'PERFORMANCE_STATS':
        return <PerformanceStats onNavigate={handleNavigate} role={currentUser?.role} tasksDb={tasksDb} badgesDb={badgesDb} currentUser={currentUser} />;
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