import { ref, computed } from 'vue';


export interface Agent {
  id: string;
  name: string;
  email: string;
  role?: string;
}

const currentAgent = ref<Agent | null>(null);
const token = ref<string | null>(localStorage.getItem('auth_token'));
const authLoading = ref(false);

// Initialize agent from local storage token if available. 
// In a real app we might verify it with the server first.
// For now, we trust presence of token. A failing API call will clear it.
const isAuthenticated = computed(() => !!token.value);

function setSession(newToken: string, newAgent: Agent) {
  token.value = newToken;
  currentAgent.value = newAgent;
  localStorage.setItem('auth_token', newToken);
  localStorage.setItem('agent_info', JSON.stringify(newAgent));
}

function clearSession() {
  token.value = null;
  currentAgent.value = null;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('agent_info');
  // Full reload to clear all state
  window.location.reload();
}

function restoreSession() {
  const storedToken = localStorage.getItem('auth_token');
  const storedAgent = localStorage.getItem('agent_info');
  if (storedToken && storedAgent) {
    try {
      token.value = storedToken;
      currentAgent.value = JSON.parse(storedAgent);
    } catch (e) {
      clearSession();
    }
  }
}

export function useAuth() {
  return {
    currentAgent,
    token,
    isAuthenticated,
    authLoading,
    setSession,
    clearSession,
    restoreSession,
  };
}
