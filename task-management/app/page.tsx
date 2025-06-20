"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Calendar, Filter, Moon, AlertTriangle } from "lucide-react"
import { useTheme } from "next-themes"

interface Task {
  id: string
  title: string
  description: string
  priority: "low" | "medium" | "high"
  status: "pending" | "in-progress" | "completed"
  dueDate: string
  createdAt: string
  updatedAt: string
}

type FilterType = "all" | "pending" | "in-progress" | "completed"

export default function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [filter, setFilter] = useState<FilterType>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium" as Task["priority"],
    status: "pending" as Task["status"],
    dueDate: "",
  })
  const [showDetailedSorting, setShowDetailedSorting] = useState(false)

  const { theme, setTheme } = useTheme()

  // After mounting, we can show the theme UI
  useEffect(() => {
    setMounted(true)
  }, [])

  // Load tasks from localStorage on component mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("tasks")
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
  }, [])

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks))
  }, [tasks])

  const generateId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      priority: "medium",
      status: "pending",
      dueDate: "",
    })
  }

  const handleAddTask = () => {
    if (!formData.title.trim()) return

    const newTask: Task = {
      id: generateId(),
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setTasks((prev) => [...prev, newTask])
    resetForm()
    setIsAddDialogOpen(false)
  }

  const handleEditTask = () => {
    if (!editingTask || !formData.title.trim()) return

    const updatedTask: Task = {
      ...editingTask,
      title: formData.title,
      description: formData.description,
      priority: formData.priority,
      status: formData.status,
      dueDate: formData.dueDate,
      updatedAt: new Date().toISOString(),
    }

    setTasks((prev) => prev.map((task) => (task.id === editingTask.id ? updatedTask : task)))

    resetForm()
    setEditingTask(null)
    setIsEditDialogOpen(false)
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId))
  }

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: task.status === "completed" ? "pending" : "completed",
              updatedAt: new Date().toISOString(),
            }
          : task,
      ),
    )
  }

  const openEditDialog = (task: Task) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
    })
    setIsEditDialogOpen(true)
  }

  // Priority sorting function
  const getPriorityOrder = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return 1
      case "medium":
        return 2
      case "low":
        return 3
      default:
        return 4
    }
  }

  // Calculate days until due date
  const getDaysUntilDue = (dueDate: string) => {
    if (!dueDate) return null

    // Create today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Create due date at midnight
    const due = new Date(dueDate + "T00:00:00")
    due.setHours(0, 0, 0, 0)

    // Calculate difference in milliseconds
    const diffTime = due.getTime() - today.getTime()

    // Convert to days (don't use Math.ceil, use Math.floor for accurate calculation)
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

    return diffDays
  }

  // Filter by status and sort by priority
  const filteredAndSortedTasks = tasks
    .filter((task) => {
      if (filter === "all") return true
      return task.status === filter
    })
    .sort((a, b) => {
      // Calculate urgency and days until due for both tasks
      const daysUntilDueA = getDaysUntilDue(a.dueDate)
      const daysUntilDueB = getDaysUntilDue(b.dueDate)

      const isOverdueA = daysUntilDueA !== null && daysUntilDueA < 0 && a.status !== "completed"
      const isOverdueB = daysUntilDueB !== null && daysUntilDueB < 0 && b.status !== "completed"

      const isUrgentA = daysUntilDueA !== null && daysUntilDueA <= 2 && daysUntilDueA >= 0 && a.status !== "completed"
      const isUrgentB = daysUntilDueB !== null && daysUntilDueB <= 2 && daysUntilDueB >= 0 && b.status !== "completed"

      // If one is overdue and the other is not, overdue comes first
      if (isOverdueA && !isOverdueB) return -1
      if (!isOverdueA && isOverdueB) return 1

      // If both are overdue, sort by highest days overdue to lowest days overdue
      if (isOverdueA && isOverdueB) {
        // Sort by days overdue (most overdue first - more negative numbers first)
        if (daysUntilDueA !== daysUntilDueB) {
          return (daysUntilDueA || 0) - (daysUntilDueB || 0) // More negative comes first
        }
        // If same number of overdue days, sort by priority (high to low)
        return getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
      }

      // If one is urgent and the other is not (and neither is overdue), urgent comes first
      if (isUrgentA && !isUrgentB) return -1
      if (!isUrgentA && isUrgentB) return 1

      // If both are urgent, sort by priority only (high to low)
      if (isUrgentA && isUrgentB) {
        return getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
      }

      // If both are normal tasks, sort by priority only (high to low)
      return getPriorityOrder(a.priority) - getPriorityOrder(b.priority)
    })

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900"
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900"
      case "low":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
    }
  }

  const getStatusColor = (status: Task["status"]) => {
    switch (status) {
      case "completed":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900"
      case "in-progress":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
      case "pending":
        return "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "No due date"
    const date = new Date(dateString + "T00:00:00")
    return date.toLocaleDateString()
  }

  // Handle theme toggle
  const handleThemeToggle = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  // Get overdue and urgent counts
  const overdueCount = tasks.filter(
    (t) => getDaysUntilDue(t.dueDate) !== null && getDaysUntilDue(t.dueDate)! < 0 && t.status !== "completed",
  ).length

  const urgentCount = tasks.filter(
    (t) =>
      getDaysUntilDue(t.dueDate) !== null &&
      getDaysUntilDue(t.dueDate)! <= 2 &&
      getDaysUntilDue(t.dueDate)! >= 0 &&
      t.status !== "completed",
  ).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Task Management</h1>
            <p className="text-gray-600 dark:text-white">
              Organize and track your tasks efficiently - automatically sorted by priority
            </p>
          </div>
          {mounted && (
            <div className="flex items-center gap-2">
              <Moon className="h-4 w-4 text-gray-700 dark:text-white" />
              <Switch checked={theme === "dark"} onCheckedChange={handleThemeToggle} aria-label="Toggle dark mode" />
              <span className="text-sm text-gray-700 dark:text-white">Dark Mode</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add New Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>Create a new task to add to your list.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter task description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: Task["priority"]) => setFormData((prev) => ({ ...prev, priority: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: Task["status"]) => setFormData((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTask}>Add Task</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 dark:text-white" />
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="dark:border-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold dark:text-white">{tasks.length}</div>
              <div className="text-sm text-gray-600 dark:text-white">Total Tasks</div>
            </CardContent>
          </Card>
          {overdueCount > 0 && (
            <Card className="border-red-500 bg-red-50 dark:bg-red-50/10 dark:border-red-500">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-500">{overdueCount}</div>
                <div className="text-sm text-red-600 dark:text-red-500">Overdue</div>
              </CardContent>
            </Card>
          )}
          {urgentCount > 0 && (
            <Card className="border-orange-500 bg-orange-50 dark:bg-orange-50/10 dark:border-orange-500">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-500">{urgentCount}</div>
                <div className="text-sm text-orange-600 dark:text-orange-500">Urgent</div>
              </CardContent>
            </Card>
          )}
          <Card className="dark:border-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600 dark:text-white">
                {tasks.filter((t) => t.status === "pending").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-white">Pending</div>
            </CardContent>
          </Card>
          <Card className="dark:border-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {tasks.filter((t) => t.status === "in-progress").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-white">In Progress</div>
            </CardContent>
          </Card>
          <Card className="dark:border-white">
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {tasks.filter((t) => t.status === "completed").length}
              </div>
              <div className="text-sm text-gray-600 dark:text-white">Completed</div>
            </CardContent>
          </Card>
        </div>

        {/* Priority Legend */}
        <div className="mb-4">
          <div className="flex flex-col gap-2 text-sm text-gray-600 dark:text-white">
            <div className="flex items-center gap-4">
              <span className="font-semibold">Sorting Order:</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900">
                  High
                </Badge>
                <span>&gt;</span>
                <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900">
                  Medium
                </Badge>
                <span>&gt;</span>
                <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900">
                  Low
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-semibold">Overall Sorting Order:</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white border-red-600 text-xs hover:bg-red-500 dark:hover:bg-red-500">
                  OVERDUE
                </Badge>
                <span>&gt;</span>
                <Badge className="bg-orange-500 text-white border-orange-600 text-xs hover:bg-orange-500 dark:hover:bg-orange-500">
                  URGENT
                </Badge>
                <span>&gt;</span>
                <span>Normal Tasks</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetailedSorting(!showDetailedSorting)}
                className="ml-auto text-xs"
              >
                {showDetailedSorting ? "Hide Details" : "Show Details"}
              </Button>
            </div>

            {showDetailedSorting && (
              <>
                <div className="flex items-center gap-4">
                  <span>Overdue Tasks (&lt;0 days):</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 dark:bg-red-900 px-2 py-1 rounded">Most Overdue</span>
                    <span>&gt;</span>
                    <span className="text-xs bg-red-100 dark:bg-red-900 px-2 py-1 rounded">Less Overdue</span>
                    <span className="text-sm mx-2">then by</span>
                    <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900">
                      High
                    </Badge>
                    <span>&gt;</span>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900">
                      Medium
                    </Badge>
                    <span>&gt;</span>
                    <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900">
                      Low
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span>Urgent Tasks (0-2 days):</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900">
                      High
                    </Badge>
                    <span>&gt;</span>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900">
                      Medium
                    </Badge>
                    <span>&gt;</span>
                    <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900">
                      Low
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span>Normal Tasks (&gt;2 days):</span>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 border-red-200 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-900">
                      High
                    </Badge>
                    <span>&gt;</span>
                    <Badge className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900">
                      Medium
                    </Badge>
                    <span>&gt;</span>
                    <Badge className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 border-green-200 dark:border-green-700 hover:bg-green-100 dark:hover:bg-green-900">
                      Low
                    </Badge>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Task List */}
        <div className="grid gap-4">
          {filteredAndSortedTasks.length === 0 ? (
            <Card className="dark:border-white">
              <CardContent className="p-8 text-center">
                <div className="text-gray-500 dark:text-white">
                  {filter === "all" ? "No tasks yet. Create your first task!" : `No ${filter} tasks found.`}
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredAndSortedTasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate)
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0 && task.status !== "completed"
              const isUrgent =
                daysUntilDue !== null && daysUntilDue <= 2 && daysUntilDue >= 0 && task.status !== "completed"

              return (
                <Card
                  key={task.id}
                  className={`hover:shadow-md transition-all duration-300 ${
                    isOverdue
                      ? "border-red-500 animate-pulse border-2 hover:shadow-red-500/50 hover:shadow-lg"
                      : isUrgent
                        ? "border-orange-500 border-2 hover:shadow-orange-500/50 hover:shadow-lg"
                        : "dark:border-white"
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={task.status === "completed"}
                          onCheckedChange={() => handleToggleComplete(task.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={`font-semibold text-lg ${
                                task.status === "completed"
                                  ? "line-through text-gray-500 dark:text-gray-400"
                                  : "dark:text-white"
                              }`}
                            >
                              {task.title}
                            </h3>
                            {isOverdue && (
                              <Badge className="bg-red-500 text-white border-red-600 text-xs flex items-center gap-1 hover:bg-red-500 dark:hover:bg-red-500">
                                <AlertTriangle className="w-3 h-3" /> OVERDUE
                              </Badge>
                            )}
                            {isUrgent && !isOverdue && (
                              <Badge className="bg-orange-500 text-white border-orange-600 text-xs hover:bg-orange-500 dark:hover:bg-orange-500">
                                URGENT
                              </Badge>
                            )}
                          </div>
                          {task.description && <p className="text-gray-600 dark:text-white mt-1">{task.description}</p>}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                            <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
                            {task.dueDate && (
                              <div
                                className={`flex items-center gap-1 text-sm ${
                                  isOverdue
                                    ? "text-red-600 dark:text-red-400 font-semibold"
                                    : isUrgent
                                      ? "text-orange-600 dark:text-orange-400 font-semibold"
                                      : "text-gray-500 dark:text-white"
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {formatDate(task.dueDate)}
                                {daysUntilDue !== null && (
                                  <span className="ml-1">
                                    (
                                    {daysUntilDue === 0
                                      ? "Due today"
                                      : daysUntilDue === 1
                                        ? "Due tomorrow"
                                        : daysUntilDue < 0
                                          ? `${Math.abs(daysUntilDue)} days overdue`
                                          : `${daysUntilDue} days left`}
                                    )
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(task)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>Make changes to your task here.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter task title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: Task["priority"]) => setFormData((prev) => ({ ...prev, priority: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: Task["status"]) => setFormData((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditTask}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
