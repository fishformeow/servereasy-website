// Client-side validation for the Contact and Payment & Billing forms:
// blocks submission/navigation on bad input and shows an inline message
// with the expected format instead of silently accepting anything.
(function () {
    const NAME_PATTERN = /^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/;
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    const CARD_PATTERN = /^\d{4} \d{4} \d{4} \d{4}$/;
    const EXPIRY_PATTERN = /^(0[1-9]|1[0-2])\/\d{2}$/;

    function showError(input, message) {
        input.classList.add('input-invalid');
        const err = document.getElementById('err-' + input.id);
        if (err) {
            err.textContent = message;
            err.classList.add('visible');
        }
    }

    function clearError(input) {
        input.classList.remove('input-invalid');
        const err = document.getElementById('err-' + input.id);
        if (err) {
            err.textContent = '';
            err.classList.remove('visible');
        }
    }

    // Runs each rule in order against the trimmed value and stops at the
    // first failure, so the user always sees the single most relevant fix.
    function validateField(input, rules) {
        const value = input.value.trim();
        for (let i = 0; i < rules.length; i++) {
            if (!rules[i].test(value)) {
                showError(input, rules[i].message);
                return false;
            }
        }
        clearError(input);
        return true;
    }

    function isExpiryInFuture(mmYY) {
        const parts = mmYY.split('/');
        const mm = parseInt(parts[0], 10);
        const yy = parseInt(parts[1], 10);
        const now = new Date();
        const currentYY = now.getFullYear() % 100;
        const currentMM = now.getMonth() + 1;
        return yy > currentYY || (yy === currentYY && mm >= currentMM);
    }

    // Strips anything that isn't a digit as the user types, so letters/symbols
    // can never end up in the card number or expiry fields in the first place.
    function restrictToDigits(input, formatter) {
        input.addEventListener('input', function () {
            const digits = input.value.replace(/\D/g, '');
            input.value = formatter(digits);
        });
    }

    function initContactForm() {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const messageInput = document.getElementById('message');
        const submitLink = document.getElementById('contact-submit');
        if (!nameInput || !emailInput || !messageInput || !submitLink) return;

        const successNote = document.getElementById('contact-success');

        function validateName() {
            return validateField(nameInput, [
                { test: v => v.length > 0, message: 'Full name is required.' },
                { test: v => v.length >= 2, message: 'Enter your full name (at least 2 characters).' },
                { test: v => NAME_PATTERN.test(v), message: 'Letters, spaces and hyphens only — e.g. "Ahmad Rahim".' }
            ]);
        }

        function validateEmail() {
            return validateField(emailInput, [
                { test: v => v.length > 0, message: 'Email address is required.' },
                { test: v => EMAIL_PATTERN.test(v), message: 'Enter a valid email address, e.g. name@example.com.' }
            ]);
        }

        function validateMessage() {
            return validateField(messageInput, [
                { test: v => v.length > 0, message: 'Message is required.' },
                { test: v => v.length >= 10, message: 'Please tell us a bit more — at least 10 characters.' }
            ]);
        }

        [[nameInput, validateName], [emailInput, validateEmail], [messageInput, validateMessage]].forEach(function (pair) {
            pair[0].addEventListener('input', pair[1]);
            pair[0].addEventListener('blur', pair[1]);
        });

        submitLink.addEventListener('click', function (evt) {
            evt.preventDefault();
            const validName = validateName();
            const validEmail = validateEmail();
            const validMessage = validateMessage();

            if (validName && validEmail && validMessage) {
                if (successNote) successNote.classList.add('visible');
                nameInput.value = '';
                emailInput.value = '';
                messageInput.value = '';
                document.getElementById('topic').selectedIndex = 0;
            } else if (successNote) {
                successNote.classList.remove('visible');
            }
        });
    }

    // Account step: Create Account / Sign In tabs, gating checkout on an email
    // (and password) before payment details are ever collected.
    const ACCOUNT_STORAGE_KEY = 'serverEasyOrder';

    function saveAccountEmail(email) {
        try {
            const raw = sessionStorage.getItem(ACCOUNT_STORAGE_KEY);
            const order = raw ? JSON.parse(raw) : {};
            order.email = email;
            sessionStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(order));
        } catch (e) {
            // sessionStorage unavailable (e.g. private browsing) — checkout can still proceed,
            // it just won't show the signed-in email on later steps.
        }
    }

    function initAccountForm() {
        const tabs = document.querySelectorAll('.auth-tab');
        const nextLink = document.getElementById('account-next');
        if (!tabs.length || !nextLink) return;

        const panels = {
            'panel-signup': document.getElementById('panel-signup'),
            'panel-signin': document.getElementById('panel-signin')
        };

        function activatePanel(panelId) {
            tabs.forEach(function (tab) {
                tab.classList.toggle('active', tab.dataset.panel === panelId);
            });
            Object.keys(panels).forEach(function (id) {
                if (panels[id]) panels[id].style.display = id === panelId ? '' : 'none';
            });
        }

        tabs.forEach(function (tab) {
            tab.addEventListener('click', function () {
                activatePanel(tab.dataset.panel);
            });
        });

        const signupEmail = document.getElementById('acc-email');
        const signupPassword = document.getElementById('acc-password');
        const signupConfirm = document.getElementById('acc-password-confirm');
        const signinEmail = document.getElementById('signin-email');
        const signinPassword = document.getElementById('signin-password');

        function validateEmailField(input) {
            return validateField(input, [
                { test: v => v.length > 0, message: 'Email address is required.' },
                { test: v => EMAIL_PATTERN.test(v), message: 'Enter a valid email address, e.g. name@example.com.' }
            ]);
        }

        function validatePasswordField(input) {
            return validateField(input, [
                { test: v => v.length > 0, message: 'Password is required.' },
                { test: v => v.length >= 8, message: 'Use at least 8 characters.' }
            ]);
        }

        function validateSignupConfirm() {
            return validateField(signupConfirm, [
                { test: v => v.length > 0, message: 'Confirm your password.' },
                { test: v => v === signupPassword.value.trim(), message: 'Passwords do not match.' }
            ]);
        }

        [signupEmail, signinEmail].forEach(function (input) {
            if (!input) return;
            input.addEventListener('input', function () { validateEmailField(input); });
            input.addEventListener('blur', function () { validateEmailField(input); });
        });
        [signupPassword, signinPassword].forEach(function (input) {
            if (!input) return;
            input.addEventListener('input', function () { validatePasswordField(input); });
            input.addEventListener('blur', function () { validatePasswordField(input); });
        });
        if (signupConfirm) {
            signupConfirm.addEventListener('input', validateSignupConfirm);
            signupConfirm.addEventListener('blur', validateSignupConfirm);
        }

        nextLink.addEventListener('click', function (evt) {
            const signupActive = !panels['panel-signup'] || panels['panel-signup'].style.display !== 'none';
            let valid, email;

            if (signupActive) {
                valid = validateEmailField(signupEmail) && validatePasswordField(signupPassword) && validateSignupConfirm();
                email = signupEmail.value.trim();
            } else {
                valid = validateEmailField(signinEmail) && validatePasswordField(signinPassword);
                email = signinEmail.value.trim();
            }

            if (!valid) {
                evt.preventDefault();
                return;
            }
            saveAccountEmail(email);
        });
    }

    function initBillingForm() {
        const nameInput = document.getElementById('cname');
        const numInput = document.getElementById('cnum');
        const expInput = document.getElementById('cexp');
        const nextLink = document.getElementById('billing-next');
        if (!nameInput || !numInput || !expInput || !nextLink) return;

        restrictToDigits(numInput, function (digits) {
            return digits.slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
        });
        restrictToDigits(expInput, function (digits) {
            digits = digits.slice(0, 4);
            return digits.length > 2 ? digits.slice(0, 2) + '/' + digits.slice(2) : digits;
        });

        function validateName() {
            return validateField(nameInput, [
                { test: v => v.length > 0, message: 'Name on card is required.' },
                { test: v => v.length >= 2, message: 'Enter the full name as it appears on the card.' },
                { test: v => NAME_PATTERN.test(v), message: 'Letters, spaces and hyphens only — e.g. "Ahmad Rahim".' }
            ]);
        }

        function validateNumber() {
            return validateField(numInput, [
                { test: v => v.length > 0, message: 'Card number is required.' },
                { test: v => CARD_PATTERN.test(v), message: 'Enter a 16-digit card number in the format 0000 0000 0000 0000.' }
            ]);
        }

        function validateExpiry() {
            return validateField(expInput, [
                { test: v => v.length > 0, message: 'Expiry date is required.' },
                { test: v => EXPIRY_PATTERN.test(v), message: 'Enter the expiry date in MM/YY format, e.g. 09/28.' },
                { test: v => isExpiryInFuture(v), message: 'This expiry date has already passed — enter a future MM/YY date.' }
            ]);
        }

        [[nameInput, validateName], [numInput, validateNumber], [expInput, validateExpiry]].forEach(function (pair) {
            pair[0].addEventListener('input', pair[1]);
            pair[0].addEventListener('blur', pair[1]);
        });

        nextLink.addEventListener('click', function (evt) {
            const validName = validateName();
            const validNumber = validateNumber();
            const validExpiry = validateExpiry();

            if (!validName || !validNumber || !validExpiry) {
                evt.preventDefault();
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        initContactForm();
        initAccountForm();
        initBillingForm();
    });
})();
