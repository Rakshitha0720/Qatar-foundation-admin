/**
 * api_connector.js
 * Wires the existing UI to the Flask backend.
 * admin.html / admin.js / admin.css are NOT modified.
 *
 * Strategy:
 *  - Redefine global functions (handleLogout, showDashboard) to add API calls.
 *  - Clone forms to strip the old DOM-only handlers, then attach new ones
 *    that validate + call the Flask API.
 *  - Add a second click listener on the opportunity nav button to load DB data.
 */

(function () {
    'use strict';

    // ── Fetch helper (always sends session cookie) ──────────────────────────
    function api(url, options) {
        return fetch(url, Object.assign({ credentials: 'same-origin' }, options));
    }

    // ── Strip existing event listeners by cloning the element ───────────────
    function resetListeners(el) {
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
        return clone;
    }

    // ── Escape HTML to prevent XSS when building card HTML ──────────────────
    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ════════════════════════════════════════════════════════════════════════
    // OVERRIDE: handleLogout  (defined in admin.js — we redefine it here)
    // ════════════════════════════════════════════════════════════════════════
    window.handleLogout = function () {
        api('/api/logout', { method: 'POST' }).finally(function () {
            document.getElementById('dashboardWrapper').classList.remove('active');
            document.getElementById('authWrapper').style.display = 'flex';
            document.body.style.alignItems = '';
            showToast('Signed out successfully');
            showPage('loginPage');
        });
    };

    // ════════════════════════════════════════════════════════════════════════
    // OVERRIDE: showDashboard — accept full name returned by the login API
    // ════════════════════════════════════════════════════════════════════════
    window.showDashboard = function (email, fullName) {
        document.getElementById('authWrapper').style.display = 'none';
        document.getElementById('dashboardWrapper').classList.add('active');
        document.body.style.alignItems = 'stretch';

        var displayName = fullName
            ? fullName
            : (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1));

        document.getElementById('dashName').textContent = displayName;
        document.getElementById('dashAvatar').textContent = displayName.substring(0, 2).toUpperCase();

        if (window.innerWidth <= 768) {
            document.getElementById('menuToggle').style.display = 'flex';
        }
    };

    // ════════════════════════════════════════════════════════════════════════
    // LOGIN FORM
    // ════════════════════════════════════════════════════════════════════════
    var loginForm = resetListeners(document.getElementById('loginForm'));
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors('loginForm');
        var valid = true;
        var email   = document.getElementById('loginEmail').value.trim();
        var password = document.getElementById('loginPassword').value.trim();
        var captchaInput = document.getElementById('loginCaptchaInput').value.trim();

        if (!email || !isValidEmail(email)) {
            showError('loginEmailErr');
            document.getElementById('loginEmail').classList.add('error');
            valid = false;
        }
        if (!password) {
            showError('loginPasswordErr', 'Please enter your password');
            document.getElementById('loginPassword').classList.add('error');
            valid = false;
        }
        if (!captchaInput) {
            showError('loginCaptchaErr', 'Please enter the captcha code');
            valid = false;
        } else if (captchaInput !== captchas.login) {
            showError('loginCaptchaErr', 'Captcha does not match. Please try again.');
            valid = false;
            generateCaptcha('login');
        }
        if (!valid) { shakeForm('loginForm'); return; }

        var rememberMe = document.querySelector('#loginForm .remember-me input').checked;

        api('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password, remember: rememberMe })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) {
                showError('loginEmailErr', data.error);
                document.getElementById('loginEmail').classList.add('error');
                document.getElementById('loginPassword').classList.add('error');
                shakeForm('loginForm');
                generateCaptcha('login');
            } else {
                showToast('Login successful! Redirecting...');
                generateCaptcha('login');
                var fullName = data.user ? data.user.full_name : null;
                setTimeout(function () { showDashboard(email, fullName); }, 1200);
            }
        })
        .catch(function () {
            showToast('Connection error. Is the server running?');
            generateCaptcha('login');
        });
    });

    // Re-attach the inline oninput strength checker that cloneNode preserves
    // and the error-clearing listeners that admin.js registered on all inputs
    loginForm.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('input', function () {
            this.classList.remove('error');
            var err = this.closest('.form-group') && this.closest('.form-group').querySelector('.error-msg');
            if (err) err.classList.remove('show');
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // SIGNUP FORM
    // ════════════════════════════════════════════════════════════════════════
    var signupForm = resetListeners(document.getElementById('signupForm'));
    signupForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors('signupForm');
        var valid = true;
        var name            = document.getElementById('signupName').value.trim();
        var email           = document.getElementById('signupEmail').value.trim();
        var password        = document.getElementById('signupPassword').value.trim();
        var confirmPassword = document.getElementById('signupConfirmPassword').value.trim();
        var captchaInput    = document.getElementById('signupCaptchaInput').value.trim();

        if (!name) { showError('signupNameErr'); document.getElementById('signupName').classList.add('error'); valid = false; }
        if (!email || !isValidEmail(email)) { showError('signupEmailErr'); document.getElementById('signupEmail').classList.add('error'); valid = false; }
        if (!password || password.length < 8) { showError('signupPasswordErr'); document.getElementById('signupPassword').classList.add('error'); valid = false; }
        if (!confirmPassword || password !== confirmPassword) { showError('signupConfirmPasswordErr'); document.getElementById('signupConfirmPassword').classList.add('error'); valid = false; }
        if (!captchaInput) { showError('signupCaptchaErr', 'Please enter the captcha code'); valid = false; }
        else if (captchaInput !== captchas.signup) { showError('signupCaptchaErr', 'Captcha does not match.'); valid = false; generateCaptcha('signup'); }

        if (!valid) { shakeForm('signupForm'); return; }

        api('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: name, email: email, password: password })
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) {
                showToast(data.error);
                shakeForm('signupForm');
                generateCaptcha('signup');
            } else {
                showToast('Account created successfully!');
                generateCaptcha('signup');
                document.getElementById('signupForm').reset();
                checkStrength('');
                setTimeout(function () { showPage('loginPage'); }, 1500);
            }
        })
        .catch(function () {
            showToast('Connection error. Is the server running?');
            generateCaptcha('signup');
        });
    });

    // Restore per-input error clearing + strength checker
    signupForm.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('input', function () {
            this.classList.remove('error');
            var err = this.closest('.form-group') && this.closest('.form-group').querySelector('.error-msg');
            if (err) err.classList.remove('show');
        });
    });
    var strengthInput = document.getElementById('signupPassword');
    if (strengthInput) {
        strengthInput.addEventListener('input', function () { checkStrength(this.value); });
    }

    // ════════════════════════════════════════════════════════════════════════
    // FORGOT PASSWORD FORM
    // ════════════════════════════════════════════════════════════════════════
    var forgotForm = resetListeners(document.getElementById('forgotForm'));
    forgotForm.addEventListener('submit', function (e) {
        e.preventDefault();
        clearAllErrors('forgotForm');
        var valid = true;
        var email        = document.getElementById('forgotEmail').value.trim();
        var captchaInput = document.getElementById('forgotCaptchaInput').value.trim();

        if (!email || !isValidEmail(email)) { showError('forgotEmailErr'); document.getElementById('forgotEmail').classList.add('error'); valid = false; }
        if (!captchaInput) { showError('forgotCaptchaErr', 'Please enter the captcha code'); valid = false; }
        else if (captchaInput !== captchas.forgot) { showError('forgotCaptchaErr', 'Captcha does not match.'); valid = false; generateCaptcha('forgot'); }

        if (!valid) { shakeForm('forgotForm'); return; }

        api('/api/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email })
        })
        .then(function (r) { return r.json(); })
        .then(function () {
            showToast('If this email is registered, a reset link has been printed to the server console.');
            generateCaptcha('forgot');
            document.getElementById('forgotForm').reset();
        })
        .catch(function () {
            showToast('Connection error. Is the server running?');
            generateCaptcha('forgot');
        });
    });

    forgotForm.querySelectorAll('input').forEach(function (inp) {
        inp.addEventListener('input', function () {
            this.classList.remove('error');
            var err = this.closest('.form-group') && this.closest('.form-group').querySelector('.error-msg');
            if (err) err.classList.remove('show');
        });
    });

    // ════════════════════════════════════════════════════════════════════════
    // OPPORTUNITY MANAGEMENT — load from DB when the section is opened
    // (adds a second listener; admin.js listener shows the section, ours loads data)
    // ════════════════════════════════════════════════════════════════════════
    var opportunityNavBtn = document.querySelector('.nav-item[data-page="opportunity"]');
    if (opportunityNavBtn) {
        opportunityNavBtn.addEventListener('click', function () {
            loadOpportunities();
        });
    }

    // ── Opportunity add/edit modal state ────────────────────────────────────
    var editingOpportunityId = null;

    function openOpportunityModalForEdit(op) {
        editingOpportunityId = op.id;
        document.querySelector('#opportunityModal .modal-header h3').textContent = 'Edit Opportunity';
        document.querySelector('#opportunityForm .btn-primary').textContent = 'Update Opportunity';

        var skillsStr = Array.isArray(op.skills) ? op.skills.join(', ') : op.skills;
        document.getElementById('oppName').value          = op.name;
        document.getElementById('oppDuration').value      = op.duration;
        document.getElementById('oppStartDate').value     = op.start_date;
        document.getElementById('oppDescription').value   = op.description;
        document.getElementById('oppSkills').value        = skillsStr;
        document.getElementById('oppCategory').value      = op.category;
        document.getElementById('oppFuture').value        = op.future_opportunities;
        document.getElementById('oppMaxApplicants').value = op.max_applicants || '';

        document.getElementById('opportunityModal').classList.add('active');
    }

    function resetOpportunityModal() {
        editingOpportunityId = null;
        document.querySelector('#opportunityModal .modal-header h3').textContent = 'Add New Opportunity';
        document.querySelector('#opportunityForm .btn-primary').textContent = 'Create Opportunity';
    }

    // Patch closeOpportunityModal so it also resets edit state
    var _origClose = window.closeOpportunityModal;
    window.closeOpportunityModal = function () {
        if (_origClose) _origClose();
        resetOpportunityModal();
    };

    // ── Load all opportunities for the logged-in admin ──────────────────────
    function loadOpportunities() {
        var grid = document.querySelector('.opportunities-grid');
        if (!grid) return;
        grid.innerHTML = '<div class="opp-placeholder" style="grid-column:1/-1;text-align:center;padding:40px;color:var(--qf-text-light)">Loading...</div>';

        api('/api/opportunities')
        .then(function (r) {
            if (r.status === 401) {
                showToast('Session expired. Please log in again.');
                handleLogout();
                return null;
            }
            return r.json();
        })
        .then(function (data) {
            if (!data) return;
            grid.innerHTML = '';
            if (data.data.length === 0) {
                grid.innerHTML = '<div class="opp-placeholder" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--qf-text-light);font-size:15px">No opportunities yet. Click \'Add New Opportunity\' to get started.</div>';
                return;
            }
            data.data.forEach(function (op) { renderCard(op, grid); });
        })
        .catch(function () {
            grid.innerHTML = '';
            showToast('Failed to load opportunities. Is the server running?');
        });
    }

    // ── Build and insert one opportunity card ───────────────────────────────
    function renderCard(op, grid) {
        var skills = Array.isArray(op.skills)
            ? op.skills
            : op.skills.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        var applicantsText = op.max_applicants ? (op.max_applicants + ' applicants') : '0 applicants';

        var card = document.createElement('div');
        card.className = 'opportunity-card';
        card.dataset.id = op.id;

        card.innerHTML =
            '<div class="opportunity-card-header">' +
                '<h5>' + esc(op.name) + '</h5>' +
                '<div class="opportunity-meta">' +
                    '<span><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' + esc(op.duration) + '</span>' +
                    '<span><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>' + esc(op.start_date) + '</span>' +
                '</div>' +
            '</div>' +
            '<p class="opportunity-description">' + esc(op.description) + '</p>' +
            '<div class="opportunity-skills">' +
                '<div class="opportunity-skills-label">Skills You\'ll Gain</div>' +
                '<div class="skills-tags">' +
                    skills.map(function (s) { return '<span class="skill-tag">' + esc(s) + '</span>'; }).join('') +
                '</div>' +
            '</div>' +
            '<div class="opportunity-footer">' +
                '<span class="applicants-count">' + esc(applicantsText) + '</span>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button class="view-course-btn" style="width:auto;padding:8px 14px;" data-action="view">View Details</button>' +
                    '<button class="view-course-btn" style="width:auto;padding:8px 14px;" data-action="edit">Edit</button>' +
                    '<button class="view-course-btn" style="width:auto;padding:8px 14px;background:#dc2626;" data-action="delete">Delete</button>' +
                '</div>' +
            '</div>';

        card.querySelector('[data-action="view"]').addEventListener('click', function () {
            openOpportunityDetails(op.name, {
                duration: op.duration,
                startDate: op.start_date,
                description: op.description,
                skills: skills,
                applicants: op.max_applicants || 0,
                futureOpportunities: op.future_opportunities,
                prerequisites: ''
            });
        });

        card.querySelector('[data-action="edit"]').addEventListener('click', function () {
            openOpportunityModalForEdit(op);
        });

        card.querySelector('[data-action="delete"]').addEventListener('click', function () {
            deleteOpportunity(op.id, card);
        });

        grid.appendChild(card);
    }

    // ── Delete with confirmation ─────────────────────────────────────────────
    function deleteOpportunity(id, card) {
        if (!confirm('Are you sure you want to delete this opportunity? This action cannot be undone.')) return;

        api('/api/opportunities/' + id, { method: 'DELETE' })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.status === 'success') {
                card.remove();
                showToast('Opportunity deleted successfully');
                var grid = document.querySelector('.opportunities-grid');
                if (grid && grid.querySelectorAll('.opportunity-card').length === 0) {
                    grid.innerHTML = '<div class="opp-placeholder" style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--qf-text-light);font-size:15px">No opportunities yet. Click \'Add New Opportunity\' to get started.</div>';
                }
            } else {
                showToast(data.error || 'Failed to delete opportunity');
            }
        })
        .catch(function () { showToast('Failed to delete opportunity'); });
    }

    // ════════════════════════════════════════════════════════════════════════
    // OPPORTUNITY FORM  (replace admin.js handler with one that calls the API)
    // ════════════════════════════════════════════════════════════════════════
    var oppForm = resetListeners(document.getElementById('opportunityForm'));
    oppForm.addEventListener('submit', function (e) {
        e.preventDefault();

        var name               = document.getElementById('oppName').value.trim();
        var duration           = document.getElementById('oppDuration').value.trim();
        var startDate          = document.getElementById('oppStartDate').value;
        var description        = document.getElementById('oppDescription').value.trim();
        var skillsRaw          = document.getElementById('oppSkills').value.trim();
        var category           = document.getElementById('oppCategory').value;
        var futureOpportunities = document.getElementById('oppFuture').value.trim();
        var maxApplicants      = document.getElementById('oppMaxApplicants').value.trim();

        if (!name || !duration || !startDate || !description || !skillsRaw || !category || !futureOpportunities) {
            showToast('Please fill all required fields');
            return;
        }

        var payload = {
            name: name, duration: duration, start_date: startDate,
            description: description, skills: skillsRaw, category: category,
            future_opportunities: futureOpportunities,
            max_applicants: maxApplicants ? parseInt(maxApplicants, 10) : null
        };

        var isEdit = editingOpportunityId !== null;
        var url    = isEdit ? ('/api/opportunities/' + editingOpportunityId) : '/api/opportunities';
        var method = isEdit ? 'PUT' : 'POST';

        api(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(function (r) { return r.json(); })
        .then(function (data) {
            if (data.error) { showToast(data.error); return; }

            var grid = document.querySelector('.opportunities-grid');

            // Remove empty-state placeholder if present
            var placeholder = grid.querySelector('.opp-placeholder');
            if (placeholder) placeholder.remove();

            if (isEdit) {
                var oldCard = grid.querySelector('[data-id="' + editingOpportunityId + '"]');
                if (oldCard) oldCard.remove();
                showToast('Opportunity updated successfully!');
            } else {
                showToast('Opportunity created successfully!');
            }

            renderCard(data.data, grid);
            closeOpportunityModal();
        })
        .catch(function () { showToast('Failed to save opportunity. Is the server running?'); });
    });

})();
