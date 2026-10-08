/**
 * VERDANTÉ HOTEL - ROOM MANAGEMENT CONTROLLER (rooms.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    initRoomsPage();
});

let allRooms = [];
let currentView = 'grid'; // 'grid' or 'table'

async function initRoomsPage() {
    setupEventListeners();
    await loadRooms();
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('rooms-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAndRenderRooms());
    }

    // Type filter
    const typeFilter = document.getElementById('rooms-type-filter');
    if (typeFilter) {
        typeFilter.addEventListener('change', () => filterAndRenderRooms());
    }

    // Availability filter
    const statusFilter = document.getElementById('rooms-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => filterAndRenderRooms());
    }

    // View toggles
    const gridBtn = document.getElementById('view-grid-btn');
    const tableBtn = document.getElementById('view-table-btn');
    if (gridBtn && tableBtn) {
        gridBtn.addEventListener('click', () => {
            currentView = 'grid';
            gridBtn.classList.add('active');
            tableBtn.classList.remove('active');
            renderRooms();
        });
        tableBtn.addEventListener('click', () => {
            currentView = 'table';
            tableBtn.classList.add('active');
            gridBtn.classList.remove('active');
            renderRooms();
        });
    }

    // Add Room Form
    const addRoomForm = document.getElementById('add-room-form');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', handleAddRoomSubmit);
    }

    // Edit Room Form
    const editRoomForm = document.getElementById('edit-room-form');
    if (editRoomForm) {
        editRoomForm.addEventListener('submit', handleEditRoomSubmit);
    }

    // Quick Book Form
    const quickBookForm = document.getElementById('quick-book-form');
    if (quickBookForm) {
        quickBookForm.addEventListener('submit', handleQuickBookSubmit);
    }

    // Date change on quick book form
    const qIn = document.getElementById('qb-checkin');
    const qOut = document.getElementById('qb-checkout');
    if (qIn && qOut) {
        const updateQbCost = () => {
            const price = parseFloat(document.getElementById('qb-price-hidden').value || 0);
            const inVal = qIn.value;
            const outVal = qOut.value;
            const preview = document.getElementById('qb-cost-preview');
            if (price && inVal && outVal && new Date(outVal) > new Date(inVal)) {
                const nights = Math.max(1, Math.round((new Date(outVal) - new Date(inVal)) / (1000 * 3600 * 24)));
                preview.innerHTML = `
                    <div class="folio-total-box" style="margin-top: 1rem;">
                        <div><strong>${nights} night${nights > 1 ? 's' : ''}</strong> (${formatCurrency(price)}/nt)</div>
                        <div>Total: <strong style="color: var(--primary); font-size: 1.15rem;">${formatCurrency(price * nights)}</strong></div>
                    </div>
                `;
            } else {
                preview.innerHTML = '';
            }
        };
        qIn.addEventListener('change', updateQbCost);
        qOut.addEventListener('change', updateQbCost);
    }
}

// Fetch all rooms from API
async function loadRooms() {
    const container = document.getElementById('rooms-display-container');
    if (!container) return;

    try {
        const res = await apiRequest('/rooms');
        if (res.success) {
            allRooms = res.data;
            updateRoomCounters(allRooms);
            filterAndRenderRooms();
        }
    } catch (err) {
        showToast(`Failed to load rooms: ${err.message}`, 'error');
    }
}

// Update room counter badges in page header
function updateRoomCounters(rooms) {
    const total = rooms.length;
    const avail = rooms.filter(r => r.status === 'Available').length;
    const booked = rooms.filter(r => r.status === 'Booked').length;
    const maint = rooms.filter(r => r.status === 'Maintenance').length;

    const countAll = document.getElementById('counter-all');
    const countAvail = document.getElementById('counter-avail');
    const countBooked = document.getElementById('counter-booked');
    const countMaint = document.getElementById('counter-maint');

    if (countAll) countAll.textContent = total;
    if (countAvail) countAvail.textContent = avail;
    if (countBooked) countBooked.textContent = booked;
    if (countMaint) countMaint.textContent = maint;
}

// Filter rooms by search, type, and status
function filterAndRenderRooms() {
    const searchVal = (document.getElementById('rooms-search-input')?.value || '').toLowerCase().trim();
    const typeVal = document.getElementById('rooms-type-filter')?.value || 'all';
    const statusVal = document.getElementById('rooms-status-filter')?.value || 'all';

    const filtered = allRooms.filter(r => {
        const matchesSearch = !searchVal || 
            r.room_number.toLowerCase().includes(searchVal) || 
            r.type.toLowerCase().includes(searchVal);
        const matchesType = typeVal === 'all' || r.type === typeVal;
        const matchesStatus = statusVal === 'all' || r.status === statusVal;

        return matchesSearch && matchesType && matchesStatus;
    });

    renderRooms(filtered);
}

// Render Rooms in Grid or Table view
function renderRooms(roomsToRender = allRooms) {
    const container = document.getElementById('rooms-display-container');
    if (!container) return;

    if (roomsToRender.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                </div>
                <div class="empty-state-title">No Rooms Found</div>
                <p class="empty-state-desc">No rooms match your filter or search query. Try adjusting your parameters or add a new room.</p>
                <button class="btn btn-primary" onclick="openModal('add-room-modal')">Add New Room</button>
            </div>
        `;
        return;
    }

    if (currentView === 'grid') {
        container.innerHTML = `
            <div class="rooms-grid">
                ${roomsToRender.map(r => `
                    <div class="room-card">
                        <div class="room-card-header">
                            <span class="room-badge-number">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                                Room ${escapeHtml(r.room_number)}
                            </span>
                            ${renderStatusBadge(r.status)}
                        </div>
                        <div class="room-card-body">
                            <div class="room-type-title">${escapeHtml(r.type)} Room</div>
                            <div class="room-price-tag">
                                ${formatCurrency(r.price)}
                                <span class="room-price-unit">/ night</span>
                            </div>
                            
                            <ul class="room-features">
                                <li class="feature-pill">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                                    High-Speed Wi-Fi
                                </li>
                                <li class="feature-pill">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>
                                    Smart TV
                                </li>
                                <li class="feature-pill">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                                    24/7 Room Service
                                </li>
                            </ul>

                            <div class="room-card-actions">
                                <div style="display: flex; gap: 0.4rem;">
                                    ${r.status === 'Available' ? `
                                        <button class="btn btn-sm btn-primary" onclick="openQuickBookModalForRoom(${r.id})">
                                            Book
                                        </button>
                                    ` : `
                                        <button class="btn btn-sm btn-secondary" disabled>
                                            ${r.status}
                                        </button>
                                    `}
                                    <button class="btn btn-sm btn-outline" onclick="openEditRoomModal(${r.id})">
                                        Edit
                                    </button>
                                </div>
                                <button class="btn btn-sm btn-danger-outline" title="Delete Room" onclick="deleteRoomAction(${r.id}, '${escapeHtml(r.room_number)}')">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        // Table View
        container.innerHTML = `
            <div class="table-card">
                <div class="table-responsive">
                    <table class="custom-table">
                        <thead>
                            <tr>
                                <th>Room #</th>
                                <th>Type</th>
                                <th>Price / Night</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${roomsToRender.map(r => `
                                <tr>
                                    <td><strong>Room ${escapeHtml(r.room_number)}</strong></td>
                                    <td>${renderTypeBadge(r.type)}</td>
                                    <td><strong style="color: var(--gold-dark);">${formatCurrency(r.price)}</strong></td>
                                    <td>${renderStatusBadge(r.status)}</td>
                                    <td style="color: var(--text-muted); font-size: 0.8rem;">${formatDate(r.created_at ? r.created_at.split(' ')[0] : '')}</td>
                                    <td style="text-align: right;">
                                        <div class="table-actions" style="justify-content: flex-end;">
                                            ${r.status === 'Available' ? `
                                                <button class="btn btn-sm btn-primary" onclick="openQuickBookModalForRoom(${r.id})">
                                                    Book
                                                </button>
                                            ` : ''}
                                            <button class="btn btn-sm btn-outline" onclick="openEditRoomModal(${r.id})">
                                                Edit
                                            </button>
                                            <button class="btn btn-sm btn-danger-outline" onclick="deleteRoomAction(${r.id}, '${escapeHtml(r.room_number)}')">
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

// Add Room handler
async function handleAddRoomSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = {
        room_number: document.getElementById('add-room-number').value.trim(),
        type: document.getElementById('add-room-type').value,
        price: parseFloat(document.getElementById('add-room-price').value),
        status: document.getElementById('add-room-status').value
    };

    try {
        const res = await apiRequest('/rooms', {
            method: 'POST',
            body: payload
        });

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('add-room-modal');
            e.target.reset();
            await loadRooms();
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Open Edit Room Modal
window.openEditRoomModal = function(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) return;

    document.getElementById('edit-room-id').value = room.id;
    document.getElementById('edit-room-number').value = room.room_number;
    document.getElementById('edit-room-type').value = room.type;
    document.getElementById('edit-room-price').value = room.price;
    document.getElementById('edit-room-status').value = room.status;

    openModal('edit-room-modal');
};

// Handle Edit Room Form Submit
async function handleEditRoomSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const roomId = document.getElementById('edit-room-id').value;
    const payload = {
        room_number: document.getElementById('edit-room-number').value.trim(),
        type: document.getElementById('edit-room-type').value,
        price: parseFloat(document.getElementById('edit-room-price').value),
        status: document.getElementById('edit-room-status').value
    };

    try {
        const res = await apiRequest(`/rooms/${roomId}`, {
            method: 'PUT',
            body: payload
        });

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('edit-room-modal');
            await loadRooms();
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Delete Room Action with Confirmation
window.deleteRoomAction = function(roomId, roomNumber) {
    showConfirmDialog({
        title: 'Delete Room Confirmation',
        message: `Are you sure you want to permanently delete Room ${roomNumber}? This action cannot be undone.`,
        confirmText: 'Yes, Delete Room',
        confirmClass: 'btn-danger-outline',
        onConfirm: async () => {
            try {
                const res = await apiRequest(`/rooms/${roomId}`, { method: 'DELETE' });
                if (res.success) {
                    showToast(res.message, 'success');
                    await loadRooms();
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });
};

// Open Quick Book Modal for a specific room
window.openQuickBookModalForRoom = function(roomId) {
    const room = allRooms.find(r => r.id === roomId);
    if (!room) return;

    document.getElementById('qb-room-id').value = room.id;
    document.getElementById('qb-price-hidden').value = room.price;
    document.getElementById('qb-room-display').textContent = `Room ${room.room_number} (${room.type}) - ${formatCurrency(room.price)} / night`;

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    document.getElementById('qb-checkin').value = today.toISOString().split('T')[0];
    document.getElementById('qb-checkout').value = tomorrow.toISOString().split('T')[0];

    // Trigger price preview calculation
    const qIn = document.getElementById('qb-checkin');
    const qOut = document.getElementById('qb-checkout');
    const preview = document.getElementById('qb-cost-preview');
    if (preview) {
        preview.innerHTML = `
            <div class="folio-total-box" style="margin-top: 1rem;">
                <div><strong>1 night</strong> (${formatCurrency(room.price)}/nt)</div>
                <div>Total: <strong style="color: var(--primary); font-size: 1.15rem;">${formatCurrency(room.price)}</strong></div>
            </div>
        `;
    }

    openModal('quick-book-modal');
};

// Handle Quick Book submission
async function handleQuickBookSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = {
        room_id: parseInt(document.getElementById('qb-room-id').value, 10),
        guest_name: document.getElementById('qb-guest-name').value.trim(),
        guest_email: document.getElementById('qb-guest-email').value.trim(),
        guest_phone: document.getElementById('qb-guest-phone').value.trim(),
        check_in: document.getElementById('qb-checkin').value,
        check_out: document.getElementById('qb-checkout').value,
        status: 'Confirmed'
    };

    try {
        const res = await apiRequest('/bookings', {
            method: 'POST',
            body: payload
        });

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('quick-book-modal');
            e.target.reset();
            await loadRooms();
        }
    } catch (err) {
        showToast(err.message, 'error', err.status === 409 ? 'Booking Conflict' : 'Error');
    } finally {
        submitBtn.disabled = false;
    }
}
