/**
 * VERDANTÉ HOTEL - BOOKING MANAGEMENT CONTROLLER (bookings.js)
 */

document.addEventListener('DOMContentLoaded', () => {
    initBookingsPage();
});

let allBookings = [];
let availableRoomsList = [];

async function initBookingsPage() {
    setupEventListeners();
    await Promise.all([loadBookings(), loadRoomsForDropdown()]);
}

function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('bookings-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => filterAndRenderBookings());
    }

    // Status filter
    const statusFilter = document.getElementById('bookings-status-filter');
    if (statusFilter) {
        statusFilter.addEventListener('change', () => filterAndRenderBookings());
    }

    // New Booking Form
    const newBookingForm = document.getElementById('new-booking-form');
    if (newBookingForm) {
        newBookingForm.addEventListener('submit', handleNewBookingSubmit);
    }

    // Edit Booking Form
    const editBookingForm = document.getElementById('edit-booking-form');
    if (editBookingForm) {
        editBookingForm.addEventListener('submit', handleEditBookingSubmit);
    }

    // Dynamic cost calculation on New Booking
    const newRoomSel = document.getElementById('new-book-room-id');
    const newIn = document.getElementById('new-book-checkin');
    const newOut = document.getElementById('new-book-checkout');
    if (newRoomSel && newIn && newOut) {
        const updateNewCost = () => updateCostDisplay(newRoomSel, newIn, newOut, 'new-book-cost-preview');
        newRoomSel.addEventListener('change', updateNewCost);
        newIn.addEventListener('change', updateNewCost);
        newOut.addEventListener('change', updateNewCost);
    }

    // Dynamic cost calculation on Edit Booking
    const editRoomSel = document.getElementById('edit-book-room-id');
    const editIn = document.getElementById('edit-book-checkin');
    const editOut = document.getElementById('edit-book-checkout');
    if (editRoomSel && editIn && editOut) {
        const updateEditCost = () => updateCostDisplay(editRoomSel, editIn, editOut, 'edit-book-cost-preview');
        editRoomSel.addEventListener('change', updateEditCost);
        editIn.addEventListener('change', updateEditCost);
        editOut.addEventListener('change', updateEditCost);
    }
}

// Fetch all bookings from backend
async function loadBookings() {
    const container = document.getElementById('bookings-tbody');
    if (!container) return;

    try {
        const res = await apiRequest('/bookings');
        if (res.success) {
            allBookings = res.data;
            updateBookingCounters(allBookings);
            filterAndRenderBookings();
        }
    } catch (err) {
        showToast(`Failed to load bookings: ${err.message}`, 'error');
    }
}

// Fetch rooms for the booking dropdowns
async function loadRoomsForDropdown() {
    try {
        const res = await apiRequest('/rooms');
        if (res.success) {
            availableRoomsList = res.data;
            populateRoomSelectOptions('new-book-room-id', availableRoomsList);
            populateRoomSelectOptions('edit-book-room-id', availableRoomsList);
        }
    } catch (err) {
        console.error('Failed to load rooms for select dropdown:', err);
    }
}

function populateRoomSelectOptions(selectId, rooms) {
    const select = document.getElementById(selectId);
    if (!select) return;

    select.innerHTML = '<option value="">-- Choose a Room --</option>' + 
        rooms.map(r => `
            <option value="${r.id}" data-price="${r.price}" data-number="${escapeHtml(r.room_number)}" data-type="${escapeHtml(r.type)}">
                Room ${escapeHtml(r.room_number)} (${escapeHtml(r.type)}) - ${formatCurrency(r.price)}/night [${r.status}]
            </option>
        `).join('');
}

// Update counters in page header
function updateBookingCounters(bookings) {
    const total = bookings.length;
    const confirmed = bookings.filter(b => b.status === 'Confirmed').length;
    const completed = bookings.filter(b => b.status === 'Completed').length;
    const cancelled = bookings.filter(b => b.status === 'Cancelled').length;

    const countAll = document.getElementById('count-all-bookings');
    const countConf = document.getElementById('count-confirmed');
    const countComp = document.getElementById('count-completed');
    const countCanc = document.getElementById('count-cancelled');

    if (countAll) countAll.textContent = total;
    if (countConf) countConf.textContent = confirmed;
    if (countComp) countComp.textContent = completed;
    if (countCanc) countCanc.textContent = cancelled;
}

// Filter and render bookings
function filterAndRenderBookings() {
    const searchVal = (document.getElementById('bookings-search-input')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('bookings-status-filter')?.value || 'all';

    const filtered = allBookings.filter(b => {
        const matchesSearch = !searchVal ||
            b.guest_name.toLowerCase().includes(searchVal) ||
            b.guest_email.toLowerCase().includes(searchVal) ||
            b.guest_phone.toLowerCase().includes(searchVal) ||
            b.room_number.toLowerCase().includes(searchVal) ||
            String(b.id).includes(searchVal);

        const matchesStatus = statusVal === 'all' || b.status === statusVal;

        return matchesSearch && matchesStatus;
    });

    renderBookingsTable(filtered);
}

// Render table of bookings
function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    if (bookings.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        </div>
                        <div class="empty-state-title">No Reservations Found</div>
                        <p class="empty-state-desc">No bookings match your current filter or search criteria.</p>
                        <button class="btn btn-primary" onclick="openNewBookingModal()">Create Reservation</button>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = bookings.map(b => `
        <tr>
            <td>
                <span style="font-weight: 700; color: var(--primary);">#${b.id}</span>
            </td>
            <td>
                <div style="font-weight: 600; color: var(--text-primary);">${escapeHtml(b.guest_name)}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(b.guest_email)} &bull; ${escapeHtml(b.guest_phone)}</div>
            </td>
            <td>
                <strong>Room ${escapeHtml(b.room_number)}</strong>
                <div>${renderTypeBadge(b.room_type)}</div>
            </td>
            <td>
                <div><strong>${formatDate(b.check_in)}</strong> &rarr; <strong>${formatDate(b.check_out)}</strong></div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">${b.nights} night${b.nights > 1 ? 's' : ''}</div>
            </td>
            <td>
                <strong style="color: var(--gold-dark); font-size: 0.95rem;">${formatCurrency(b.total_amount)}</strong>
            </td>
            <td>
                ${renderStatusBadge(b.status)}
            </td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-outline" title="View Folio / Receipt" onclick="viewGuestFolio(${b.id})">
                        Folio
                    </button>
                    <button class="btn btn-sm btn-secondary" title="Edit Booking" onclick="openEditBookingModal(${b.id})">
                        Edit
                    </button>
                    ${b.status === 'Confirmed' ? `
                        <button class="btn btn-sm btn-danger-outline" title="Cancel Booking" onclick="cancelBookingAction(${b.id}, '${escapeHtml(b.guest_name)}')">
                            Cancel
                        </button>
                    ` : `
                        <button class="btn btn-sm btn-danger-outline" title="Delete Booking" onclick="deleteBookingAction(${b.id})">
                            Delete
                        </button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
}

// Open New Booking Modal
window.openNewBookingModal = function() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    document.getElementById('new-book-checkin').value = today.toISOString().split('T')[0];
    document.getElementById('new-book-checkout').value = tomorrow.toISOString().split('T')[0];

    const roomSel = document.getElementById('new-book-room-id');
    const inInput = document.getElementById('new-book-checkin');
    const outInput = document.getElementById('new-book-checkout');
    updateCostDisplay(roomSel, inInput, outInput, 'new-book-cost-preview');

    openModal('new-booking-modal');
};

// Calculate cost preview helper
function updateCostDisplay(roomSelect, inInput, outInput, previewId) {
    const previewEl = document.getElementById(previewId);
    if (!previewEl) return;

    const opt = roomSelect.options[roomSelect.selectedIndex];
    const price = opt ? parseFloat(opt.getAttribute('data-price')) : 0;
    const checkIn = inInput.value;
    const checkOut = outInput.value;

    if (price && checkIn && checkOut && new Date(checkOut) > new Date(checkIn)) {
        const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / (1000 * 3600 * 24)));
        const total = price * nights;
        previewEl.innerHTML = `
            <div class="folio-total-box" style="margin-top: 1rem;">
                <div><strong>Duration:</strong> ${nights} night${nights > 1 ? 's' : ''} (${formatCurrency(price)} / night)</div>
                <div>Estimated Total: <strong style="color: var(--primary); font-size: 1.15rem;">${formatCurrency(total)}</strong></div>
            </div>
        `;
    } else {
        previewEl.innerHTML = '';
    }
}

// Handle New Booking Submit
async function handleNewBookingSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const payload = {
        room_id: parseInt(document.getElementById('new-book-room-id').value, 10),
        guest_name: document.getElementById('new-book-guest-name').value.trim(),
        guest_email: document.getElementById('new-book-guest-email').value.trim(),
        guest_phone: document.getElementById('new-book-guest-phone').value.trim(),
        check_in: document.getElementById('new-book-checkin').value,
        check_out: document.getElementById('new-book-checkout').value,
        status: document.getElementById('new-book-status').value
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
            await loadBookings();
        }
    } catch (err) {
        showToast(err.message, 'error', err.status === 409 ? 'Booking Conflict' : 'Error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Open Edit Booking Modal
window.openEditBookingModal = function(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;

    document.getElementById('edit-booking-id').value = booking.id;
    document.getElementById('edit-book-room-id').value = booking.room_id;
    document.getElementById('edit-book-guest-name').value = booking.guest_name;
    document.getElementById('edit-book-guest-email').value = booking.guest_email;
    document.getElementById('edit-book-guest-phone').value = booking.guest_phone;
    document.getElementById('edit-book-checkin').value = booking.check_in;
    document.getElementById('edit-book-checkout').value = booking.check_out;
    document.getElementById('edit-book-status').value = booking.status;

    const roomSel = document.getElementById('edit-book-room-id');
    const inInput = document.getElementById('edit-book-checkin');
    const outInput = document.getElementById('edit-book-checkout');
    updateCostDisplay(roomSel, inInput, outInput, 'edit-book-cost-preview');

    openModal('edit-booking-modal');
};

// Handle Edit Booking Submit
async function handleEditBookingSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    const bookingId = document.getElementById('edit-booking-id').value;
    const payload = {
        room_id: parseInt(document.getElementById('edit-book-room-id').value, 10),
        guest_name: document.getElementById('edit-book-guest-name').value.trim(),
        guest_email: document.getElementById('edit-book-guest-email').value.trim(),
        guest_phone: document.getElementById('edit-book-guest-phone').value.trim(),
        check_in: document.getElementById('edit-book-checkin').value,
        check_out: document.getElementById('edit-book-checkout').value,
        status: document.getElementById('edit-book-status').value
    };

    try {
        const res = await apiRequest(`/bookings/${bookingId}`, {
            method: 'PUT',
            body: payload
        });

        if (res.success) {
            showToast(res.message, 'success');
            closeModal('edit-booking-modal');
            await loadBookings();
        }
    } catch (err) {
        showToast(err.message, 'error', err.status === 409 ? 'Booking Conflict' : 'Error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Cancel Booking Action
window.cancelBookingAction = function(bookingId, guestName) {
    showConfirmDialog({
        title: 'Cancel Reservation',
        message: `Are you sure you want to cancel booking #${bookingId} for guest ${guestName}?`,
        confirmText: 'Yes, Cancel Reservation',
        confirmClass: 'btn-danger-outline',
        onConfirm: async () => {
            try {
                const res = await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'PATCH' });
                if (res.success) {
                    showToast(res.message, 'success');
                    await loadBookings();
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });
};

// Delete Booking Action
window.deleteBookingAction = function(bookingId) {
    showConfirmDialog({
        title: 'Delete Booking Record',
        message: `Are you sure you want to permanently remove booking record #${bookingId}?`,
        confirmText: 'Yes, Delete Permanently',
        confirmClass: 'btn-danger-outline',
        onConfirm: async () => {
            try {
                const res = await apiRequest(`/bookings/${bookingId}`, { method: 'DELETE' });
                if (res.success) {
                    showToast(res.message, 'success');
                    await loadBookings();
                }
            } catch (err) {
                showToast(err.message, 'error');
            }
        }
    });
};

// View Guest Folio / Receipt modal
window.viewGuestFolio = function(bookingId) {
    const booking = allBookings.find(b => b.id === bookingId);
    if (!booking) return;

    const folioContainer = document.getElementById('guest-folio-content');
    if (!folioContainer) return;

    folioContainer.innerHTML = `
        <div class="folio-sheet">
            <div class="folio-header">
                <div>
                    <h2 style="font-size: 1.4rem; color: var(--primary);">VERDANTÉ HOTEL</h2>
                    <p style="font-size: 0.75rem; color: var(--gold); letter-spacing: 0.1em; text-transform: uppercase;">Official Guest Folio</p>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Folio Ref: <strong>#RES-${booking.id}</strong></div>
                    <div style="margin-top: 0.25rem;">${renderStatusBadge(booking.status)}</div>
                </div>
            </div>

            <div class="folio-grid">
                <div>
                    <div class="folio-item-label">Guest Information</div>
                    <div class="folio-item-val" style="margin-top: 0.25rem;">${escapeHtml(booking.guest_name)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(booking.guest_email)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(booking.guest_phone)}</div>
                </div>
                <div>
                    <div class="folio-item-label">Accommodation</div>
                    <div class="folio-item-val" style="margin-top: 0.25rem;">Room ${escapeHtml(booking.room_number)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${escapeHtml(booking.room_type)} Suite</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary);">${formatCurrency(booking.price_per_night)} per night</div>
                </div>
                <div>
                    <div class="folio-item-label">Check-in Date</div>
                    <div class="folio-item-val" style="margin-top: 0.25rem;">${formatDate(booking.check_in)}</div>
                </div>
                <div>
                    <div class="folio-item-label">Check-out Date</div>
                    <div class="folio-item-val" style="margin-top: 0.25rem;">${formatDate(booking.check_out)}</div>
                </div>
            </div>

            <div class="folio-total-box">
                <div>
                    <strong>Total Duration:</strong> ${booking.nights} night${booking.nights > 1 ? 's' : ''}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.8rem; color: var(--text-muted);">Total Charges:</div>
                    <div style="font-size: 1.35rem; font-weight: 700; color: var(--primary);">${formatCurrency(booking.total_amount)}</div>
                </div>
            </div>
        </div>
    `;

    openModal('guest-folio-modal');
};
