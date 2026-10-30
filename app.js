
let supabaseUrl = "";
let supabaseKey = "";
let tableName = "tasks";

let editingTaskId = null;

const taskForm = document.getElementById("task-form");
const taskTitle = document.getElementById("task-title");
const taskDescription = document.getElementById("task-description");
const taskSubmit = document.getElementById("task-submit");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

async function loadConfig() {
    try {
        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("Cannot load config.json");
        }

        const config = await response.json();

        supabaseUrl = config.supabaseUrl;
        supabaseKey = config.supabasePublishableKey;
        tableName = config.tableName;

        if (!supabaseUrl || !supabaseKey || tableName !== "tasks") {
            throw new Error("Invalid Supabase configuration");
        }

        await loadTasks();

    } catch (error) {
        showMessage("Configuration error: " + error.message);
    }
}

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": "Bearer " + supabaseKey
    };
}

function showMessage(message, isError = true) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#dc2626" : "#16a34a";
}

async function loadTasks() {
    try {
        const response = await fetch(
            `${supabaseUrl}/rest/v1/${tableName}?select=*&order=id.asc`,
            {
                method: "GET",
                headers: getHeaders()
            }
        );

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const tasks = await response.json();

        displayTasks(tasks);
        showMessage("", false);

    } catch (error) {
        showMessage("Error loading tasks: " + error.message);
    }
}

function displayTasks(tasks) {
    taskList.replaceChildren();

    if (tasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No tasks yet. Add your first task!";
        taskList.appendChild(emptyMessage);
        return;
    }

    tasks.forEach(task => {
        const taskItem = document.createElement("div");
        taskItem.className = "task-item";
        taskItem.dataset.id = task.id;

        if (task.completed) {
            taskItem.classList.add("completed");
        }

        const info = document.createElement("div");
        info.className = "task-info";

        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("div");
        description.className = "task-description";
        description.textContent = task.description || "";

        const status = document.createElement("div");
        status.className = "task-status";
        status.textContent = task.completed ? "Completed" : "Incomplete";

        info.append(title, description, status);

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-task";
        editButton.textContent = "Edit";

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.textContent = "Delete";

        const toggleButton = document.createElement("button");
        toggleButton.className = "toggle-task";
        toggleButton.textContent = task.completed ? "Undo" : "Complete";

        actions.append(editButton, deleteButton, toggleButton);
        taskItem.append(info, actions);

        taskList.appendChild(taskItem);
    });
}

taskForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const title = taskTitle.value.trim();
    const description = taskDescription.value.trim();

    if (!title) {
        showMessage("Please enter a task title.");
        return;
    }

    try {
        taskSubmit.disabled = true;

        const taskData = {
            title: title,
            description: description,
            completed: false
        };

        let url = `${supabaseUrl}/rest/v1/${tableName}`;
        let method = "POST";

        if (editingTaskId !== null) {
            url += `?id=eq.${editingTaskId}`;
            method = "PATCH";
            delete taskData.completed;
        }

        const response = await fetch(url, {
            method: method,
            headers: {
                ...getHeaders(),
                "Prefer": "return=representation"
            },
            body: JSON.stringify(taskData)
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        taskForm.reset();
        editingTaskId = null;
        taskSubmit.textContent = "Add Task";

        showMessage(
            method === "POST" ? "Task added successfully!" : "Task updated successfully!",
            false
        );

        await loadTasks();

    } catch (error) {
        showMessage("Error saving task: " + error.message);
    } finally {
        taskSubmit.disabled = false;
    }
});

taskList.addEventListener("click", async function(event) {
    const button = event.target;

    const taskItem = button.closest(".task-item");

    if (!taskItem) return;

    const taskId = taskItem.dataset.id;

    try {
        if (button.classList.contains("edit-task")) {
            const response = await fetch(
                `${supabaseUrl}/rest/v1/${tableName}?id=eq.${taskId}&select=*`,
                {
                    headers: getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            const tasks = await response.json();

            if (tasks.length === 0) {
                throw new Error("Task not found");
            }

            const task = tasks[0];

            editingTaskId = task.id;
            taskTitle.value = task.title;
            taskDescription.value = task.description || "";
            taskSubmit.textContent = "Save Changes";

            taskTitle.focus();

        } else if (button.classList.contains("delete-task")) {
            if (!confirm("Are you sure you want to delete this task?")) {
                return;
            }

            const response = await fetch(
                `${supabaseUrl}/rest/v1/${tableName}?id=eq.${taskId}`,
                {
                    method: "DELETE",
                    headers: getHeaders()
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            showMessage("Task deleted successfully!", false);
            await loadTasks();

        } else if (button.classList.contains("toggle-task")) {
            const isCompleted = taskItem.classList.contains("completed");

            const response = await fetch(
                `${supabaseUrl}/rest/v1/${tableName}?id=eq.${taskId}`,
                {
                    method: "PATCH",
                    headers: {
                        ...getHeaders(),
                        "Prefer": "return=representation"
                    },
                    body: JSON.stringify({
                        completed: !isCompleted
                    })
                }
            );

            if (!response.ok) {
                throw new Error(await response.text());
            }

            showMessage("Task status updated!", false);
            await loadTasks();
        }

    } catch (error) {
        showMessage("Operation failed: " + error.message);
    }
});

loadConfig();
