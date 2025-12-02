<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/services/api'

const router = useRouter()
const auth = useAuthStore()

const tasks = ref([])
const newTaskName = ref('')
const newTaskDescription = ref('')
const loading = ref(false)
const error = ref('')

let pollingInterval = null

async function fetchTasks() {
  try {
    const response = await api.get('/tasks')
    tasks.value = response.data
  } catch (err) {
    error.value = 'Failed to load tasks'
  }
}

async function createTask() {
  if (!newTaskName.value.trim()) return

  loading.value = true
  error.value = ''

  try {
    const response = await api.post('/tasks', {
      name: newTaskName.value,
      description: newTaskDescription.value,
    })
    tasks.value.unshift(response.data.task)
    newTaskName.value = ''
    newTaskDescription.value = ''
  } catch (err) {
    error.value = 'Failed to create task'
  } finally {
    loading.value = false
  }
}

async function deleteTask(taskId) {
  try {
    await api.delete(`/tasks/${taskId}`)
    tasks.value = tasks.value.filter((t) => t.id !== taskId)
  } catch (err) {
    error.value = 'Failed to delete task'
  }
}

async function refreshTask(taskId) {
  try {
    const response = await api.get(`/tasks/${taskId}`)
    const index = tasks.value.findIndex((t) => t.id === taskId)
    if (index !== -1) {
      tasks.value[index] = response.data
    }
  } catch (err) {
    error.value = 'Failed to refresh task'
  }
}

// Auto-refresh tasks that are pending or processing
async function pollActiveTasks() {
  const activeTasks = tasks.value.filter(
    (t) => t.status === 'pending' || t.status === 'processing'
  )

  for (const task of activeTasks) {
    await refreshTask(task.id)
  }
}

function startPolling() {
  pollingInterval = setInterval(pollActiveTasks, 2000) // Every 2 seconds
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

function getStatusColor(status) {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

async function handleLogout() {
  await auth.logout()
  router.push('/login')
}

onMounted(() => {
  fetchTasks()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <!-- Header -->
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <h1 class="text-xl font-bold text-gray-900">TaskFlow Dashboard</h1>
        <div class="flex items-center gap-4">
          <span class="text-gray-600">{{ auth.user?.name }}</span>
          <button
            @click="handleLogout"
            class="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-8">
      <!-- Error message -->
      <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {{ error }}
      </div>

      <!-- Create task form -->
      <div class="bg-white rounded-lg shadow p-6 mb-8">
        <h2 class="text-lg font-semibold mb-4">Create New Task</h2>
        <form @submit.prevent="createTask" class="flex flex-col gap-4">
          <div>
            <input
              v-model="newTaskName"
              type="text"
              placeholder="Task name"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <textarea
              v-model="newTaskDescription"
              placeholder="Description (optional)"
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>
          <button
            type="submit"
            :disabled="loading"
            class="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 self-start"
          >
            {{ loading ? 'Creating...' : 'Create Task' }}
          </button>
        </form>
      </div>

      <!-- Tasks list -->
      <div class="bg-white rounded-lg shadow">
        <div class="p-6 border-b">
          <h2 class="text-lg font-semibold">Your Tasks</h2>
        </div>

        <div v-if="tasks.length === 0" class="p-6 text-center text-gray-500">
          No tasks yet. Create your first task above!
        </div>

        <ul v-else class="divide-y">
          <li v-for="task in tasks" :key="task.id" class="p-6">
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h3 class="font-medium text-gray-900">{{ task.name }}</h3>
                <p v-if="task.description" class="text-gray-600 text-sm mt-1">
                  {{ task.description }}
                </p>

                <!-- Status badge -->
                <div class="flex items-center gap-2 mt-2">
                  <span
                    :class="getStatusColor(task.status)"
                    class="inline-block px-2 py-1 text-xs font-medium rounded"
                  >
                    {{ task.status }}
                  </span>

                  <!-- Processing indicator -->
                  <span v-if="task.status === 'processing'" class="flex items-center text-blue-500 text-xs">
                    <svg class="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Processing...
                  </span>
                </div>

                <!-- Progress bar -->
                <div v-if="task.status === 'processing' || task.progress > 0" class="mt-3">
                  <div class="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      class="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                      :style="{ width: task.progress + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs text-gray-500 mt-1">{{ task.progress }}% complete</span>
                </div>

                <!-- Result -->
                <p v-if="task.result" class="text-sm text-green-600 mt-2">
                  ✓ {{ task.result }}
                </p>
              </div>

              <div class="flex gap-2 ml-4">
                <button
                  @click="refreshTask(task.id)"
                  class="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Refresh
                </button>
                <button
                  @click="deleteTask(task.id)"
                  class="text-red-500 hover:text-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </main>
  </div>
</template>