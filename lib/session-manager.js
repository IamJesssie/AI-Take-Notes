// lib/session-manager.js — Standalone Session Manager
// No backend dependencies — manages everything locally.

class SessionManager {
  static HEARTBEAT_INTERVAL = 30000; 

  constructor() {
    this.sessionId = null;
    this.heartbeatTimer = null;
    this.remainingSeconds = 360000; // 100 hours
    this.quotaSeconds = 360000;
    this.tier = 'standalone';
    this.onQuotaUpdate = null;   
    this.onQuotaExceeded = null; 
  }

  async _getToken() {
    return 'standalone';
  }

  // ── Account status (tier, usage, billing period) ───────
  async getAccountStatus() {
    return {
      tier: 'standalone',
      quota_seconds: 360000,
      remaining_seconds: 360000,
      period_end: null
    };
  }

  // ── Start metered session ─────────────────────────────
  async startSession() {
    this.sessionId = 'local-' + Date.now();
    this.remainingSeconds = 360000;
    this.quotaSeconds = 360000;
    this.tier = 'standalone';

    console.log(`[SessionManager] Standalone Session ${this.sessionId} started`);

    return {
      sessionId: this.sessionId,
      remainingSeconds: this.remainingSeconds,
      quotaSeconds: this.quotaSeconds,
      tier: this.tier,
      periodEnd: null,
    };
  }

  // ── Heartbeat (Mocked) ────────────────────────────────
  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      // Just emit current values
      this.onQuotaUpdate?.(this.remainingSeconds, this.quotaSeconds, this.tier);
    }, SessionManager.HEARTBEAT_INTERVAL);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // ── End session ───────────────────────────────────────
  async endSession(sessionData = {}) {
    this._stopHeartbeat();
    console.log(`[SessionManager] Standalone session ended`);
    this.sessionId = null;
    return { duration_seconds: 0 };
  }

  async isAuthenticated() {
    return true; // Always true in standalone mode
  }

  static formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  }
}
