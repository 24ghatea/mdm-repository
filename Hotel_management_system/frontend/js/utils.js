/**
 * VERDANTÉ HOTEL - FRONTEND UTILITIES & API HELPER
 */

const API_BASE = '/api';

// Escape HTML strings to prevent XSS
function escapeHtml(str) {
    if (!str && str !== 0) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Format numbers as currency
function formatCurrency(amount) {
    const num = Number(amount) || 0;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(num);
}

// Format dates nicely (e.g., "Oct 12, 2026")
function formatDate(dateString) {
    if (!dateString) return '—';
    try {
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            const d = new Date(year, month, day);
            return d.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch (e) {
        return dateString;
    }
}

// Render status badge HTML
function renderStatusBadge(status) {
    const s = String(status || '').toLowerCase();
    let badgeClass = 'status-available';

    if (s === 'available') badgeClass = 'status-available';
    else if (s === 'booked') badgeClass = 'status-booked';
    else if (s === 'maintenance') badgeClass = 'status-maintenance';
    else if (s === 'confirmed') badgeClass = 'status-confirmed';
    else if (s === 'completed') badgeClass = 'status-completed';
    else if (s === 'cancelled') badgeClass = 'status-cancelled';

    return `<span class="status-badge ${badgeClass}">${escapeHtml(status)}</span>`;
}

// Render Room Type Pill
function renderTypeBadge(type) {
    return `<span class="type-badge">${escapeHtml(type)}</span>`;
}

// Unified API request helper using Fetch API
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const config = {
        ...options,
        headers: {
            ...defaultHeaders,
            ...(options.headers || {})
        }
    };

    if (config.body && typeof config.body === 'object') {
        config.body = JSON.stringify(config.body);
    }

    try {
        const response = await fetch(url, config);
        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data.message || (data.errors ? data.errors.join(' ') : 'Request failed');
            const err = new Error(errorMsg);
            err.status = response.status;
            err.data = data;
            throw err;
        }

        return data;
    } catch (error) {
        console.error(`API Error [${endpoint}]:`, error);
        throw error;
    }
}

// Toast Notification System
function showToast(message, type = 'info', title = '') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    let defaultTitle = 'Notification';

    if (type === 'success') {
        defaultTitle = title || 'Success';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
        defaultTitle = title || 'Error';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else if (type === 'warning') {
        defaultTitle = title || 'Warning';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    } else {
        defaultTitle = title || 'Information';
        iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(defaultTitle)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 250);
    });

    container.appendChild(toast);

    // Auto dismiss after 4.5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 250);
        }
    }, 4500);
}

// Modal Helpers
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// Reusable Confirmation Dialog Modal
function showConfirmDialog({ title, message, confirmText = 'Confirm', confirmClass = 'btn-primary', onConfirm }) {
    let confirmModal = document.getElementById('global-confirm-modal');
    if (!confirmModal) {
        confirmModal = document.createElement('div');
        confirmModal.id = 'global-confirm-modal';
        confirmModal.className = 'modal-backdrop';
        confirmModal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <h3 class="modal-title" id="confirm-modal-title">Confirm Action</h3>
                    <button class="modal-close-btn" id="confirm-modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <p id="confirm-modal-message" style="color: var(--text-secondary);"></p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" id="confirm-modal-cancel">Cancel</button>
                    <button type="button" class="btn" id="confirm-modal-submit">Confirm</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);
    }

    document.getElementById('confirm-modal-title').textContent = title;
    document.getElementById('confirm-modal-message').textContent = message;

    const submitBtn = document.getElementById('confirm-modal-submit');
    submitBtn.className = `btn ${confirmClass}`;
    submitBtn.textContent = confirmText;

    // Remove old listeners
    const newSubmitBtn = submitBtn.cloneNode(true);
    submitBtn.parentNode.replaceChild(newSubmitBtn, submitBtn);

    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    const handleClose = () => closeModal('global-confirm-modal');
    cancelBtn.onclick = handleClose;
    closeBtn.onclick = handleClose;

    newSubmitBtn.onclick = async () => {
        newSubmitBtn.disabled = true;
        try {
            await onConfirm();
            handleClose();
        } catch (err) {
            console.error(err);
        } finally {
            newSubmitBtn.disabled = false;
        }
    };

    openModal('global-confirm-modal');
}

// Initialize Global UI Components (mobile menu, modal backdrops)
function initGlobalUi() {
    // Mobile Hamburger
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const mainNav = document.querySelector('.main-nav');
    if (mobileBtn && mainNav) {
        mobileBtn.addEventListener('click', () => {
            mainNav.classList.toggle('mobile-open');
        });
    }

    // Close modals on clicking backdrop
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close buttons inside modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-close-modal');
            closeModal(target);
        });
    });

    // Set today's date on all date inputs by default if empty
    const todayStr = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(input => {
        if (!input.value && input.hasAttribute('data-default-today')) {
            input.value = todayStr;
        }
    });
}

document.addEventListener('DOMContentLoaded', initGlobalUi);
