document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const chatMessages = document.getElementById('chatMessages');
    const loginBtn = document.getElementById('loginBtn');
    const confirmModal = document.getElementById('confirmModal');
    const confirmText = document.getElementById('confirmText');
    const confirmActionBtn = document.getElementById('confirmActionBtn');
    const cancelActionBtn = document.getElementById('cancelActionBtn');

    let calendar;
    let pendingAction = null;

    // Check for auth success
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        enableApp();
        // Clean URL
        window.history.replaceState({}, document.title, "/");
    }

    function enableApp() {
        loginBtn.style.display = 'none';
        chatInput.disabled = false;
        sendBtn.disabled = false;
        initCalendar();
    }

    loginBtn.addEventListener('click', () => {
        window.location.href = '/auth/google';
    });

    function initCalendar() {
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'timeGridWeek',
            locale: 'zh-tw', // Set locale to Traditional Chinese
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            buttonText: {
                today: '今天',
                month: '月',
                week: '週',
                day: '日'
            },
            height: '100%',
            events: '/api/calendar/events', // Fetch events from our API
            eventColor: '#2563eb',
            editable: true,
            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,
            eventDrop: async function (info) {
                // Handle event drop (time change)
                const event = info.event;
                const newStart = event.start.toISOString();
                const newEnd = event.end ? event.end.toISOString() : null;

                try {
                    const response = await fetch(`/api/calendar/events/${event.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            start: { dateTime: newStart },
                            end: { dateTime: newEnd }
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Update failed');
                    }
                    // Optional: Show success message
                } catch (error) {
                    console.error('Error updating event:', error);
                    info.revert(); // Revert change on error
                    alert('更新失敗，請稍後再試。');
                }
            }
        });
        calendar.render();
    }

    // Chat Logic
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, 'user');
        chatInput.value = '';

        // Show loading state?

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await response.json();

            handleAiResponse(data);
        } catch (error) {
            addMessage("無法連線到伺服器。", 'system');
            console.error(error);
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.textContent = text;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    async function handleAiResponse(data) {
        addMessage(data.responseMessage, 'assistant');

        if (data.action === 'unknown' || data.action === 'list' || data.action === 'check_conflict') {
            // Just refresh calendar if list, or do nothing if unknown
            if (data.action === 'list') calendar.refetchEvents();
            return;
        }

        if (data.requiresConfirmation) {
            pendingAction = data;
            showConfirmation(data);
        } else {
            // Execute immediately if no confirmation needed (though prompt said we should warn)
            // For safety, let's assume we always confirm for modify/delete/insert via UI if AI didn't explicitly say "confirmed"
            // But the AI service returns "requiresConfirmation" based on logic.
            // If it's false, we execute.
            executeAction(data);
        }
    }

    function showConfirmation(data) {
        let actionText = "";
        const details = data.eventDetails;
        if (data.action === 'insert') {
            actionText = `建立行程 "${details.summary}" 時間：${new Date(details.start.dateTime).toLocaleString('zh-TW')}？`;
        } else if (data.action === 'delete') {
            actionText = `刪除行程 "${details.summary}"？`; // Note: summary might be missing if not fetched, but AI should provide context
        } else if (data.action === 'update') {
            actionText = `更新行程為 "${details.summary}" 時間：${new Date(details.start.dateTime).toLocaleString('zh-TW')}？`;
        }

        confirmText.textContent = actionText;
        confirmModal.style.display = 'flex';
    }

    confirmActionBtn.addEventListener('click', () => {
        if (pendingAction) {
            executeAction(pendingAction);
            confirmModal.style.display = 'none';
            pendingAction = null;
        }
    });

    cancelActionBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        pendingAction = null;
        addMessage("動作已取消。", 'system');
    });

    async function executeAction(data) {
        try {
            let response;
            if (data.action === 'insert') {
                response = await fetch('/api/calendar/events', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data.eventDetails)
                });
            } else if (data.action === 'update') {
                response = await fetch(`/api/calendar/events/${data.eventDetails.eventId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data.eventDetails)
                });
            } else if (data.action === 'delete') {
                response = await fetch(`/api/calendar/events/${data.eventDetails.eventId}`, {
                    method: 'DELETE'
                });
            }

            if (response && response.ok) {
                addMessage("完成！", 'system');
                calendar.refetchEvents();
            } else {
                addMessage("執行動作時發生錯誤。", 'system');
            }
        } catch (error) {
            console.error(error);
            addMessage("執行動作錯誤。", 'system');
        }
    }
});
