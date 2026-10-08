/**
 * VERDANTÉ HOTEL - DASHBOARD CONTROLLER (app.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
});

let dashboardData = null;

async function initDashboard() {
    setupDateDefaults();
    setupEventListeners();
    await loadDashboardStats();
}

function setupDateDefaults() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const checkInInput = document.getElementById('search-checkin');
    const checkOutInput = document.getElementById('search-checkout');

    if (checkInInput && !checkInInput.value) checkInInput.value = todayStr;
    if (checkOutInput && !checkOutInput.value) checkOutInput.value = tomorrowStr;

    // Booking modal dates
    const modalCheckIn = document.getElementById('book-checkin');
    const modalCheckOut = document.getElementById('book-checkout');
    if (modalCheckIn && !modalCheckIn.value) modalCheckIn.value = todayStr;
    if (modalCheckOut && !modalCheckOut.value) modalCheckOut.value = tomorrowStr;
}

function setupEventListeners() {
    // Availability Search Form
    const searchForm = document.getElementById('dashboard-search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleAvailabilitySearch);
    }

    // Add Room Form
    const addRoomForm = document.getElementById('add-room-form');
    if (addRoomForm) {
        addRoomForm.addEventListener('submit', handleAddRoomSubmit);
    }

    // New Booking Form
    const newBookingForm = document.getElementById('new-booking-form');
    if (newBookingForm) {
        newBookingForm.addEventListener('submit', handleNewBookingSubmit);
    }

    // Dynamic price calculation in booking modal
    const roomSelect = document.getElementById('book-room-id');
    const bookCheckIn = document.getElementById('book-checkin');
    const bookCheckOut = document.getElementById('book-checkout');

    if (roomSelect && bookCheckIn && bookCheckOut) {
        const updateCost = () => updateBookingCostPreview(roomSelect, bookCheckIn, bookCheckOut);
        roomSelect.addEventListener('change', updateCost);
        bookCheckIn.addEventListener('change', updateCost);
        bookCheckOut.addEventListener('change', updateCost);
    }
}

// Load dynamic dashboard data from backend API
async function loadDashboardStats() {
    const container = document.getElementById('dashboard-stats-wrapper');
    if (!container) return;

    try {
        const res = await apiRequest('/dashboard/stats');
        if (res.success) {
            dashboardData = res.data;
            renderStatsCards(dashboardData.metrics);
            renderRecentBookings(dashboardData.recentBookings);
            renderRoomInventorySnapshot(dashboardData.allRooms);
            populateRoomsDropdown(dashboardData.allRooms);
        }
    } catch (err) {
        showToast(`Failed to load dashboard data: ${err.message}`, 'error');
    }
}

// Render Metric Cards
function renderStatsCards(metrics) {
    document.getElementById('stat-total-rooms').textContent = metrics.totalRooms || 0;
    document.getElementById('stat-available-rooms').textContent = metrics.availableRooms || 0;
    document.getElementById('stat-booked-rooms').textContent = metrics.bookedRooms || 0;
    document.getElementById('stat-total-bookings').textContent = metrics.totalBookings || 0;
    
    const revEl = document.getElementById('stat-total-revenue');
    if (revEl) {
        revEl.textContent = formatCurrency(metrics.totalRevenue || 0);
    }

    const availPercent = metrics.totalRooms ? Math.round((metrics.availableRooms / metrics.totalRooms) * 100) : 0;
    const rateEl = document.getElementById('stat-occupancy-rate');
    if (rateEl) {
        rateEl.textContent = `${availPercent}% Available`;
    }
}

// Render Recent Bookings Table
function renderRecentBookings(bookings) {
    const tbody = document.getElementById('recent-bookings-tbody');
    if (!tbody) return;

    if (!bookings || bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7">
                    <div class="empty-state" style="padding: 2rem 1rem;">
                        <div class="empty-state-title">No Recent Bookings</div>
                        <p class="empty-state-desc">New guest reservations will appear here.</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>
                <strong>#${b.id}</strong>
            </td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(b.guest_name)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(b.guest_email)}</div>
            </td>
            <td>
                <strong>Room ${escapeHtml(b.room_number)}</strong>
                <div>${renderTypeBadge(b.room_type)}</div>
            </td>
            <td>
                <div>${formatDate(b.check_in)} &rarr; ${formatDate(b.check_out)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${b.nights} night${b.nights > 1 ? 's' : ''}</div>
            </td>
            <td>
                <strong style="color: var(--primary);">${formatCurrency(b.total_amount)}</strong>
            </td>
            <td>
                ${renderStatusBadge(b.status)}
            </td>
            <td>
                <div class="table-actions">
                    ${b.status === 'Confirmed' ? `
                        <button class="btn btn-sm btn-danger-outline" onclick="cancelBookingAction(${b.id}, '${escapeHtml(b.guest_name)}')">
                            Cancel
                        </button>
                    ` : `
                        <span style="font-size: 0.75rem; color: var(--text-muted);">No action</span>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

// Render Room Inventory Snapshot Grid
function renderRoomInventorySnapshot(rooms) {
    const container = document.getElementById('room-snapshot-grid');
    if (!container) return;

    if (!rooms || rooms.length === 0) {
        container.innerHTML = `<div class="empty-state"><p>No rooms in inventory.</p></div>`;
        return;
    }

    container.innerHTML = rooms.map(r => `
        <div class="room-card" style="margin-bottom: 0;">
            <div class="room-card-header">
                <span class="room-badge-number">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    ${escapeHtml(r.room_number)}
                </span>
                ${renderStatusBadge(r.status)}
            </div>
            <div class="room-card-body" style="padding: 1rem 1.25rem;">
                <div class="room-type-title">${escapeHtml(r.type)}</div>
                <div class="room-price-tag">
                    ${formatCurrency(r.price)}
                    <span class="room-price-unit">/ night</span>
                </div>
                <div class="room-card-actions" style="padding-top: 0.75rem;">
                    ${r.status === 'Available' ? `
                        <button class="btn btn-sm btn-primary" onclick="openQuickBookModal(${r.id}, '${escapeHtml(r.room_number)}', '${escapeHtml(r.type)}', ${r.price})">
                            Book Room
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-secondary" disabled>
                            ${r.status}
                        </button>
                    `}
                    <a href="rooms.html" class="btn btn-sm btn-outline">Details</a>
                </div>
            </div>
        </div>
    `).join('');
}

// Populate room dropdown in booking modal
function populateRoomsDropdown(rooms) {
    const select = document.getElementById('book-room-id');
    if (!select) return;

    select.innerHTML = '<option value="">-- Select a Room --</option>' + 
        rooms.map(r => `
            <option value="${r.id}" data-price="${r.price}" data-status="${r.status}" data-number="${escapeHtml(r.room_number)}" data-type="${escapeHtml(r.type)}">
                Room ${escapeHtml(r.room_number)} (${escapeHtml(r.type)}) - ${formatCurrency(r.price)}/nt [${r.status}]
            </option>
        `).join('');
}

// Handle Room Availability Search
async function handleAvailabilitySearch(e) {
    e.preventDefault();
    const type = document.getElementById('search-room-type').value;
    const checkIn = document.getElementById('search-checkin').value;
    const checkOut = document.getElementById('search-checkout').value;

    if (!checkIn || !checkOut) {
        showToast('Please select both check-in and check-out dates.', 'warning');
        return;
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
        showToast('Check-out date must be after check-in date.', 'error');
        return;
    }

    const searchBtn = document.getElementById('search-submit-btn');
    const originalText = searchBtn.innerHTML;
    searchBtn.disabled = true;
    searchBtn.innerHTML = 'Searching...';

    try {
        const query = `/rooms/available?type=${encodeURIComponent(type)}&checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}`;
        const res = await apiRequest(query);

        if (res.success) {
            renderSearchResultsModal(res.data, checkIn, checkOut, type);
        }
    } catch (err) {
        showToast(`Search failed: ${err.message}`, 'error');
    } finally {
        searchBtn.disabled = false;
        searchBtn.innerHTML = originalText;
    }
}

// Display search results modal
function renderSearchResultsModal(rooms, checkIn, checkOut, type) {
    const resultsContainer = document.getElementById('search-results-content');
    const summaryHeader = document.getElementById('search-results-summary');

    summaryHeader.innerHTML = `
        Showing <strong>${rooms.length} available room${rooms.length === 1 ? '' : 's'}</strong> 
        for <strong>${formatDate(checkIn)}</strong> to <strong>${formatDate(checkOut)}</strong>
        ${type !== 'all' ? ` (${escapeHtml(type)})` : ''}
    `;

    if (rooms.length === 0) {
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </div>
                <div class="empty-state-title">No Rooms Available</div>
                <p class="empty-state-desc">All rooms matching your criteria are booked for these dates. Try selecting different dates or room types.</p>
            </div>
        `;
    } else {
        const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 3600 * 24)));
        resultsContainer.innerHTML = `
            <div class="rooms-grid" style="margin-bottom: 0;">
                ${rooms.map(r => `
                    <div class="room-card">
                        <div class="room-card-header">
                            <span class="room-badge-number">Room ${escapeHtml(r.room_number)}</span>
                            <span class="status-badge status-available">Available</span>
                        </div>
                        <div class="room-card-body">
                            <div class="room-type-title">${escapeHtml(r.type)}</div>
                            <div class="room-price-tag">
                                ${formatCurrency(r.price)}
                                <span class="room-price-unit">/ night</span>
                            </div>
                            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 1rem;">
                                Total for ${nights} night${nights > 1 ? 's' : ''}: <strong>${formatCurrency(r.price * nights)}</strong>
                            </div>
                            <div class="room-card-actions">
                                <button class="btn btn-primary" style="width: 100%;" onclick="openBookingWithParams(${r.id}, '${escapeHtml(r.room_number)}', '${checkIn}', '${checkOut}')">
                                    Reserve Room ${escapeHtml(r.room_number)}
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    openModal('search-results-modal');
}

// Pre-fill booking modal when reserving from search or quick book
window.openBookingWithParams = function(roomId, roomNumber, checkIn, checkOut) {
    closeModal('search-results-modal');

    const roomSelect = document.getElementById('book-room-id');
    const checkInInput = document.getElementById('book-checkin');
    const checkOutInput = document.getElementById('book-checkout');

    if (roomSelect) roomSelect.value = roomId;
    if (checkInInput) checkInInput.value = checkIn;
    if (checkOutInput) checkOutInput.value = checkOut;

    updateBookingCostPreview(roomSelect, checkInInput, checkOutInput);
    openModal('new-booking-modal');
};

window.openQuickBookModal = function(roomId, roomNumber, type, price) {
    const roomSelect = document.getElementById('book-room-id');
    if (roomSelect) roomSelect.value = roomId;

    const checkInInput = document.getElementById('book-checkin');
    const checkOutInput = document.getElementById('book-checkout');
    updateBookingCostPreview(roomSelect, checkInInput, checkOutInput);

    openModal('new-booking-modal');
};

// Calculate and preview cost in booking modal
function updateBookingCostPreview(roomSelect, inInput, outInput) {
    const costPreviewEl = document.getElementById('booking-cost-preview');
    if (!costPreviewEl) return;

    const selectedOption = roomSelect.options[roomSelect.selectedIndex];
    const price = selectedOption ? parseFloat(selectedOption.getAttribute('data-price')) : 0;
    const checkIn = inInput.value;
    const checkOut = outInput.value;

    if (price && checkIn && checkOut && new Date(checkOut) > new Date(checkIn)) {
        const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 3600 * 24)));
        const total = price * nights;
        costPreviewEl.innerHTML = `
            <div class="folio-total-box" style="margin-top: 1rem;">
                <div>
                    <strong>Stay Duration:</strong> ${nights} night${nights > 1 ? 's' : ''} (${formatCurrency(price)}/night)
                </div>
                <div>
                    <span style="font-size: 0.8rem; color: var(--text-muted);">Est. Total:</span>
                    <strong style="font-size: 1.15rem; color: var(--primary); margin-left: 0.5rem;">${formatCurrency(total)}</strong>
                </div>
            </div>
        `;
    } else {
        costPreviewEl.innerHTML = '';
    }
}

// Handle Add Room form submission
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
            await loadDashboardStats();
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Handle New Booking form submission
async function handleNewBookingSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = {
        room_id: parseInt(document.getElementById('book-room-id').value, 10),
        guest_name: document.getElementById('book-guest-name').value.trim(),
        guest_email: document.getElementById('book-guest-email').value.trim(),
        guest_phone: document.getElementById('book-guest-phone').value.trim(),
        check_in: document.getElementById('book-checkin').value,
        check_out: document.getElementById('book-checkout').value,
        status: 'Confirmed'
    };

    try {
        const res = await apiRequest('/bookings', {
            method: 'POST',
            body: payload
        });

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('new-booking-modal');
            e.target.reset();
            await loadDashboardStats();
        }
    } catch (err) {
        showToast(err.message, 'error', err.status === 409 ? 'Booking Conflict' : 'Error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Cancel booking action with confirmation
window.cancelBookingAction = function(bookingId, guestName) {
    showConfirmDialog({
        title: 'Cancel Reservation',
        message: `Are you sure you want to cancel booking #${bookingId} for guest ${guestName}? The room will be made available for other guests.`,
        confirmText: 'Yes, Cancel Reservation',
        confirmClass: 'btn-danger-outline',
        onConfirm: async () => {
            try {
                const res = await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'PATCH' });
                if (res.success) {
                    showToast(res.message, 'success');
                    await loadDashboardStats();
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });
};
