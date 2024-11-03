// Definición de categorías disponibles
const CATEGORIES = {
    trabajo: { icon: '💼', color: '#FF6B6B' },
    personal: { icon: '😊', color: '#4ECDC4' },
    estudio: { icon: '📚', color: '#45B7D1' },
    ejercicio: { icon: '🏃', color: '#96CEB4' },
    salud: { icon: '🏥', color: '#FFEEAD' },
    compras: { icon: '🛒', color: '#D4A5A5' },
    otro: { icon: '📌', color: '#9EA1D4' }
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker registrado con éxito:', registration.scope);
        })
        .catch((error) => {
          console.log('Error al registrar el Service Worker:', error);
        });
    });
  }
let editingItem = null;

// Event Listeners
document.getElementById('add-activity').addEventListener('click', addOrUpdateActivity);
document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
document.getElementById('toggle-list').addEventListener('click', toggleList);
document.getElementById('toggle-calendar').addEventListener('click', toggleCalendar);

// Inicialización al cargar la página
window.onload = () => {
    loadActivities();
    setInterval(removeExpiredActivities, 60000); // Verificar cada minuto
    requestNotificationPermission();
    setupDailyReminders();
};

// Función para solicitar permisos de notificación
function requestNotificationPermission() {
    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }
}

// Función para mostrar notificaciones
function showNotification(title, options) {
    if (Notification.permission === 'granted') {
        new Notification(title, options);
    } else {
        console.log('Permiso para notificaciones no concedido.');
    }
}

// Función para cargar actividades desde localStorage
function loadActivities() {
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const activityList = document.getElementById('activities');
    activityList.innerHTML = '';

    // Ordenar actividades por fecha y prioridad
    activities.sort((a, b) => {
        const dateA = new Date(`${a.date}T${convertTimeTo24Hour(a.time)}`);
        const dateB = new Date(`${b.date}T${convertTimeTo24Hour(b.time)}`);
        if (dateA.getTime() === dateB.getTime()) {
            return getPriorityValue(b.priority) - getPriorityValue(a.priority);
        }
        return dateA - dateB;
    });

    activities.forEach(activity => {
        const listItem = createActivityElement(activity);
        activityList.appendChild(listItem);
    });
}

// Función para crear el elemento visual de la actividad
function createActivityElement(activity) {
    const listItem = document.createElement('li');
    const categoryInfo = CATEGORIES[activity.category || 'otro'];
    
    // Función para obtener el texto del recordatorio
    function getReminderText(reminderTime) {
        if (!reminderTime) return '';
        if (reminderTime === 'daily') return 'Diariamente';
        const time = parseInt(reminderTime);
        if (time === 1440) return '1 día antes';
        if (time === 60) return '1 hora antes';
        return `${time} minutos antes`;
    }
    
    listItem.innerHTML = `
        <div class="activity-content" style="border-left: 4px solid ${categoryInfo.color}">
            <div class="activity-header">
                <span class="category-icon">${categoryInfo.icon}</span>
                <span class="activity-time">${activity.time} - ${activity.date}</span>
                ${activity.priority ? `<span class="priority-badge priority-${activity.priority}">${getPriorityLabel(activity.priority)}</span>` : ''}
            </div>
            <div class="activity-name ${activity.completed ? 'completed' : ''}">
                ${activity.name}
            </div>
            <div class="activity-reminder">
                <i class="fas fa-bell"></i> Recordatorio: ${getReminderText(activity.reminderTime)}
            </div>
            <div class="buttons">
                <button class="complete-btn" onclick="toggleComplete(this)">
                    ${activity.completed ? '✓' : '○'}
                </button>
                <button class="modify" onclick="editActivity(this)">Modificar</button>
                <button class="delete" onclick="deleteActivity(this)">Eliminar</button>
            </div>
        </div>
    `;
    
    return listItem;
}

// Función para agregar o actualizar actividad
function addOrUpdateActivity() {
    const name = document.getElementById('activity-name').value;
    const time = document.getElementById('activity-time').value;
    const date = document.getElementById('activity-date').value;
    const category = document.getElementById('activity-category')?.value || 'otro';
    const priority = document.getElementById('activity-priority')?.value || 'medium';
    const reminderTime = document.getElementById('reminder-time').value;

    if (name && time && date) {
        const activityData = {
            name,
            time: formatTime(time),
            date,
            category,
            priority,
            completed: false,
            reminderTime: reminderTime,
            id: Date.now()
        };

        const activities = JSON.parse(localStorage.getItem('activities')) || [];

        if (editingItem) {
            const index = [...document.getElementById('activities').children].indexOf(editingItem);
            activities[index] = activityData;
        } else {
            activities.push(activityData);
            scheduleNotification(activityData);
        }

        localStorage.setItem('activities', JSON.stringify(activities));
        loadActivities();
        clearForm();
    } else {
        alert('Por favor complete todos los campos requeridos.');
    }
}

// Función para programar notificaciones
function scheduleNotification(activity) {
    const { name, time, date, reminderTime } = activity;
    if (reminderTime === 'daily') {
        const [hours, minutes] = time.split(':');
        const dailyNotificationTime = new Date();
        dailyNotificationTime.setHours(parseInt(hours));
        dailyNotificationTime.setMinutes(parseInt(minutes));
        dailyNotificationTime.setSeconds(0);
        dailyNotificationTime.setMilliseconds(0);

        if (dailyNotificationTime < new Date()) {
            dailyNotificationTime.setDate(dailyNotificationTime.getDate() + 1);
        }

        const timeUntilNotification = dailyNotificationTime - new Date();

        setTimeout(() => {
            showNotification('Recordatorio Diario', {
                body: `Es hora de: ${name}`,
                icon: 'path/to/icon.png'
            });
            scheduleNotification(activity); // Reprogramar para el día siguiente
        }, timeUntilNotification);
    } else {
        const activityDateTime = new Date(`${date}T${convertTimeTo24Hour(time)}`);
        const now = new Date();
        const timeUntilNotification = activityDateTime - now - reminderTime * 60 * 1000;

        if (timeUntilNotification > 0) {
            setTimeout(() => {
                showNotification('Recordatorio de Actividad', {
                    body: `En ${reminderTime} minutos: ${name}`,
                    icon: 'path/to/icon.png'
                });
            }, timeUntilNotification);
        }
    }
}

// Función para configurar recordatorios diarios
function setupDailyReminders() {
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    activities.forEach(activity => {
        if (activity.reminderTime === 'daily') {
            scheduleNotification(activity);
        }
    });
}

// Función para formatear tiempo
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = ( hours % 12) || 12;
    return `${formattedHours}:${minutes} ${period}`;
}

// Función para convertir tiempo a formato 24 horas
function convertTimeTo24Hour(time) {
    const [timePart, period] = time.split(' ');
    let [hours, minutes] = timePart.split(':');
    hours = parseInt(hours);

    if (period === 'PM' && hours !== 12) {
        hours += 12;
    } else if (period === 'AM' && hours === 12) {
        hours = 0;
    }

    return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Función para limpiar el formulario
function clearForm() {
    document.getElementById('activity-name').value = '';
    document.getElementById('activity-time').value = '';
    document.getElementById('activity-date').value = '';
    if (document.getElementById('activity-category')) {
        document.getElementById('activity-category').value = '';
    }
    if (document.getElementById('activity-priority')) {
        document.getElementById('activity-priority').value = '';
    }
    document.getElementById('reminder-time').value = '';
    document.getElementById('add-activity').textContent = 'Agregar Actividad';
    document.getElementById('cancel-edit').classList.add('hidden');
    editingItem = null;
}

// Función para cancelar edición
function cancelEdit() {
    clearForm();
    editingItem = null;
    document.getElementById('add-activity').removeEventListener('click', addOrUpdateActivity);
    document.getElementById('add-activity').addEventListener('click', addOrUpdateActivity);
}

// Función para alternar la lista de actividades
function toggleList() {
    const list = document.getElementById('activity-list');
    const button = document.getElementById('toggle-list');
    if (list.classList.contains('hidden')) {
        list.classList.remove('hidden');
        button.textContent = 'Ocultar Actividades';
    } else {
        list.classList.add('hidden');
        button.textContent = 'Mostrar Actividades';
    }
}

// Función para eliminar actividad
function deleteActivity(button) {
    const confirmDelete = confirm('¿Estás seguro de que quieres eliminar esta actividad?');
    if (confirmDelete) {
        const listItem = button.closest('li');
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        const index = [...document.getElementById('activities').children].indexOf(listItem);
        
        activities.splice(index, 1);
        localStorage.setItem('activities', JSON.stringify(activities));
        loadActivities();
    }
}

// Función para editar actividad
function editActivity(button) {
    const listItem = button.closest('li');
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const index = [...document.getElementById('activities').children].indexOf(listItem);
    const activity = activities[index];

    document.getElementById('activity-name').value = activity.name;
    document.getElementById('activity-time').value = convertTimeTo24Hour(activity.time);
    document.getElementById('activity-date').value = activity.date;
    
    if (document.getElementById('activity-category')) {
        document.getElementById('activity-category').value = activity.category || 'otro';
    }
    if (document.getElementById('activity-priority')) {
        document.getElementById('activity-priority').value = activity.priority || ' medium';
    }
    document.getElementById('reminder-time').value = activity.reminderTime || '';

    editingItem = listItem;
    document.getElementById('add-activity').textContent = 'Actualizar Actividad';
    document.getElementById('cancel-edit').classList.remove('hidden');
}

// Función para alternar el estado completado
function toggleComplete(button) {
    const listItem = button.closest('li');
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const index = [...document.getElementById('activities').children].indexOf(listItem);
    
    activities[index].completed = !activities[index].completed;
    localStorage.setItem('activities', JSON.stringify(activities));
    loadActivities();
}

// Función para obtener el valor numérico de la prioridad
function getPriorityValue(priority) {
    const priorities = { high: 3, medium: 2, low: 1 };
    return priorities[priority] || 0;
}

// Función para obtener la etiqueta de la prioridad
function getPriorityLabel(priority) {
    const labels = {
        high: 'Alta',
        medium: 'Media',
        low: 'Baja'
    };
    return labels[priority] || '';
}

// Función para remover actividades expiradas
function removeExpiredActivities() {
    const now = new Date();
    let activities = JSON.parse(localStorage.getItem('activities')) || [];

    activities = activities.filter(activity => {
        const activityDateTime = new Date(`${activity.date}T${convertTimeTo24Hour(activity.time)}`);
        return activityDateTime > now;
    });

    localStorage.setItem('activities', JSON.stringify(activities));
    loadActivities();
}

// Función para mostrar u ocultar el calend ario
function toggleCalendar() {
    const calendarContainer = document.getElementById('calendar-container');
    if (calendarContainer.classList.contains('hidden')) {
        calendarContainer.classList.remove('hidden');
        document.getElementById('toggle-calendar').textContent = 'Ocultar Calendario';
    } else {
        calendarContainer.classList.add('hidden');
        document.getElementById('toggle-calendar').textContent = 'Mostrar Calendario';
    }
}

// Solicitar permiso para notificaciones al cargar el script
requestNotificationPermission();

// Funcionalidad del calendario
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    const currentMonthElement = document.getElementById('currentMonth');
    const calendarDays = document.getElementById('calendar-days');

    // Variables del calendario
    let currentDate = new Date();
    let selectedDate = new Date();

    // Funciones del calendario
    function updateCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Actualizar título del mes
        currentMonthElement.textContent = new Date(year, month).toLocaleString('es', { month: 'long', year: 'numeric' });
        
        // Limpiar días existentes
        calendarDays.innerHTML = '';
        
        // Obtener el primer día del mes y total de días
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Añadir espacios en blanco para los días antes del primer día del mes
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendarDays.appendChild(emptyDay);
        }
        
        // Obtener actividades del mes actual
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        const activityDates = new Set(activities.map(activity => activity.date));
        
        // Crear los días del mes
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            // Crear una fecha en formato YYYY-MM-DD para comparaciones
            const currentDateStr = new Date(year, month, day).toISOString().split('T')[0];
            
            // Marcar días con actividades
            if (activityDates.has(currentDateStr)) {
                dayElement.classList.add('has-activity');
                dayElement.style.color = 'red';  // Marcar en rojo
            }
            
            // Marcar el día actual
            const today = new Date();
            if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
                dayElement.classList.add('today');
            }
            
            // Evento click para mostrar actividades del día
            dayElement.addEventListener('click', () => {
                const selectedActivities = activities.filter(activity => activity.date === currentDateStr);
                if (selectedActivities.length > 0) {
                    showActivitiesForDate(selectedActivities, currentDateStr);
                } else {
                    alert("No hay actividades para esta fecha .");
                }
            });
            
            calendarDays.appendChild(dayElement);
        }
    }

    // Mostrar actividades para una fecha específica
    function showActivitiesForDate(activities, date) {
        const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('es', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        let message = `Actividades para ${formattedDate}:\n\n`;
        activities.forEach(activity => {
            message += `• ${activity.time} - ${activity.name} (${getPriorityLabel(activity.priority)})\n`;
        });
        
        alert(message);
    }

    // Eventos de navegación del calendario
    prevMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar();
    });

    nextMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar();
    });

    // Inicializar calendario
    updateCalendar ();

    // Actualizar calendario cuando se añadan o modifiquen actividades
    const originalAddOrUpdateActivity = window.addOrUpdateActivity;
    window.addOrUpdateActivity = function() {
        originalAddOrUpdateActivity.apply(this, arguments);
        updateCalendar();
    };
    
});
