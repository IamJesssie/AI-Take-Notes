// lib/knowledge-sync.js — Syncs knowledge between extension and Supabase (optional)

class KnowledgeSync {
  constructor() {
    this.syncInProgress = false;
    this.pendingSync = false;
    this.SYNC_DEBOUNCE_MS = 2000;
    this._debounceTimer = null;
    // UUID stamped on every push we make — used to ignore our own Realtime echo
    this._lastPushId = null;
  }

  // ── Push ─────────────────────────────────────────────────

  pushToCloud(contextText, files) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;
    // Debounce: reset timer on every rapid call
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._doPush(contextText, files), this.SYNC_DEBOUNCE_MS);
  }

  async _doPush(contextText, files) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;
    if (this.syncInProgress) {
      // Queue one more attempt after current finishes
      this.pendingSync = { contextText, files };
      return;
    }

    try {
      this.syncInProgress = true;

      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) return;

      // Stamp this push with a unique ID so we can ignore its Realtime echo
      const pushId = crypto.randomUUID();
      this._lastPushId = pushId;

      const { error } = await supabaseClient
        .from('user_knowledge')
        .upsert({
          user_id: session.user.id,
          context_text: contextText || '',
          files: files || [],
          updated_by: 'extension:' + pushId,
        }, { onConflict: 'user_id' });

      if (error) {
        console.error('[KnowledgeSync] Push failed:', error);
        return;
      }

      await new Promise(resolve => chrome.storage.local.set({ knowledgeLastSync: Date.now() }, resolve));
      console.log('[KnowledgeSync] Pushed to cloud (pushId:', pushId, ')');

    } catch (err) {
      console.error('[KnowledgeSync] Push error:', err);
    } finally {
      this.syncInProgress = false;
      if (this.pendingSync) {
        const { contextText: c, files: f } = this.pendingSync;
        this.pendingSync = null;
        this._doPush(c, f);
      }
    }
  }

  // ── Pull ─────────────────────────────────────────────────

  async pullFromCloud() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return null;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) return null;

      const { data, error } = await supabaseClient
        .from('user_knowledge')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[KnowledgeSync] Pull failed:', error);
        return null;
      }
      if (!data) return null;

      const contextText = data.context_text || '';
      const files = data.files || [];

      await new Promise(resolve =>
        chrome.storage.local.set({ userContext: contextText, knowledgeFiles: files, knowledgeLastSync: Date.now() }, resolve)
      );

      console.log('[KnowledgeSync] Pulled from cloud:', { contextLength: contextText.length, fileCount: files.length });
      return { context_text: contextText, files };

    } catch (err) {
      console.error('[KnowledgeSync] Pull error:', err);
      return null;
    }
  }

  // ── Startup sync ─────────────────────────────────────────

  async syncOnStartup() {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session?.user) return;

      const localData = await new Promise(resolve =>
        chrome.storage.local.get(['userContext', 'knowledgeFiles', 'knowledgeLastSync'], resolve)
      );

      const { data: cloudData, error } = await supabaseClient
        .from('user_knowledge')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[KnowledgeSync] Startup sync error:', error);
        return;
      }

      const cloudFiles   = cloudData?.files        || [];
      const cloudContext = cloudData?.context_text  || '';
      const localFiles   = localData.knowledgeFiles || [];
      const localContext = localData.userContext    || '';

      const cloudHasData = cloudFiles.length > 0 || cloudContext.length > 0;
      const localHasData = localFiles.length > 0 || localContext.length > 0;

      if (!cloudHasData && localHasData) {
        console.log('[KnowledgeSync] Cloud empty — pushing local');
        await this._doPush(localContext, localFiles);
      } else if (cloudHasData && !localHasData) {
        console.log('[KnowledgeSync] Local empty — pulling cloud');
        await this.pullFromCloud();
      } else if (cloudHasData && localHasData) {
        const localTime = localData.knowledgeLastSync || 0;
        const cloudTime = cloudData?.updated_at ? new Date(cloudData.updated_at).getTime() : 0;
        if (cloudTime > localTime) {
          console.log('[KnowledgeSync] Cloud newer — pulling');
          await this.pullFromCloud();
        } else {
          console.log('[KnowledgeSync] Local newer — pushing');
          await this._doPush(localContext, localFiles);
        }
      }

    } catch (err) {
      console.error('[KnowledgeSync] Startup sync error:', err);
    }
  }

  // ── Local change listener ────────────────────────────────

  startListening() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local') return;
        if (!changes.userContext && !changes.knowledgeFiles) return;

        chrome.storage.local.get(['userContext', 'knowledgeFiles'], (result) => {
          this.pushToCloud(result.userContext, result.knowledgeFiles);
        });
      });
    }

    if (typeof supabaseClient !== 'undefined' && supabaseClient?.auth) {
      supabaseClient.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          console.log('[KnowledgeSync] Session ready — syncing');
          this.syncOnStartup();
          this._subscribeToCloud(session.user.id);
        }
        if (event === 'SIGNED_OUT') {
          if (this._realtimeChannel) {
            supabaseClient.removeChannel(this._realtimeChannel);
            this._realtimeChannel = null;
          }
        }
      });
    }

    console.log('[KnowledgeSync] Standalone local listener active');
  }

  // ── Realtime subscription ────────────────────────────────

  _subscribeToCloud(userId) {
    if (typeof supabaseClient === 'undefined' || !supabaseClient?.auth) return;
    if (this._realtimeChannel) {
      supabaseClient.removeChannel(this._realtimeChannel);
    }

    this._realtimeChannel = supabaseClient
      .channel('knowledge-sync-' + userId)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_knowledge',
        filter: 'user_id=eq.' + userId,
      }, async (payload) => {
        const updatedBy = payload.new?.updated_by || '';

        // Ignore our own echo — updated_by carries our pushId
        if (updatedBy.startsWith('extension:')) {
          const pushId = updatedBy.replace('extension:', '');
          if (pushId === this._lastPushId) {
            console.log('[KnowledgeSync] Ignoring own echo (pushId:', pushId, ')');
            return;
          }
        }

        // This is a genuine web-dashboard change — pull it
        console.log('[KnowledgeSync] Remote change from web — pulling');
        const result = await this.pullFromCloud();
        if (result) {
          chrome.runtime.sendMessage({ type: 'KNOWLEDGE_UPDATED_FROM_CLOUD' }, () => {
            void chrome.runtime.lastError;
          });
        }
      })
      .subscribe();

    console.log('[KnowledgeSync] Subscribed to realtime for user', userId);
  }
}

const knowledgeSync = new KnowledgeSync();

if (typeof chrome !== 'undefined' && chrome.storage) {
  knowledgeSync.startListening();
}
