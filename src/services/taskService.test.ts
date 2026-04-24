/**
 * Unit tests untuk src/services/taskService.ts
 *
 * Strategy: mock entire ../firebase module so tests run without
 * a real Firebase project. Each test focuses on the pure logic
 * (argument validation, correct Firestore calls, error propagation).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks (vi.hoisted ensures init before vi.mock factory runs) ───────
const {
  mockAddDoc, mockUpdateDoc, mockOnSnapshot, mockServerTimestamp,
  mockArrayUnion, mockIncrement, mockDoc, mockCollection,
  mockHandleFirestoreError, mockSendNotificationToAdmins,
  mockQuery, mockOrderBy,
} = vi.hoisted(() => ({
  mockAddDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockServerTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  mockArrayUnion: vi.fn((...args: any[]) => ({ _type: 'arrayUnion', elements: args })),
  mockIncrement: vi.fn((n: number) => ({ _type: 'increment', n })),
  mockDoc: vi.fn((_: any, col: string, id: string) => ({ path: `${col}/${id}` })),
  mockCollection: vi.fn((_: any, col: string) => ({ path: col })),
  mockHandleFirestoreError: vi.fn(),
  mockSendNotificationToAdmins: vi.fn(),
  mockQuery: vi.fn((ref: any) => ref),
  mockOrderBy: vi.fn(),
}));

vi.mock('../firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'admin-uid-1' } },
  addDoc: mockAddDoc,
  updateDoc: mockUpdateDoc,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp,
  arrayUnion: mockArrayUnion,
  increment: mockIncrement,
  doc: mockDoc,
  collection: mockCollection,
  query: mockQuery,
  orderBy: mockOrderBy,
  handleFirestoreError: mockHandleFirestoreError,
  OperationType: {
    CREATE: 'create',
    UPDATE: 'update',
    LIST: 'list',
  },
}));

vi.mock('../services/notificationService', () => ({
  sendNotificationToAdmins: mockSendNotificationToAdmins,
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────
import { addTask, updateTaskStatus, assignUserToTask, revokeTaskPoints } from './taskService';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeTask = (overrides: Record<string, any> = {}) => ({
  id: 'task-1',
  title: 'Dokumentasi Misa',
  type: 'dokumentasi',
  status: 'IN_PROGRESS',
  assignedUsers: ['user-1', 'user-2'],
  teamLeaderId: 'user-1',
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
describe('taskService.addTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'new-task-id' });
  });

  it('membuat dokumen tugas baru dengan field wajib', async () => {
    const id = await addTask('Peliputan Natal', 'peliputan', '2026-12-25', '09:00');

    expect(mockAddDoc).toHaveBeenCalledOnce();
    const [, taskData] = mockAddDoc.mock.calls[0];

    expect(taskData.title).toBe('Peliputan Natal');
    expect(taskData.type).toBe('peliputan');
    expect(taskData.date).toBe('2026-12-25');
    expect(taskData.time).toBe('09:00');
    expect(taskData.status).toBe('IN_PROGRESS');
    expect(taskData.createdBy).toBe('admin-uid-1');
    expect(id).toBe('new-task-id');
  });

  it('menyimpan teamLeaderId ke assignedUsers jika disediakan', async () => {
    await addTask('Desain Poster', 'desain', '2026-01-10', '08:00', '', [], 'leader-uid');

    const [, taskData] = mockAddDoc.mock.calls[0];
    expect(taskData.assignedUsers).toContain('leader-uid');
    expect(taskData.teamLeaderId).toBe('leader-uid');
  });

  it('assignedUsers kosong jika teamLeaderId tidak diberikan', async () => {
    await addTask('Tugas Kosong', 'desain', '2026-01-10', '08:00');

    const [, taskData] = mockAddDoc.mock.calls[0];
    expect(taskData.assignedUsers).toEqual([]);
  });

  it('menyertakan linkedScheduleId & linkedScheduleTitle', async () => {
    await addTask('Peliputan', 'peliputan', '2026-02-01', '10:00', '', [], '', 'sched-1', 'Misa Paskah');

    const [, taskData] = mockAddDoc.mock.calls[0];
    expect(taskData.linkedScheduleId).toBe('sched-1');
    expect(taskData.linkedScheduleTitle).toBe('Misa Paskah');
  });

  it('melempar error jika user belum login', async () => {
    const { auth } = await import('../firebase');
    const original = auth.currentUser;
    (auth as any).currentUser = null;

    await expect(addTask('Test', 'desain', '2026-01-01', '08:00')).rejects.toThrow();

    (auth as any).currentUser = original;
  });

  it('memanggil handleFirestoreError dan re-throw saat Firestore gagal', async () => {
    const firestoreError = new Error('Firestore unavailable');
    mockAddDoc.mockRejectedValueOnce(firestoreError);

    await expect(addTask('Gagal', 'peliputan', '2026-01-01', '08:00')).rejects.toThrow('Firestore unavailable');
    expect(mockHandleFirestoreError).toHaveBeenCalledWith(
      firestoreError,
      'create',
      'tasks'
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('taskService.updateTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
  });

  it.each([
    ['IN_PROGRESS'],
    ['WAITING_VERIFICATION'],
    ['COMPLETED'],
  ] as const)('memperbarui status ke %s', async (status) => {
    await updateTaskStatus('task-abc', status);

    expect(mockUpdateDoc).toHaveBeenCalledOnce();
    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(update.status).toBe(status);
  });

  it('mengembalikan true saat berhasil', async () => {
    const result = await updateTaskStatus('task-abc', 'COMPLETED');
    expect(result).toBe(true);
  });

  it('melempar error dan memanggil handleFirestoreError saat gagal', async () => {
    const err = new Error('update failed');
    mockUpdateDoc.mockRejectedValueOnce(err);

    await expect(updateTaskStatus('task-x', 'COMPLETED')).rejects.toThrow('update failed');
    expect(mockHandleFirestoreError).toHaveBeenCalledOnce();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('taskService.assignUserToTask', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockSendNotificationToAdmins.mockResolvedValue(undefined);
  });

  it('menambah userId ke assignedUsers dengan arrayUnion', async () => {
    await assignUserToTask('task-1', 'user-99', 'Peliputan Natal', 'Budi');

    const [, update] = mockUpdateDoc.mock.calls[0];
    expect(mockArrayUnion).toHaveBeenCalledWith('user-99');
    expect(update.assignedUsers).toBeDefined();
  });

  it('mengirim notifikasi ke admin setelah assign', async () => {
    await assignUserToTask('task-1', 'user-99', 'Peliputan Natal', 'Budi');

    expect(mockSendNotificationToAdmins).toHaveBeenCalledOnce();
    const [title, message] = mockSendNotificationToAdmins.mock.calls[0];
    expect(title).toContain('DIAMBIL');
    expect(message).toContain('Budi');
    expect(message).toContain('Peliputan Natal');
  });

  it('mengembalikan true saat berhasil', async () => {
    const result = await assignUserToTask('task-1', 'user-99', 'Tugas', 'Ana');
    expect(result).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('taskService.revokeTaskPoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateDoc.mockResolvedValue(undefined);
    mockAddDoc.mockResolvedValue({ id: 'notif-id' });
  });

  const currentUser = { uid: 'superadmin-uid', displayName: 'SuperAdmin' };

  it('mengembalikan status tugas ke WAITING_VERIFICATION', async () => {
    const task = makeTask();
    await revokeTaskPoints(task, currentUser);

    // Panggilan pertama updateDoc adalah untuk task
    const [, taskUpdate] = mockUpdateDoc.mock.calls[0];
    expect(taskUpdate.status).toBe('WAITING_VERIFICATION');
  });

  it('menambahkan historyEntry ke task', async () => {
    const task = makeTask();
    await revokeTaskPoints(task, currentUser);

    const [, taskUpdate] = mockUpdateDoc.mock.calls[0];
    expect(mockArrayUnion).toHaveBeenCalled();
    expect(taskUpdate.history).toBeDefined();
  });

  it('mengurangi poin dengan increment negatif untuk setiap assignedUser', async () => {
    const task = makeTask({ assignedUsers: ['user-1', 'user-2'], teamLeaderId: 'user-1' });
    await revokeTaskPoints(task, currentUser);

    const incrementCalls = mockIncrement.mock.calls.map(([n]) => n);
    // user-1 adalah leader → -75, user-2 → -50
    expect(incrementCalls).toContain(-75);
    expect(incrementCalls).toContain(-50);
  });

  it('mengurangi stats.photography untuk tugas bertipe dokumentasi', async () => {
    const task = makeTask({ type: 'dokumentasi', assignedUsers: ['user-1'], teamLeaderId: 'user-1' });
    await revokeTaskPoints(task, currentUser);

    const updateCalls = mockUpdateDoc.mock.calls.map(([, data]) => data);
    const statsUpdate = updateCalls.find(d => 'stats.photography' in d);
    expect(statsUpdate?.['stats.photography']).toBeDefined();
  });

  it('mengurangi stats.videography untuk tugas bertipe peliputan', async () => {
    const task = makeTask({ type: 'peliputan', assignedUsers: ['user-1'], teamLeaderId: 'user-1' });
    await revokeTaskPoints(task, currentUser);

    const updateCalls = mockUpdateDoc.mock.calls.map(([, data]) => data);
    const statsUpdate = updateCalls.find(d => 'stats.videography' in d);
    expect(statsUpdate?.['stats.videography']).toBeDefined();
  });

  it('mengirim notifikasi ke setiap assignedUser', async () => {
    const task = makeTask({ assignedUsers: ['user-1', 'user-2'] });
    await revokeTaskPoints(task, currentUser);

    // addDoc dipanggil 2x untuk notifikasi (satu per user)
    const notifCalls = mockAddDoc.mock.calls.filter(([, data]) => data?.type === 'ALERT');
    expect(notifCalls).toHaveLength(2);
  });

  it('mengembalikan true saat berhasil', async () => {
    const result = await revokeTaskPoints(makeTask(), currentUser);
    expect(result).toBe(true);
  });
});
