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
    const eventDetailModal = document.getElementById('eventDetailModal');
    const eventDetailTitle = document.getElementById('eventDetailTitle');
    const eventDetailContent = document.getElementById('eventDetailContent');
    const closeEventDetailBtn = document.getElementById('closeEventDetailBtn');

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
            events: async function (info, successCallback, failureCallback) {
                try {
                    // 使用當前視圖的時間範圍來獲取事件
                    const timeMin = info.start.toISOString();
                    const timeMax = info.end.toISOString();
                    
                    const response = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`);
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    const googleEvents = await response.json();

                    const events = googleEvents.map(event => {
                        // Handle all-day events (date only) vs timed events (dateTime)
                        const start = event.start.dateTime || event.start.date;
                        const end = event.end.dateTime || event.end.date;

                        return {
                            id: event.id,
                            title: event.summary || '(無標題)',
                            start: start,
                            end: end,
                            // url: event.htmlLink, // Removed as per user request
                            // Store original object for other uses
                            extendedProps: {
                                description: event.description,
                                location: event.location,
                                attendees: event.attendees,
                                htmlLink: event.htmlLink,
                                creator: event.creator,
                                organizer: event.organizer,
                                startRaw: event.start,
                                endRaw: event.end
                            }
                        };
                    });

                    successCallback(events);
                } catch (error) {
                    console.error('Error fetching events:', error);
                    failureCallback(error);
                }
            },
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
            },
            eventClick: function (info) {
                // 顯示事件詳情彈窗
                showEventDetails(info.event);
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

    // 顯示事件詳情
    function showEventDetails(event) {
        const props = event.extendedProps;
        const title = event.title || '(無標題)';
        
        // 格式化時間
        let timeText = '';
        if (props.startRaw) {
            const isAllDay = !props.startRaw.dateTime;
            if (isAllDay) {
                const startDate = new Date(props.startRaw.date);
                const endDate = new Date(props.endRaw.date);
                // 全天事件的結束日期是排他性的，所以減去一天
                endDate.setDate(endDate.getDate() - 1);
                
                if (startDate.getTime() === endDate.getTime()) {
                    timeText = startDate.toLocaleDateString('zh-TW', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        weekday: 'long'
                    });
                } else {
                    timeText = `${startDate.toLocaleDateString('zh-TW', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                    })} - ${endDate.toLocaleDateString('zh-TW', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric'
                    })}`;
                }
                timeText = `全天事件：${timeText}`;
            } else {
                const start = new Date(props.startRaw.dateTime);
                const end = new Date(props.endRaw.dateTime);
                timeText = `${start.toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                })} - ${end.toLocaleTimeString('zh-TW', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}`;
            }
        }

        // 構建詳情內容
        let contentHTML = `<div class="event-detail-section">
            <div class="event-detail-time">${timeText}</div>
        </div>`;

        if (props.description) {
            contentHTML += `<div class="event-detail-section">
                <div class="event-detail-label">描述</div>
                <div class="event-detail-value">${escapeHtml(props.description)}</div>
            </div>`;
        }

        if (props.location) {
            contentHTML += `<div class="event-detail-section">
                <div class="event-detail-label">地點</div>
                <div class="event-detail-value">${escapeHtml(props.location)}</div>
            </div>`;
        }

        if (props.attendees && props.attendees.length > 0) {
            const attendeesList = props.attendees.map(attendee => {
                const name = attendee.displayName || attendee.email || '未知';
                const status = attendee.responseStatus === 'accepted' ? '✓ 已接受' :
                             attendee.responseStatus === 'declined' ? '✗ 已拒絕' :
                             attendee.responseStatus === 'tentative' ? '? 暫定' : '○ 未回應';
                return `<div class="event-detail-attendee">${escapeHtml(name)} <span class="attendee-status">${status}</span></div>`;
            }).join('');
            contentHTML += `<div class="event-detail-section">
                <div class="event-detail-label">參與者</div>
                <div class="event-detail-value">${attendeesList}</div>
            </div>`;
        }

        if (props.organizer) {
            const organizerName = props.organizer.displayName || props.organizer.email || '未知';
            contentHTML += `<div class="event-detail-section">
                <div class="event-detail-label">主辦人</div>
                <div class="event-detail-value">${escapeHtml(organizerName)}</div>
            </div>`;
        }

        if (props.htmlLink) {
            contentHTML += `<div class="event-detail-section">
                <a href="${props.htmlLink}" target="_blank" class="event-detail-link">在 Google 日曆中開啟</a>
            </div>`;
        }

        eventDetailTitle.textContent = title;
        eventDetailContent.innerHTML = contentHTML;
        eventDetailModal.style.display = 'flex';
    }

    // 關閉事件詳情
    closeEventDetailBtn.addEventListener('click', () => {
        eventDetailModal.style.display = 'none';
    });

    // 點擊模態框外部關閉
    eventDetailModal.addEventListener('click', (e) => {
        if (e.target === eventDetailModal) {
            eventDetailModal.style.display = 'none';
        }
    });

    // HTML 轉義函數
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
