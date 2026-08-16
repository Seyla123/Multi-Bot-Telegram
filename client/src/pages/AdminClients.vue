<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'; import { useRouter } from 'vue-router'; import { AdminService, type AdminAgent } from '../services/adminService'; import { AdminClientsService, type ApiClient, type ApiClientType } from '../services/adminClientsService';
const router = useRouter(), clients = ref<ApiClient[]>([]), agents = ref<AdminAgent[]>([]), loading = ref(false), error = ref(''), search = ref(''), status = ref(''), type = ref(''), page = ref(1), meta = ref({ page: 1, limit: 20, total: 0, totalPages: 1 }), formOpen = ref(false), revealToken = ref(''), revealOpen = ref(false), confirmAction = ref<'regenerate' | 'delete' | null>(null), target = ref<ApiClient | null>(null), form = ref({ name: '', type: 'CLIENT' as ApiClientType, userId: '', permissions: '*', expiresAt: '' });
const editing = computed(() => !!target.value && formOpen.value); const date = (v: string | null) => v ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '—'; const permissions = () => form.value.permissions.split(',').map(x => x.trim()).filter(Boolean);
const load = async () => { loading.value = true; error.value = ''; try { const r = await AdminClientsService.list({ page: page.value, limit: 20, search: search.value || undefined, status: status.value || undefined, type: type.value || undefined }); clients.value = r.data; meta.value = r.meta } catch (e: any) { error.value = e.message || 'Could not load API clients.' } finally { loading.value = false } };
const loadAgents = async () => { const r = await AdminService.listAgents({ limit: 100 }); agents.value = r.data || [] };
const openCreate = () => { target.value = null; form.value = { name: '', type: 'CLIENT', userId: '', permissions: '*', expiresAt: '' }; formOpen.value = true }; const openEdit = (c: ApiClient) => { target.value = c; form.value = { name: c.name, type: c.type, userId: c.agentId || '', permissions: c.permissions.join(', '), expiresAt: c.expiresAt ? c.expiresAt.slice(0, 16) : '' }; formOpen.value = true };
const save = async () => { error.value = ''; if (form.value.type === 'PERSONAL' && !form.value.userId) { error.value = 'Select the user for a personal token.'; return } const p: any = { name: form.value.name, permissions: permissions(), expiresAt: form.value.expiresAt || undefined, ...(form.value.type === 'PERSONAL' ? { userId: form.value.userId } : {}) }; try { if (target.value) await AdminClientsService.update(target.value.id, p); else { const r = await AdminClientsService.create({ ...p, type: form.value.type }); revealToken.value = r.rawToken; revealOpen.value = true } formOpen.value = false; await load() } catch (e: any) { error.value = e.message || 'Unable to save client.' } };
const toggle = async (c: ApiClient) => { try { await AdminClientsService.revoke(c.id); await load() } catch (e: any) { error.value = e.message || 'Unable to update status.' } }; const confirm = (a: 'regenerate' | 'delete', c: ApiClient) => { confirmAction.value = a; target.value = c }; const executeConfirm = async () => { if (!target.value || !confirmAction.value) return; try { if (confirmAction.value === 'delete') await AdminClientsService.remove(target.value.id); else { const r = await AdminClientsService.regenerate(target.value.id); revealToken.value = r.rawToken; revealOpen.value = true } confirmAction.value = null; await load() } catch (e: any) { error.value = e.message || 'Action failed.' } }; const copy = async (v: string) => navigator.clipboard.writeText(v);
watch([search, status, type], () => { page.value = 1; load() }); onMounted(async () => { await Promise.all([load(), loadAgents()]) });
</script>
<template>
    <main class="access-console">
        <header class="masthead">
            <div><button class="back" @click="router.push('/admin')">← Admin</button>
                <p class="eyebrow">INTEGRATION CONTROL</p>
                <h1>Client keys</h1>
                <p>Issue, monitor, and immediately disable access to your Telegram services.</p>
            </div><button class="primary" @click="openCreate">+ New client</button>
        </header>
        <section class="token-strip"><span>ACTIVE ACCESS KEYS</span><strong>{{ meta.total }}</strong><span
                class="line" /><span>Raw keys are displayed once only.</span></section>
        <section class="controls"><input v-model="search" placeholder="Search name or token preview"><select
                v-model="type">
                <option value="">All types</option>
                <option value="CLIENT">Client</option>
                <option value="PERSONAL">Personal</option>
            </select><select v-model="status">
                <option value="">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="REVOKED">Revoked</option>
                <option value="EXPIRED">Expired</option>
            </select></section>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <section class="table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>Client</th>
                        <th>Type</th>
                        <th>Token preview</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Last used</th>
                        <th />
                    </tr>
                </thead>
                <tbody>
                    <tr v-if="loading">
                        <td colspan="7">Loading access records…</td>
                    </tr>
                    <tr v-else-if="!clients.length">
                        <td colspan="7">No client keys match these filters.</td>
                    </tr>
                    <tr v-for="c in clients" :key="c.id">
                        <td><strong>{{ c.name }}</strong><small v-if="c.agent">{{ c.agent.email }}</small></td>
                        <td><span class="badge type">{{ c.type === 'CLIENT' ? 'Client' : 'Personal' }}</span></td>
                        <td><button class="preview" @click="copy(c.preview)">{{ c.preview }} ⧉</button></td>
                        <td><span class="badge" :class="c.status.toLowerCase()">{{ c.status }}</span></td>
                        <td>{{ date(c.createdAt) }}</td>
                        <td>{{ date(c.lastUsedAt) }}</td>
                        <td class="actions"><button @click="openEdit(c)">Edit</button><button @click="toggle(c)">{{
                            c.status === 'REVOKED' ? 'Activate' : 'Revoke' }}</button><button
                                @click="confirm('regenerate', c)">Regenerate</button><button class="danger"
                                @click="confirm('delete', c)">Delete</button></td>
                    </tr>
                </tbody>
            </table>
        </section>
        <nav class="pagination"><button :disabled="page <= 1" @click="page--; load()">Previous</button><span>Page
                {{ meta.page }} of {{ meta.totalPages }}</span><button :disabled="page >= meta.totalPages"
                @click="page++; load()">Next</button></nav>
        <div v-if="formOpen" class="overlay" @click.self="formOpen = false">
            <form class="modal" @submit.prevent="save"><button type="button" class="close"
                    @click="formOpen = false">×</button>
                <p class="eyebrow">{{ editing ? 'EDIT ACCESS' : 'NEW ACCESS' }}</p>
                <h2>{{ editing ? 'Update client key' : 'Create client key' }}</h2><label>Name<input
                        v-model.trim="form.name" required maxlength="191" placeholder="Client Corp A"></label>
                <fieldset :disabled="editing">
                    <legend>Token type</legend><label class="radio"><input v-model="form.type" type="radio"
                            value="CLIENT"> Client</label><label class="radio"><input v-model="form.type" type="radio"
                            value="PERSONAL"> Personal</label>
                </fieldset><label v-if="form.type === 'PERSONAL'">User<select v-model="form.userId" required>
                        <option value="">Choose an agent</option>
                        <option v-for="a in agents" :key="a.id" :value="a.id">{{ a.name }} · {{ a.email }}</option>
                    </select></label><label>Permissions <small>Comma separated; use * for all services.</small><input
                        v-model="form.permissions" placeholder="send_message"></label><label>Expires at <input
                        v-model="form.expiresAt" type="datetime-local"></label><button class="primary" type="submit">{{
                            editing ? 'Save changes' : 'Create and reveal key' }}</button>
            </form>
        </div>
        <div v-if="revealOpen" class="overlay">
            <section class="modal reveal">
                <p class="eyebrow">COPY NOW</p>
                <h2>Your new API token</h2>
                <p class="warning">Please copy this token now. For security reasons, you will not be able to see it
                    again.</p><code>{{ revealToken }}</code><button class="primary" @click="copy(revealToken)">Copy to
                    clipboard</button><button class="plain" @click="revealOpen = false">I have saved it</button>
            </section>
        </div>
        <div v-if="confirmAction && target" class="overlay">
            <section class="modal">
                <p class="eyebrow">CONFIRM ACTION</p>
                <h2>{{ confirmAction === 'delete' ? 'Permanently delete this key?' : 'Regenerate this key?' }}</h2>
                <p>{{ confirmAction === 'delete' ? 'This cannot be undone.' : 'The old key will stop working immediately.' }}</p>
                <div class="modal-actions"><button class="plain" @click="confirmAction = null">Cancel</button><button
                        class="danger-fill" @click="executeConfirm">Continue</button></div>
            </section>
        </div>
    </main>
</template>
<style scoped>
.access-console {
    --ink: #f3f0e8;
    --muted: #9e9d96;
    --panel: #191919;
    --line: #373631;
    --acid: #c9ff3d;
    --danger: #ff645d;
    min-height: 100vh;
    background: #10100f;
    color: var(--ink);
    padding: 42px clamp(20px, 5vw, 80px);
    font-family: Georgia, serif
}

.masthead {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: end;
    max-width: 1320px;
    margin: auto
}

.masthead h1 {
    font-size: clamp(2.5rem, 6vw, 5.8rem);
    letter-spacing: -.07em;
    line-height: .82;
    margin: 12px 0 18px
}

.masthead p {
    color: var(--muted);
    margin: 0;
    max-width: 500px
}

.eyebrow {
    color: var(--acid) !important;
    font: 700 .7rem/1.2 monospace !important;
    letter-spacing: .18em
}

.back,
.plain {
    background: none;
    border: 0;
    color: var(--muted);
    padding: 0;
    cursor: pointer
}

.primary,
.danger-fill {
    border: 0;
    padding: 13px 18px;
    background: var(--acid);
    color: #15170f;
    font-weight: 800;
    cursor: pointer
}

.danger-fill {
    background: var(--danger)
}

.token-strip {
    max-width: 1320px;
    margin: 46px auto 18px;
    border-block: 1px solid var(--line);
    padding: 13px 0;
    display: flex;
    gap: 15px;
    align-items: center;
    font: 700 .73rem monospace;
    letter-spacing: .08em;
    color: var(--muted)
}

.token-strip strong {
    font-size: 1.1rem;
    color: var(--acid)
}

.line {
    height: 1px;
    background: var(--line);
    flex: 1
}

.controls {
    max-width: 1320px;
    margin: 0 auto 16px;
    display: flex;
    gap: 10px
}

.controls input {
    flex: 1
}

.controls input,
.controls select,
.modal input,
.modal select {
    background: #22221f;
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 11px;
    font: inherit
}

.error {
    max-width: 1320px;
    margin: 12px auto;
    color: var(--danger)
}

.table-wrap {
    max-width: 1320px;
    margin: auto;
    overflow: auto;
    border: 1px solid var(--line);
    background: var(--panel)
}

table {
    width: 100%;
    border-collapse: collapse;
    min-width: 960px;
    font-size: .88rem
}

th,
td {
    text-align: left;
    padding: 16px;
    border-bottom: 1px solid var(--line)
}

th {
    font: .67rem monospace;
    letter-spacing: .12em;
    color: var(--muted)
}

td small {
    display: block;
    color: var(--muted);
    margin-top: 4px
}

.badge {
    font: .65rem monospace;
    letter-spacing: .08em;
    padding: 5px 7px;
    border: 1px solid var(--line)
}

.active {
    color: var(--acid);
    border-color: #627b24
}

.revoked,
.expired {
    color: var(--danger);
    border-color: #80413d
}

.type {
    color: #c6c4bd
}

.preview {
    font-family: monospace;
    color: var(--ink);
    background: none;
    border: 0;
    cursor: pointer
}

.actions {
    white-space: nowrap
}

.actions button {
    background: none;
    border: 0;
    color: var(--muted);
    font-size: .78rem;
    cursor: pointer;
    padding: 3px
}

.actions .danger {
    color: var(--danger)
}

.pagination {
    max-width: 1320px;
    margin: 16px auto;
    display: flex;
    justify-content: flex-end;
    gap: 14px;
    align-items: center;
    color: var(--muted);
    font-size: .8rem
}

.pagination button {
    background: #22221f;
    border: 1px solid var(--line);
    color: var(--ink);
    padding: 8px 10px;
    cursor: pointer
}

.pagination button:disabled {
    opacity: .35
}

.overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, .72);
    display: grid;
    place-items: center;
    padding: 20px;
    z-index: 10
}

.modal {
    position: relative;
    width: min(520px, 100%);
    background: #1b1b18;
    border: 1px solid #55544c;
    padding: 30px;
    display: grid;
    gap: 17px;
    box-shadow: 10px 10px 0 #090909
}

.modal h2 {
    font-size: 2rem;
    letter-spacing: -.05em;
    margin: 0
}

.modal label {
    display: grid;
    gap: 7px;
    font-size: .82rem
}

.modal label small {
    color: var(--muted)
}

fieldset {
    border: 0;
    padding: 0;
    display: flex;
    gap: 16px
}

.radio {
    display: block !important
}

.close {
    position: absolute;
    right: 15px;
    top: 12px;
    background: none;
    border: 0;
    color: var(--ink);
    font-size: 1.5rem;
    cursor: pointer
}

.reveal code {
    display: block;
    overflow-wrap: anywhere;
    background: #10100f;
    border-left: 3px solid var(--acid);
    padding: 14px;
    color: var(--acid);
    font-size: .85rem
}

.warning {
    color: #ffda83
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    align-items: center
}

@media(max-width:650px) {
    .masthead {
        align-items: start;
        flex-direction: column
    }

    .controls {
        flex-direction: column
    }

    .token-strip .line {
        display: none
    }
}
</style>
