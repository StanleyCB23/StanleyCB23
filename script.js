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

let editingItem = null;

// Event Listeners
document.getElementById('add-activity').addEventListener('click', addOrUpdateActivity);
document.getElementById('cancel-edit').addEventListener('click', cancelEdit);
document.getElementById('toggle-list').addEventListener('click', toggleList);

// Inicialización al cargar la página
window.onload = () => {
    loadActivities();
    setInterval(removeExpiredActivities, 60000); // Verificar cada minuto
    requestNotificationPermission();
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

    if (name && time && date) {
        const activityData = {
            name,
            time: formatTime(time),
            date,
            category,
            priority,
            completed: false,
            id: Date.now()
        };

        const activities = JSON.parse(localStorage.getItem('activities')) || [];

        if (editingItem) {
            // Actualizar actividad existente
            const index = [...document.getElementById('activities').children].indexOf(editingItem);
            activities[index] = activityData;
        } else {
            // Agregar nueva actividad
            activities.push(activityData);
            // Programar notificación
            scheduleNotification(name, time, date);
        }

        localStorage.setItem('activities', JSON.stringify(activities));
        loadActivities();
        clearForm();
    } else {
        alert('Por favor complete todos los campos requeridos.');
    }
}

// Función para programar notificaciones
function scheduleNotification(name, time, date) {
    const activityDateTime = new Date(`${date}T${convertTimeTo24Hour(time)}`);
    const now = new Date();
    const timeUntilNotification = activityDateTime - now - 5 * 60 * 1000; // 5 minutos antes

    if (timeUntilNotification > 0) {
        setTimeout(() => {
            showNotification('Recordatorio de Actividad', {
                body: `En 5 minutos: ${name}`,
                icon: 'path/to/icon.png' // Opcional: reemplaza con la ruta a un icono
            });
        }, timeUntilNotification);
    }
}

// Función para formatear tiempo
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12) || 12;
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
        document.getElementById('activity-priority').value = activity.priority || 'medium';
    }

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

// Solicitar permiso para notificaciones al cargar el script
requestNotificationPermission();

// Funcionalidad del menú y calendario
document.addEventListener('DOMContentLoaded', () => {
    // Referencias a elementos del DOM
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const closeSidebar = document.getElementById('close-sidebar');
    const container = document.querySelector('.container');
    const prevMonth = document.getElementById('prevMonth');
    const nextMonth = document.getElementById('nextMonth');
    const currentMonthElement = document.getElementById('currentMonth');
    const calendarDays = document.getElementById('calendar-days');

    // Variables del calendario
    let currentDate = new Date();
    let selectedDate = new Date();

    // Funciones del menú
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        container.classList.add('shifted');
    });

    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('active');
        container.classList.remove('shifted');
    });

    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target) && sidebar.classList.contains('active')) {
            sidebar.classList.remove('active');
            container.classList.remove('shifted');
        }
    });

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
            
            // Formatear la fecha actual para comparar con las actividades
            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            
            // Marcar días con actividades
            if (activityDates.has(currentDateStr)) {
                dayElement.classList.add('has-activity');
            }
            
            // Marcar el día actual
            if (new Date().toDateString() === new Date(year, month, day).toDateString()) {
                dayElement.classList.add('today');
            }
            
            // Evento click para mostrar actividades del día
            dayElement.addEventListener('click', () => {
                const selectedActivities = activities.filter(activity => activity.date === currentDateStr);
                if (selectedActivities.length > 0) {
                    showActivitiesForDate(selectedActivities, currentDateStr);
                }
            });
            
            calendarDays.appendChild(dayElement);
        }
    }

    // Mostrar actividades para una fecha específica
    function showActivitiesForDate(activities, date) {
        const formattedDate = new Date(date).toLocaleDateString('es', {
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
    updateCalendar();

    // Actualizar calendario cuando se añadan o modifiquen actividades
    const originalAddOrUpdateActivity = window.addOrUpdateActivity;
    window.addOrUpdateActivity = function() {
        originalAddOrUpdateActivity.apply(this, arguments);
        updateCalendar();
    };
});