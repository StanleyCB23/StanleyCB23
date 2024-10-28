// Definición de categorías disponibles con soporte para emojis en móvil
const CATEGORIES = {
    trabajo: { icon: '💼', color: '#FF6B6B' },
    personal: { icon: '😊', color: '#4ECDC4' },
    estudio: { icon: '📚', color: '#45B7D1' },
    ejercicio: { icon: '🏃', color: '#96CEB4' },
    salud: { icon: '🏥', color: '#FFEEAD' },
    compras: { icon: '🛒', color: '#D4A5A5' },
    otro: { icon: '📌', color: '#9EA1D4' }
};

// Cache de elementos DOM
const DOM = {
    activityList: null,
    form: null,
    sidebar: null,
    calendar: null
};

// Estado de la aplicación
const state = {
    editingItem: null,
    touchStartX: 0,
    touchEndX: 0,
    isScrolling: false
};

// Inicialización con lazy loading
document.addEventListener('DOMContentLoaded', () => {
    initializeDOM();
    initializeEventListeners();
    loadActivities();
    
    // Usar RequestAnimationFrame para animaciones suaves
    requestAnimationFrame(() => {
        updateCalendar();
    });

    // Lazy load de funcionalidades no críticas
    setTimeout(() => {
        initializeNotifications();
        setInterval(removeExpiredActivities, 60000);
    }, 1000);
});

// Inicialización del DOM con performance optimization
function initializeDOM() {
    DOM.activityList = document.getElementById('activities');
    DOM.form = {
        name: document.getElementById('activity-name'),
        time: document.getElementById('activity-time'),
        date: document.getElementById('activity-date'),
        category: document.getElementById('activity-category'),
        priority: document.getElementById('activity-priority'),
        addButton: document.getElementById('add-activity'),
        cancelButton: document.getElementById('cancel-edit')
    };
    DOM.sidebar = document.getElementById('sidebar');
    DOM.calendar = {
        container: document.getElementById('calendar-days'),
        monthElement: document.getElementById('currentMonth'),
        prevButton: document.getElementById('prevMonth'),
        nextButton: document.getElementById('nextMonth')
    };
}

// Event listeners optimizados para móvil
function initializeEventListeners() {
    // Usar delegación de eventos para mejor performance
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Evento único para el formulario
    const form = document.querySelector('form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        addOrUpdateActivity();
    });

    // Optimizar eventos del calendario
    if (DOM.calendar.prevButton) {
        DOM.calendar.prevButton.addEventListener('click', debounce(navigateMonth.bind(null, -1), 300));
    }
    if (DOM.calendar.nextButton) {
        DOM.calendar.nextButton.addEventListener('click', debounce(navigateMonth.bind(null, 1), 300));
    }

    // Optimizar cierre del sidebar
    document.addEventListener('click', (e) => {
        if (!DOM.sidebar.contains(e.target) && 
            !document.getElementById('menu-toggle').contains(e.target) && 
            DOM.sidebar.classList.contains('active')) {
            closeSidebar();
        }
    }, { passive: true });
}

// Manejadores de eventos touch optimizados
function handleTouchStart(e) {
    if (e.touches.length !== 1) return;
    state.touchStartX = e.touches[0].clientX;
    state.isScrolling = false;
}

function handleTouchMove(e) {
    if (e.touches.length !== 1) return;
    state.touchEndX = e.touches[0].clientX;
    
    // Detectar scroll vertical para evitar conflictos
    if (Math.abs(e.touches[0].clientY - e.touches[0].screenY) > 10) {
        state.isScrolling = true;
    }
}

function handleTouchEnd() {
    if (state.isScrolling) return;
    
    const swipeDistance = state.touchEndX - state.touchStartX;
    if (Math.abs(swipeDistance) > 100) { // Umbral de swipe
        if (swipeDistance > 0) {
            openSidebar();
        } else {
            closeSidebar();
        }
    }
}

// Funciones de utilidad optimizadas
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Funciones de localStorage optimizadas
function saveActivities(activities) {
    try {
        const serializedData = JSON.stringify(activities);
        localStorage.setItem('activities', serializedData);
    } catch (e) {
        console.error('Error saving to localStorage:', e);
        // Implementar fallback si localStorage está lleno
        cleanupOldActivities();
    }
}

function loadActivities() {
    try {
        const activities = JSON.parse(localStorage.getItem('activities')) || [];
        renderActivities(activities);
    } catch (e) {
        console.error('Error loading activities:', e);
        return [];
    }
}

// Renderizado optimizado de actividades
function renderActivities(activities) {
    if (!DOM.activityList) return;

    // Usar DocumentFragment para mejor performance
    const fragment = document.createDocumentFragment();
    
    activities
        .sort((a, b) => {
            const dateA = new Date(`${a.date}T${convertTimeTo24Hour(a.time)}`);
            const dateB = new Date(`${b.date}T${convertTimeTo24Hour(b.time)}`);
            return dateA - dateB || getPriorityValue(b.priority) - getPriorityValue(a.priority);
        })
        .forEach(activity => {
            fragment.appendChild(createActivityElement(activity));
        });

    // Actualizar DOM una sola vez
    DOM.activityList.innerHTML = '';
    DOM.activityList.appendChild(fragment);
}

// Optimización de memoria
function cleanupOldActivities() {
    const activities = JSON.parse(localStorage.getItem('activities')) || [];
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    const filteredActivities = activities.filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= oneMonthAgo;
    });
    
    saveActivities(filteredActivities);
}

// Optimización de notificaciones
function initializeNotifications() {
    if ('Notification' in window) {
        if (Notification.permission !== 'granted') {
            Notification.requestPermission();
        }
    }
}

function scheduleNotification(name, time, date) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const activityDateTime = new Date(`${date}T${convertTimeTo24Hour(time)}`);
    const now = new Date();
    const timeUntilNotification = activityDateTime - now - 5 * 60 * 1000;

    if (timeUntilNotification > 0) {
        // Usar setTimeout solo para notificaciones próximas
        if (timeUntilNotification < 2147483647) {
            setTimeout(() => {
                new Notification('Recordatorio de Actividad', {
                    body: `En 5 minutos: ${name}`,
                    icon: '/icon.png',
                    vibrate: [200, 100, 200]
                });
            }, timeUntilNotification);
        }
    }
}

// Funciones de calendario optimizadas
function updateCalendar() {
    if (!DOM.calendar.container || !DOM.calendar.monthElement) return;

    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Actualizar título con IntersectionObserver
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    DOM.calendar.monthElement.textContent = new Date(year, month)
                        .toLocaleString('es', { month: 'long', year: 'numeric' });
                }
            });
        });
        observer.observe(DOM.calendar.monthElement);
    } else {
        DOM.calendar.monthElement.textContent = new Date(year, month)
            .toLocaleString('es', { month: 'long', year: 'numeric' });
    }
    
    // Renderizar días usando virtualización
    renderCalendarDays(year, month);
}

function renderCalendarDays(year, month) {
    const fragment = document.createDocumentFragment();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Obtener actividades de forma eficiente
    const activities = getCachedActivities();
    const activityDates = new Set(activities.map(activity => activity.date));
    
    // Renderizar días vacíos
    for (let i = 0; i < firstDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        fragment.appendChild(emptyDay);
    }
    
    // Renderizar días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dayElement = createCalendarDay(year, month, day, activityDates);
        fragment.appendChild(dayElement);
    }
    
    // Actualizar DOM una sola vez
    DOM.calendar.container.innerHTML = '';
    DOM.calendar.container.appendChild(fragment);
}

function createCalendarDay(year, month, day, activityDates) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    dayElement.textContent = day;
    
    const currentDateStr = formatDate(year, month + 1, day);
    
    // Aplicar clases condicionalmente
    if (activityDates.has(currentDateStr)) {
        dayElement.classList.add('has-activity');
    }
    
    if (isToday(year, month, day)) {
        dayElement.classList.add('today');
    }
    
    // Optimizar evento touch
    dayElement.addEventListener('click', debounce(() => {
        showActivitiesForDate(currentDateStr);
    }, 300), { passive: true });
    
    return dayElement;
}

// Funciones de gestión de actividades optimizadas
function addOrUpdateActivity() {
    if (!validateForm()) {
        showToast('Por favor complete todos los campos requeridos.');
        return;
    }

    const activityData = getFormData();
    const activities = getCachedActivities();

    if (state.editingItem) {
        updateExistingActivity(activities, activityData);
    } else {
        addNewActivity(activities, activityData);
    }

    clearForm();
    updateUI();
}

function validateForm() {
    return DOM.form.name.value &&
           DOM.form.time.value &&
           DOM.form.date.value;
}

function getFormData() {
    return {
        name: DOM.form.name.value,
        time: formatTime(DOM.form.time.value),
        date: DOM.form.date.value,
        category: DOM.form.category?.value || 'otro',
        priority: DOM.form.priority?.value || 'medium',
        completed: false,
        id: Date.now()
    };
}

function updateExistingActivity(activities, activityData) {
    const index = findActivityIndex(activities, state.editingItem);
    if (index !== -1) {
        activities[index] = activityData;
        saveActivities(activities);
    }
}

function addNewActivity(activities, activityData) {
    activities.push(activityData);
    saveActivities(activities);
    scheduleNotification(activityData.name, activityData.time, activityData.date);
}

// Funciones de UI optimizadas
function updateUI() {
    loadActivities();
    updateCalendar();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Usar animation API si está disponible
    if ('animate' in toast) {
        toast.animate([
            { opacity: 0, transform: 'translateY(100%)' },
            { opacity: 1, transform: 'translateY(0)' }
        ], {
            duration: 300,
            easing: 'ease-out'
        });
    }
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Funciones de utilidad optimizadas
function formatDate(year, month, day) {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const period = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = (hours % 12) || 12;
    return `${formattedHours}:${minutes} ${period}`;
}

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

function isToday(year, month, day) {
    const today = new Date();
    return today.getFullYear() === year &&
           today.getMonth() === month &&
           today.getDate() === day;
}

// Sistema de caché optimizado
const activityCache = {
    data: null,
    timestamp: 0,
    ttl: 60000 // 1 minuto
};

function getCachedActivities() {
    const now = Date.now();
    if (!activityCache.data || now - activityCache.timestamp > activityCache.ttl) {
        activityCache.data = JSON.parse(localStorage.getItem('activities')) || [];
        activityCache.timestamp = now;
    }
    return activityCache.data;
}

// Gestión de estado del sidebar
function openSidebar() {
    DOM.sidebar.classList.add('active');
    document.querySelector('.container').classList.add('shifted');
    
    // Prevenir scroll del body en móvil
    document.body.style.overflow = 'hidden';
}

function closeSidebar() {
    DOM.sidebar.classList.remove('active');
    document.querySelector('.container').classList.remove('shifted');
    
    // Restaurar scroll
    document.body.style.overflow = '';
}

// Función para mostrar actividades de una fecha
function showActivitiesForDate(date) {
    const activities = getCachedActivities().filter(activity => activity.date === date);
    
    if (activities.length === 0) return;
    
    const formattedDate = new Date(date).toLocaleDateString('es', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Crear modal optimizado para móvil
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h3>${formattedDate}</h3>
            <div class="activity-list">
                ${activities.map(activity => `
                    <div class="activity-item">
                        <span class="time">${activity.time}</span>
                        <span class="name">${activity.name}</span>
                        <span class="priority">${getPriorityLabel(activity.priority)}</span>
                    </div>
                `).join('')}
            </div>
            <button class="close-modal">Cerrar</button>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Eventos touch para cerrar
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
            modal.remove();
        }
    });
    
    // Soporte para gestos
    let startY = 0;
    modal.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    }, { passive: true });
    
    modal.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - startY;
        if (deltaY > 50) {
            modal.remove();
        }
    }, { passive: true });
}