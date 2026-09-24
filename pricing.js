// Keeps the hosting checkout flow's pricing summary in sync with user input,
// and carries the live total from the config step through billing and final checkout.
(function () {
    const STORAGE_KEY = 'serverEasyOrder';

    function formatRM(amount) {
        return 'RM' + amount.toFixed(2);
    }

    function readOrder() {
        try {
            return JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        } catch (e) {
            return null;
        }
    }

    function writeOrder(order) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(order));
        } catch (e) {
            // sessionStorage unavailable (e.g. private browsing) — on-page price still updates,
            // it just won't carry forward to the next checkout step.
        }
    }

    // Step 1: Server Details config page (storage/backup selects drive the price)
    function initConfigStep() {
        const box = document.querySelector('.summary-box[data-plan]');
        const storageSelect = document.getElementById('storage');
        const backupSelect = document.getElementById('backup');
        if (!box || !storageSelect || !backupSelect) return;

        const basePrice = parseFloat(box.dataset.basePrice);
        const planLabel = box.dataset.plan;
        const nameInput = document.getElementById('sname');
        const typeSelect = document.getElementById('stype');

        const totalTitle = document.getElementById('sum-total-title');
        const planPriceEl = document.getElementById('sum-plan-price');
        const storageLabelEl = document.getElementById('sum-storage-label');
        const storagePriceEl = document.getElementById('sum-storage-price');
        const backupPriceEl = document.getElementById('sum-backup-price');
        const totalEl = document.getElementById('sum-total');

        function selectedPrice(select) {
            return parseFloat(select.options[select.selectedIndex].dataset.price || '0');
        }

        function storageTB(select) {
            return select.options[select.selectedIndex].textContent.split(' (')[0];
        }

        function update() {
            const storagePrice = selectedPrice(storageSelect);
            const backupPrice = selectedPrice(backupSelect);
            const total = basePrice + storagePrice + backupPrice;

            totalTitle.textContent = formatRM(total) + '/month';
            planPriceEl.textContent = formatRM(basePrice);
            storageLabelEl.textContent = 'Storage (' + storageTB(storageSelect) + ')';
            storagePriceEl.textContent = storagePrice > 0 ? formatRM(storagePrice) : 'Included';
            backupPriceEl.textContent = backupPrice > 0 ? formatRM(backupPrice) : 'None';
            totalEl.textContent = formatRM(total) + '/mo';

            writeOrder({
                plan: planLabel,
                serverName: nameInput.value.trim() || 'my-first-server',
                serverType: typeSelect.value,
                storageTB: storageTB(storageSelect),
                storagePrice: storagePrice,
                backupPrice: backupPrice,
                basePrice: basePrice,
                total: total
            });
        }

        [storageSelect, backupSelect, typeSelect].forEach(function (el) {
            el.addEventListener('change', update);
        });
        nameInput.addEventListener('input', update);

        update();
    }

    // Steps 2 & 3: Payment & Billing / Checkout — display the order saved from step 1
    function initSyncedSummary() {
        const syncTarget = document.querySelector('[data-sync-plan]');
        if (!syncTarget) return;

        const order = readOrder();
        if (!order || order.plan !== syncTarget.dataset.syncPlan) return;

        const totalTitle = document.getElementById('sum-total-title');
        const planPriceEl = document.getElementById('sum-plan-price');
        const storageLabelEl = document.getElementById('sum-storage-label');
        const storagePriceEl = document.getElementById('sum-storage-price');
        const backupPriceEl = document.getElementById('sum-backup-price');
        const totalEl = document.getElementById('sum-total');

        if (totalTitle) totalTitle.textContent = formatRM(order.total) + '/month';
        if (planPriceEl) planPriceEl.textContent = formatRM(order.basePrice);
        if (storageLabelEl) storageLabelEl.textContent = 'Storage (' + order.storageTB + ')';
        if (storagePriceEl) storagePriceEl.textContent = order.storagePrice > 0 ? formatRM(order.storagePrice) : 'Included';
        if (backupPriceEl) backupPriceEl.textContent = order.backupPrice > 0 ? formatRM(order.backupPrice) : 'None';
        if (totalEl) totalEl.textContent = formatRM(order.total) + '/mo';

        const nameEl = document.getElementById('sum-server-name');
        const planEl = document.getElementById('sum-plan');
        const storageEl = document.getElementById('sum-storage');
        if (nameEl) nameEl.textContent = order.serverName;
        if (planEl) planEl.textContent = order.plan.replace(' Plan', '');
        if (storageEl) storageEl.textContent = order.storageTB;

        const accountRow = document.getElementById('sum-account-row');
        const accountEmailEl = document.getElementById('sum-account-email');
        if (accountRow && accountEmailEl && order.email) {
            accountEmailEl.textContent = order.email;
            accountRow.style.display = '';
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        initConfigStep();
        initSyncedSummary();
    });
})();
