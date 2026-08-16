<script setup lang="ts">
import { ref, computed } from 'vue';
import BaseAvatar from '../core/BaseAvatar.vue';
import BaseIconButton from '../core/BaseIconButton.vue';
import type { User } from '../../types/app';
import { TelegramService } from '../../services/telegramService';
import { useAuth } from '../../composables/useAuth';
import { getPusherChannel } from '../../services/pusherService';
import { onMounted, onUnmounted, watch } from 'vue';

const { currentAgent } = useAuth();

const props = defineProps<{
  user: User;
}>();

const emit = defineEmits<{
  (e: 'search'): void;
  (e: 'more'): void;
  (e: 'back'): void;
  (
    e: 'conversation-updated',
    payload: {
      assignedAgentId: string | null;
      assignedAgent: { id: string; name: string } | null;
      conversationStatus: string;
    },
  ): void;
}>();

// Local reactive copies so header updates in real time via Pusher
const localAssignedAgentId = ref<string | null | undefined>(
  props.user.assignedAgentId,
);
const localAssignedAgent = ref<{ id: string; name: string } | null | undefined>(
  props.user.assignedAgent,
);
const localConversationStatus = ref<string>(
  props.user.conversationStatus ?? 'OPEN',
);
const actionLoading = ref(false);
const actionError = ref<string | null>(null);

watch(
  () => props.user,
  (u) => {
    localAssignedAgentId.value = u.assignedAgentId;
    localAssignedAgent.value = u.assignedAgent;
    localConversationStatus.value = u.conversationStatus ?? 'OPEN';
  },
  { deep: true },
);

const isAssignedToMe = computed(
  () =>
    !!currentAgent.value &&
    localAssignedAgentId.value === currentAgent.value.id,
);
const isAssignedToOther = computed(
  () => !!localAssignedAgentId.value && !isAssignedToMe.value,
);
const isUnassigned = computed(() => !localAssignedAgentId.value);
const isResolved = computed(() => localConversationStatus.value === 'RESOLVED');

const applyUpdate = (payload: {
  telegramUserId: string;
  conversationStatus: string;
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string } | null;
}) => {
  if (payload.telegramUserId !== props.user.id) return;
  localAssignedAgentId.value = payload.assignedAgentId;
  localAssignedAgent.value = payload.assignedAgent;
  localConversationStatus.value = payload.conversationStatus;
  emit('conversation-updated', {
    assignedAgentId: payload.assignedAgentId,
    assignedAgent: payload.assignedAgent,
    conversationStatus: payload.conversationStatus,
  });
};

const setupRealtime = () => {
  const channel = getPusherChannel();
  if (!channel) return;
  channel.bind('conversation_assigned', applyUpdate);
  channel.bind('conversation_unassigned', applyUpdate);
  channel.bind('conversation_resolved', applyUpdate);
  channel.bind('conversation_reopened', applyUpdate);
};

const teardownRealtime = () => {
  const channel = getPusherChannel();
  if (!channel) return;
  channel.unbind('conversation_assigned', applyUpdate);
  channel.unbind('conversation_unassigned', applyUpdate);
  channel.unbind('conversation_resolved', applyUpdate);
  channel.unbind('conversation_reopened', applyUpdate);
};

onMounted(setupRealtime);
onUnmounted(teardownRealtime);

const handleAssign = async () => {
  actionLoading.value = true;
  actionError.value = null;
  try {
    const data = await TelegramService.assignConversation(props.user.id);
    localAssignedAgentId.value = data.assignedAgentId;
    localAssignedAgent.value = data.assignedAgent;
    localConversationStatus.value = data.conversationStatus;
    emit('conversation-updated', data);
  } catch (e: any) {
    if (e.message?.includes('409') || e.message?.includes('already assigned')) {
      actionError.value =
        'This conversation was already assigned to another agent.';
    } else {
      actionError.value = e.message || 'Failed to assign conversation';
    }
  } finally {
    actionLoading.value = false;
  }
};

const handleUnassign = async () => {
  actionLoading.value = true;
  actionError.value = null;
  try {
    const data = await TelegramService.unassignConversation(props.user.id);
    localAssignedAgentId.value = data.assignedAgentId;
    localAssignedAgent.value = data.assignedAgent;
    localConversationStatus.value = data.conversationStatus;
    emit('conversation-updated', data);
  } catch (e: any) {
    actionError.value = e.message || 'Failed to unassign conversation';
  } finally {
    actionLoading.value = false;
  }
};

const handleResolve = async () => {
  actionLoading.value = true;
  actionError.value = null;
  try {
    const data = await TelegramService.resolveConversation(props.user.id);
    localAssignedAgentId.value = data.assignedAgentId;
    localAssignedAgent.value = data.assignedAgent;
    localConversationStatus.value = data.conversationStatus;
    emit('conversation-updated', data);
  } catch (e: any) {
    actionError.value = e.message || 'Failed to resolve conversation';
  } finally {
    actionLoading.value = false;
  }
};

const handleReopen = async () => {
  actionLoading.value = true;
  actionError.value = null;
  try {
    const data = await TelegramService.reopenConversation(props.user.id);
    localAssignedAgentId.value = data.assignedAgentId;
    localAssignedAgent.value = data.assignedAgent;
    localConversationStatus.value = data.conversationStatus;
    emit('conversation-updated', data);
  } catch (e: any) {
    actionError.value = e.message || 'Failed to reopen conversation';
  } finally {
    actionLoading.value = false;
  }
};
</script>

<template>
  <div
    class="px-5 py-3 border-b border-border bg-bg-sidebar flex items-center justify-between shrink-0 shadow-sm z-10"
  >
    <div class="flex items-center gap-4">
      <!-- Back Button for Mobile -->
      <BaseIconButton
        class="md:hidden -ml-2"
        title="Back"
        @click="emit('back')"
      >
        <svg
          class="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          ></path>
        </svg>
      </BaseIconButton>

      <BaseAvatar
        :name="user.firstName + ' ' + (user.lastName || '')"
        :id="user.id"
        :size="40"
      />
      <div class="flex flex-col">
        <span class="font-semibold text-text-main text-base leading-tight">
          {{ user.firstName }} {{ user.lastName || '' }}
        </span>
        <span class="text-xs text-accent">last seen recently</span>
      </div>
    </div>

    <!-- Assignment / Status Controls -->
    <div class="flex items-center gap-2">
      <!-- Error toast -->
      <span
        v-if="actionError"
        class="text-xs text-red-400 max-w-[180px] text-right leading-tight"
        >{{ actionError }}</span
      >

      <!-- Loading spinner -->
      <span
        v-if="actionLoading"
        class="animate-spin w-4 h-4 border-2 border-accent border-t-transparent rounded-full inline-block"
      ></span>

      <template v-if="!actionLoading">
        <!-- RESOLVED state -->
        <template v-if="isResolved">
          <span
            class="text-xs text-green-400 font-medium px-2 py-1 bg-green-500/10 rounded-full border border-green-500/30"
            >✓ Resolved</span
          >
          <button
            v-if="isAssignedToMe"
            @click="handleReopen"
            class="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-text-main transition-colors border border-border"
          >
            Reopen
          </button>
        </template>

        <!-- OPEN, assigned to me -->
        <template v-else-if="isAssignedToMe">
          <span
            class="text-xs text-accent font-medium px-2 py-1 bg-accent/10 rounded-full border border-accent/30"
            >Assigned to you</span
          >
          <button
            @click="handleResolve"
            class="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-600/80 hover:bg-green-600 text-white transition-colors"
          >
            Resolve
          </button>
          <button
            @click="handleUnassign"
            class="text-xs font-medium px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-text-muted hover:text-text-main transition-colors border border-border"
          >
            Unassign
          </button>
        </template>

        <!-- OPEN, assigned to other agent -->
        <template v-else-if="isAssignedToOther">
          <span
            class="text-xs text-text-muted font-medium px-2 py-1 bg-white/5 rounded-full border border-border"
          >
            Assigned to {{ localAssignedAgent?.name ?? 'another agent' }}
          </span>
        </template>

        <!-- OPEN, unassigned -->
        <template v-else-if="isUnassigned">
          <button
            @click="handleAssign"
            class="text-xs font-medium px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/80 text-white transition-colors shadow-sm"
          >
            Assign to me
          </button>
        </template>
      </template>

      <BaseIconButton title="More options" @click="emit('more')">
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          ></path>
        </svg>
      </BaseIconButton>
    </div>
  </div>
</template>
