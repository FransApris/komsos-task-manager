/**
 * Unit tests untuk src/services/badgeService.ts
 *
 * Strategy: mock ../firebase dan firebase/firestore agar test
 * berjalan tanpa koneksi ke Firebase project nyata.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  mockAddDoc, mockOnSnapshot, mockServerTimestamp,
  mockCollection, mockQuery, mockWhere,
} = vi.hoisted(() => ({
  mockAddDoc: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockServerTimestamp: vi.fn(() => ({ _type: 'serverTimestamp' })),
  mockCollection: vi.fn((_: any, col: string) => ({ path: col })),
  mockQuery: vi.fn((ref: any) => ref),
  mockWhere: vi.fn(),
}));

// badgeService imports db from ../firebase but collection/addDoc from firebase/firestore
vi.mock('../firebase', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  addDoc: mockAddDoc,
  query: mockQuery,
  where: mockWhere,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: mockServerTimestamp,
}));

// ─── Import SUT after mocks ───────────────────────────────────────────────────
import { awardBadge, subscribeToUserBadges } from './badgeService';

// ─────────────────────────────────────────────────────────────────────────────
describe('badgeService.awardBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'badge-new-id' });
  });

  it('memanggil addDoc dengan koleksi badges', async () => {
    await awardBadge('user-1', 'Bintang Peliputan', 'star');

    expect(mockAddDoc).toHaveBeenCalledOnce();
    expect(mockCollection).toHaveBeenCalledWith(expect.anything(), 'badges');
  });

  it('menyimpan userId, name, icon, dan awardedAt', async () => {
    await awardBadge('user-42', 'Fotografer Handal', 'camera');

    const [, badgeData] = mockAddDoc.mock.calls[0];
    expect(badgeData.userId).toBe('user-42');
    expect(badgeData.name).toBe('Fotografer Handal');
    expect(badgeData.icon).toBe('camera');
    expect(badgeData.awardedAt).toBeDefined();
  });

  it('mengembalikan DocumentReference dari addDoc', async () => {
    const ref = await awardBadge('user-1', 'Test Badge', 'medal');
    expect(ref).toEqual({ id: 'badge-new-id' });
  });

  it('melempar error saat addDoc gagal', async () => {
    mockAddDoc.mockRejectedValueOnce(new Error('Permission denied'));

    await expect(awardBadge('user-x', 'Badge', 'icon')).rejects.toThrow('Permission denied');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('badgeService.subscribeToUserBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('membuat query dengan filter userId yang benar', () => {
    const callback = vi.fn();
    mockOnSnapshot.mockImplementation(() => vi.fn()); // return unsubscribe fn

    subscribeToUserBadges('user-5', callback);

    expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-5');
    expect(mockOnSnapshot).toHaveBeenCalledOnce();
  });

  it('memanggil callback dengan array badge saat snapshot tiba', () => {
    const callback = vi.fn();
    const fakeDocs = [
      { id: 'b1', data: () => ({ userId: 'user-5', name: 'Fotografer', icon: 'camera' }) },
      { id: 'b2', data: () => ({ userId: 'user-5', name: 'Penulis', icon: 'pen' }) },
    ];

    mockOnSnapshot.mockImplementation((_, onNext) => {
      onNext({ docs: fakeDocs });
      return vi.fn(); // unsubscribe
    });

    subscribeToUserBadges('user-5', callback);

    expect(callback).toHaveBeenCalledOnce();
    const badges = callback.mock.calls[0][0];
    expect(badges).toHaveLength(2);
    expect(badges[0]).toMatchObject({ id: 'b1', name: 'Fotografer' });
    expect(badges[1]).toMatchObject({ id: 'b2', name: 'Penulis' });
  });

  it('mengembalikan fungsi unsubscribe', () => {
    const unsubFn = vi.fn();
    mockOnSnapshot.mockReturnValue(unsubFn);

    const unsub = subscribeToUserBadges('user-5', vi.fn());
    expect(typeof unsub).toBe('function');
  });

  it('snapshot error tidak melempar — di-handle dengan console.error', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mockOnSnapshot.mockImplementation((_, _onNext, onError) => {
      onError(new Error('snapshot error'));
      return vi.fn();
    });

    expect(() => subscribeToUserBadges('user-bad', vi.fn())).not.toThrow();
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});
