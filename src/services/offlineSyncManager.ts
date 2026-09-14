/**
 * Offline-First Cloud Synchronization Manager
 * Provides reliable heartbeat monitoring, offline queueing, and automatic
 * bi-directional synchronization with PostgreSQL (Supabase) via Express pooler.
 */

export interface SyncState {
  isOnline: boolean;
  isCloudConnected: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime: Date | null;
  statusMessage: string;
}

type SyncSubscriber = (state: SyncState) => void;

class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private subscribers: Set<SyncSubscriber> = new Set();
  private heartbeatTimer: any = null;
  private queueKey = 'SMART_FORGE_OFFLINE_SYNC_QUEUE';

  private state: SyncState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isCloudConnected: false,
    isSyncing: false,
    pendingCount: 0,
    lastSyncTime: null,
    statusMessage: 'جارِ فحص الاتصال...',
  };

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initListeners();
      this.loadPendingQueueCount();
      this.startHeartbeat();
    }
  }

  public static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  private initListeners() {
    window.addEventListener('online', () => {
      this.state.isOnline = true;
      this.notify();
      this.checkCloudHealth().then(() => this.flushQueue());
    });

    window.addEventListener('offline', () => {
      this.state.isOnline = false;
      this.state.isCloudConnected = false;
      this.state.statusMessage = 'وضع العمل المحلي (الشبكة غير متصلة)';
      this.notify();
    });
  }

  private loadPendingQueueCount() {
    try {
      const raw = localStorage.getItem(this.queueKey);
      if (raw) {
        const queue = JSON.parse(raw);
        this.state.pendingCount = Array.isArray(queue) ? queue.length : 0;
      }
    } catch {
      this.state.pendingCount = 0;
    }
  }

  public subscribe(callback: SyncSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.state);
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb({ ...this.state });
      } catch (err) {
        console.error('Error in sync subscriber:', err);
      }
    });
  }

  public getState(): SyncState {
    return { ...this.state };
  }

  /**
   * Health-check heartbeat to test Supabase connection status via API (Fallback)
   */
  public async checkCloudHealth(): Promise<boolean> {
    if (!this.state.isOnline) {
      this.state.isCloudConnected = false;
      this.state.statusMessage = 'انقطاع الاتصال بالإنترنت - يتم الحفظ محلياً';
      this.notify();
      return false;
    }

    try {
      const res = await fetch('/api/db/health');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        // Only update if realtime is not already connected
        if (!this.state.isCloudConnected) {
            this.state.isCloudConnected = !!data.connected;
            this.state.statusMessage = data.connected
              ? 'متصل عبر الـ API (المزامنة اللحظية قيد الانتظار)'
              : 'الوضع المحلي الآمن (بيانات الاعتماد السحابية بحاجة لضبط)';
            this.notify();
        }
        return !!data.connected;
      } else {
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  private realTimeSubscription: any = null;

  public startHeartbeat(intervalMs: number = 25000) {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    
    // Initial health check
    this.checkCloudHealth();
    
    // Periodically verify connection (especially if websockets drop)
    this.heartbeatTimer = setInterval(() => {
      if (!this.state.isCloudConnected) {
          this.checkCloudHealth();
      }
    }, intervalMs);

    // Initialize Supabase True Real-time (WebSockets)
    this.initRealtime();
  }

  private initRealtime() {
    if (typeof window === 'undefined') return;

    // Dynamically import getSupabase to avoid circular dependency issues at boot
    import('../lib/supabase').then(({ getSupabase }) => {
      const supabase = getSupabase();
      if (!supabase) return;

      if (this.realTimeSubscription) {
        supabase.removeChannel(this.realTimeSubscription);
      }

      this.realTimeSubscription = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public' },
          (payload) => {
            console.log('Realtime DB change received!', payload);
            this.state.statusMessage = 'تم استلام تحديث جديد لحظياً';
            this.state.isCloudConnected = true;
            this.notify();
            
            // Notify App.tsx to cleanly fetch the latest remote state
            window.dispatchEvent(new CustomEvent('supabase_realtime_update', { detail: payload }));
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            const wasConnected = this.state.isCloudConnected;
            this.state.isCloudConnected = true;
            this.state.statusMessage = 'متصل بالسحابة (Supabase) اللحظية';
            if (!wasConnected) {
              this.flushQueue(); // Auto flush when websocket connects
            }
            this.notify();
          } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
            this.state.isCloudConnected = false;
            this.state.statusMessage = 'جاري إعادة الاتصال اللحظي بالسحابة...';
            this.notify();
          }
        });
    });
  }

  /**
   * Enqueue a pending mutation or state backup to sync later when connection returns
   */
  public queueSync(payload: any) {
    try {
      let queue: any[] = [];
      const raw = localStorage.getItem(this.queueKey);
      if (raw) {
        queue = JSON.parse(raw);
        if (!Array.isArray(queue)) queue = [];
      }
      // Overwrite full snapshot with latest payload or append
      queue = [{ timestamp: Date.now(), payload }];
      localStorage.setItem(this.queueKey, JSON.stringify(queue));
      this.state.pendingCount = queue.length;
      this.notify();
    } catch (e) {
      console.warn('Could not save to offline sync queue:', e);
    }
  }

  /**
   * Flush pending queued items to the database
   */
  public async flushQueue(): Promise<boolean> {
    const raw = localStorage.getItem(this.queueKey);
    if (!raw) return true;

    try {
      const queue = JSON.parse(raw);
      if (!Array.isArray(queue) || queue.length === 0) {
        this.state.pendingCount = 0;
        this.notify();
        return true;
      }

      this.state.isSyncing = true;
      this.state.statusMessage = `جارِ مزامنة ${queue.length} من العمليات المعلقة مع السحابة...`;
      this.notify();

      const latest = queue[queue.length - 1];
      const savedSession = typeof localStorage !== 'undefined' ? localStorage.getItem('smart_forge_active_session') : null;
      const token = savedSession ? (JSON.parse(savedSession)?.token || '') : '';

      const res = await fetch('/api/db/migrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(latest.payload),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.removeItem(this.queueKey);
        this.state.pendingCount = 0;
        this.state.isCloudConnected = true;
        this.state.lastSyncTime = new Date();
        this.state.statusMessage = 'تمت المزامنة بنجاح مع السحابة';
        this.notify();
        return true;
      } else {
        this.state.statusMessage = 'تعذر تفريغ طابور المزامنة، سيتم إعادة المحاولة آلياً';
        this.notify();
        return false;
      }
    } catch (err: any) {
      console.warn('Queue flush failed, will retry later:', err);
      this.state.statusMessage = 'فشلت المزامنة، سيتم الاحتفاظ بالبيانات وإعادة المحاولة';
      this.notify();
      return false;
    } finally {
      this.state.isSyncing = false;
      this.notify();
    }
  }

  public setSyncing(isSyncing: boolean) {
    this.state.isSyncing = isSyncing;
    this.notify();
  }

  public recordSuccessfulSync() {
    this.state.isCloudConnected = true;
    this.state.lastSyncTime = new Date();
    this.state.pendingCount = 0;
    try {
      localStorage.removeItem(this.queueKey);
    } catch {}
    this.notify();
  }
}

export const syncManager = OfflineSyncManager.getInstance();
