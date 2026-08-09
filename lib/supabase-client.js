// lib/supabase-client.js — Supabase singleton for Chrome extension

const SUPABASE_URL = 'https://unrkulfqflksywwzifmb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVucmt1bGZxZmxrc3l3d3ppZm1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4NTc5NzIsImV4cCI6MjA4NzQzMzk3Mn0.YQ6OiUcKB__0kKOM3_LAU0dezmm_HaIgWGdY2BGUO10';

// Chrome extension storage adapter (replaces localStorage)
const chromeStorageAdapter = {
  getItem: (key) => new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => resolve(result[key] ?? null));
  }),
  setItem: (key, value) => new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  }),
  removeItem: (key) => new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  }),
};

// The UMD bundle sets window.supabase as the namespace (with .createClient)
// Save the library namespace, then create the client as `supabaseClient`
const _supabaseLib = window.supabase;
const supabaseClient = _supabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: chromeStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'implicit',
  },
});
