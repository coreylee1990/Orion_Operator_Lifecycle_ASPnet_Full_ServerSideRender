// ======================
// Partial View Helpers
// ======================

/**
 * Fetch and render operator card from server
 */
async function renderOperatorCardPartial(operatorId, statusName, statusIndex, pizzaStatusId = null) {
    try {
        let url = `/Requirements/RenderOperatorCard?operatorId=${encodeURIComponent(operatorId)}&statusName=${encodeURIComponent(statusName)}&divisionId=${encodeURIComponent(mainDivisionFilter)}&statusIndex=${statusIndex}`;
        if (pizzaStatusId) {
            url += `&pizzaStatusId=${encodeURIComponent(pizzaStatusId)}`;
        }
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Failed to render operator card: ${response.status}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error('Error fetching operator card partial:', error);
        return null;
    }
}

/**
 * Fetch and render certification badge from server
 */
async function renderCertBadgePartial(certName, statusName) {
    try {
        const response = await fetch(`/Requirements/RenderCertBadge?certName=${encodeURIComponent(certName)}&statusName=${encodeURIComponent(statusName)}`);
        if (!response.ok) {
            console.error(`Failed to render cert badge: ${response.status}`);
            return null;
        }
        return await response.text();
    } catch (error) {
        console.error('Error fetching cert badge partial:', error);
        return null;
    }
}

// ======================
// Modal Functions
// ======================

// Show the duplicate cert modal
async function showCertDuplicateModal(certName, oldStatus, newStatus, stepIndex) {
    const modalBody = document.getElementById('certDuplicateModalBody');
    if (!modalBody) {
        console.error('❌ Cert duplicate modal body not found');
        return;
    }

    // Show loading state
    modalBody.innerHTML = '<div style="padding: 20px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

    try {
        // Fetch pre-rendered content from server
        const response = await fetch(
            `/Requirements/RenderCertDuplicateWarning?certName=${encodeURIComponent(certName)}&oldStatus=${encodeURIComponent(oldStatus)}&newStatus=${encodeURIComponent(newStatus)}&divisionId=${encodeURIComponent(mainDivisionFilter)}`
        );

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const html = await response.text();
        modalBody.innerHTML = html;

        // Store context for confirm
        window._certDuplicateModalContext = { certName, oldStatus, newStatus, stepIndex };

        // Show modal (Bootstrap 5)
        const modalEl = document.getElementById('certDuplicateModal');
        if (modalEl) {
            if (window.bootstrap && window.bootstrap.Modal) {
                const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.show();
            } else if (typeof $ !== 'undefined' && $(modalEl).modal) {
                $(modalEl).modal('show');
            } else {
                modalEl.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('❌ Error loading cert duplicate warning:', error);
        modalBody.innerHTML = `<div style="padding: 20px; color: #dc3545;">Error loading data: ${error.message}</div>`;
    }
}

// Confirm move on modal button click
document.addEventListener('DOMContentLoaded', function() {
    // Cert Duplicate Modal Confirm
    const certConfirmBtn = document.getElementById('certDuplicateModalConfirmBtn');
    if (certConfirmBtn) {
        certConfirmBtn.addEventListener('click', function() {
            const ctx = window._certDuplicateModalContext;
            if (!ctx) return;
            // Remove from old status, add to new
            removeCertFromStatus(ctx.oldStatus, ctx.certName);
            addCertToStatus(ctx.newStatus, ctx.certName);
            renderWorkflow();
            markUnsaved();
            // Hide modal
            const modalEl = document.getElementById('certDuplicateModal');
            if (modalEl && window.bootstrap && window.bootstrap.Modal) {
                const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.hide();
            } else if (modalEl && typeof $ !== 'undefined' && $(modalEl).modal) {
                $(modalEl).modal('hide');
            } else if (modalEl) {
                modalEl.style.display = 'none';
            }
            window._certDuplicateModalContext = null;
        });
    }

    // Add Status Confirm Button
    const addStatusBtn = document.getElementById('addStatusConfirmBtn');
    if (addStatusBtn) {
        addStatusBtn.addEventListener('click', function() {
            confirmAddStatus();
        });
    }

    // Status Delete Warning Modal Confirm Button
    const statusDeleteConfirmBtn = document.getElementById('statusDeleteWarningConfirmBtn');
    if (statusDeleteConfirmBtn) {
        statusDeleteConfirmBtn.addEventListener('click', function() {
            const ctx = window._statusDeleteContext;
            if (!ctx) return;
            
            // Execute the deletion WITHOUT reassigning
            executeStatusDeletion(ctx.statusName, ctx.divisionId);
            
            // Hide modal
            const modalEl = document.getElementById('statusDeleteWarningModal');
            if (modalEl && window.bootstrap && window.bootstrap.Modal) {
                const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                modal.hide();
            } else if (modalEl && typeof $ !== 'undefined' && $(modalEl).modal) {
                $(modalEl).modal('hide');
            } else if (modalEl) {
                modalEl.style.display = 'none';
            }
            
            window._statusDeleteContext = null;
        });
    }

    // Status Delete With Reassign Button
    const statusDeleteWithReassignBtn = document.getElementById('statusDeleteWithReassignBtn');
    if (statusDeleteWithReassignBtn) {
        statusDeleteWithReassignBtn.addEventListener('click', async function() {
            const ctx = window._statusDeleteContext;
            if (!ctx) return;
            
            const targetSelect = document.getElementById('targetStatusSelect');
            if (!targetSelect || !targetSelect.value) {
                alert('Please select a target status to reassign operators to.');
                return;
            }

            const targetStatusName = targetSelect.value;
            const targetOption = targetSelect.options[targetSelect.selectedIndex];
            const targetStatusId = targetOption.getAttribute('data-statusid');
            const targetOrderId = targetOption.getAttribute('data-orderid');

            // Confirm action
            if (!confirm(`This will:\n\n1. Move ${ctx.operators.length} operator(s) from "${ctx.statusName}" to "${targetStatusName}"\n2. Delete "${ctx.statusName}" from the division\n\nProceed?`)) {
                return;
            }

            // Reassign operators
            try {
                const operatorIds = ctx.operators.map(op => op.ID);
                const response = await fetch('/api/data/operators/bulkupdatestatus', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        OperatorIds: operatorIds,
                        NewStatusName: targetStatusName,
                        NewStatusId: targetStatusId,
                        NewOrderId: targetOrderId
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to reassign operators: ' + response.status);
                }

                const result = await response.json();

                // Now execute deletion
                executeStatusDeletion(ctx.statusName, ctx.divisionId);

                // Hide modal
                const modalEl = document.getElementById('statusDeleteWarningModal');
                if (modalEl && window.bootstrap && window.bootstrap.Modal) {
                    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                    modal.hide();
                } else if (modalEl && typeof $ !== 'undefined' && $(modalEl).modal) {
                    $(modalEl).modal('hide');
                } else if (modalEl) {
                    modalEl.style.display = 'none';
                }

                window._statusDeleteContext = null;

                alert(`✅ Success!\n\n• ${result.count} operators moved to "${targetStatusName}"\n• Status "${ctx.statusName}" marked for deletion\n\nClick "Save Changes" to persist these changes.`);
            } catch (error) {
                console.error('❌ Error reassigning operators:', error);
                alert('Error reassigning operators: ' + error.message);
            }
        });
    }

    // Event delegation for delete status buttons
    document.addEventListener('click', function(e) {
        const deleteBtn = e.target.closest('.delete-cert-type-btn');
        if (deleteBtn) {
            const statusName = deleteBtn.dataset.statusName;
            const division = deleteBtn.dataset.division;
            if (statusName && division) {
                deleteStatus(statusName, division);
            } else {
                console.warn('⚠️ Missing statusName or division data attributes');
            }
        }
    });
});
        
        let operators = [];
        let statusTypes = [];
        let certTypes = [];  // Raw cert types from database
        let certifications = [];  // All certifications from pay_Certifications.json
        let certRequirements = {};
        // Chart instances
        let workflowChartInstance = null;
        let complianceChartInstance = null;
        let currentCompliancePercent = 0; // Store current compliance for chart plugin
        
        // Removed pizzaStatusRequirements variable and all related logic
        let currentWorkflow = [];
        let hasUnsavedChanges = false;
        let originalCertRequirements = {};
        let allExistingCerts = [];
        let currentAutocompleteIndex = -1;
        let currentFilter = 'all';
        let searchQuery = '';
        let editMode = false;
        let selectedDivision = 'ALL';  // Default to All Divisions (for edit mode)
        let mainDivisionFilter = 'ALL';  // Division filter for main operator view
        let mainClientFilter = '';  // Client filter for multi-tenant support
        let clients = [];  // List of clients
        let pizzaStatuses = [];  // Pizza statuses with client relationships
        let statusTracker = [];  // Track how long operators have been in each status
        let editedRequirements = {};

        // Change tracking - only save items that were actually modified
        const modifiedCertTypeIds = new Set();
        const modifiedStatusTypeIds = new Set();
        const modifiedPizzaStatusIds = new Set();

        // Loading/saving coordination flags
        let isLoadingData = false;
        let cancelLoadData = false;

        // Divisions to include (whitelist)
        const ALLOWED_DIVISIONS = [
            '2 - IL', '3 - TX', '5 - CA', '6 - FL', '7 - MI', '8 - OH', '10 - OR', '11 - GA', '12 - PA'
        ];

        // Helper to check if a division matches a filter (handling "12 - PA" vs "12-PA")
        function isDivisionMatch(division, filter) {
            if (!division || !filter) return false;
            if (filter === 'ALL') return ALLOWED_DIVISIONS.includes(division);
            // Only allow divisions in whitelist
            if (!ALLOWED_DIVISIONS.includes(division)) return false;
            // Extract the numeric/code part (e.g., "12" from "12 - PA")
            const filterCode = filter.split(' - ')[0].trim();
            return division.includes(filterCode);
        }

        // Utility: Sort divisions by their number (e.g., "2 - IL" => 2)
            // Use this utility wherever divisions are displayed or iterated
            // Example: When rendering division dropdowns or stats panels, use:
            // const sortedDivisions = sortDivisionsByNumber(ALLOWED_DIVISIONS);
            // sortedDivisions.forEach(division => { ... });
        function sortDivisionsByNumber(divisions) {
            return divisions.slice().sort((a, b) => {
                const numA = parseInt(a.split(' - ')[0].trim());
                const numB = parseInt(b.split(' - ')[0].trim());
                return numA - numB;
            });
        }
        
        let changesMade = false;
        let sqlStatements = [];
        let operatorDivisionMap = {};
        let draggedStatusElement = null;
        let draggedStatusName = null;
        let currentStatusOrder = [];

        // Certification name normalization for matching
        function normalizeCertName(name) {
            if (!name || typeof name !== 'string') return '';
            return name.toLowerCase().trim().replace(/\s+/g, ' ');
        }

        function certNamesMatch(cert1, cert2) {
            return normalizeCertName(cert1) === normalizeCertName(cert2);
        }

        function findMatchingCert(certName, certList) {
            if (!certList || !Array.isArray(certList)) return null;
            const normalized = normalizeCertName(certName);
            return certList.find(c => {
                const certType = typeof c === 'string' ? c : (c?.CertType || '');
                return normalizeCertName(certType) === normalized;
            });
        }

        // Calculate how many days an operator has been in their current status
        function getOperatorDaysInStatus(operatorId) {
            if (!statusTracker || statusTracker.length === 0) {
                return null;
            }
            
            // Find the operator to get their current status
            const operator = operators.find(op => op.ID === operatorId);
            if (!operator || !operator.Status) {
                return null;
            }
            
            // Find all status tracker records for this operator
            const operatorRecords = statusTracker.filter(st => st.OperatorID === operatorId);
            
            if (operatorRecords.length === 0) return null;
            
            // Find matching status type for operator's current status and division
            const matchingStatusType = statusTypes.find(st => 
                st.Status === operator.Status && 
                st.DivisionID === operator.DivisionID
            );
            
            if (!matchingStatusType) {
                // Fallback: use most recent record if no matching status found
                let mostRecent = operatorRecords[0];
                for (const record of operatorRecords) {
                    const recordDate = new Date(record.Date);
                    const mostRecentDate = new Date(mostRecent.Date);
                    if (recordDate > mostRecentDate) {
                        mostRecent = record;
                    }
                }
                const statusDate = new Date(mostRecent.Date);
                const today = new Date();
                const diffTime = Math.abs(today - statusDate);
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
            
            // Find records matching the operator's current StatusID
            const currentStatusRecords = operatorRecords.filter(st => 
                st.StatusID === matchingStatusType.Id
            );
            
            if (currentStatusRecords.length === 0) {
                // Fallback if no exact match
                let mostRecent = operatorRecords[0];
                for (const record of operatorRecords) {
                    const recordDate = new Date(record.Date);
                    const mostRecentDate = new Date(mostRecent.Date);
                    if (recordDate > mostRecentDate) {
                        mostRecent = record;
                    }
                }
                const statusDate = new Date(mostRecent.Date);
                const today = new Date();
                const diffTime = Math.abs(today - statusDate);
                return Math.floor(diffTime / (1000 * 60 * 60 * 24));
            }
            
            // Find the most recent record for current status
            let mostRecent = currentStatusRecords[0];
            for (const record of currentStatusRecords) {
                const recordDate = new Date(record.Date);
                const mostRecentDate = new Date(mostRecent.Date);
                if (recordDate > mostRecentDate) {
                    mostRecent = record;
                }
            }
            
            // Calculate days since that date
            const statusDate = new Date(mostRecent.Date);
            const today = new Date();
            const diffTime = Math.abs(today - statusDate);
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            return diffDays;
        }

        // Build requirements structure from master definition
        function buildRequirementsFromPizzaStatus(pizzaRequirements, statusTypes) {
            const requirements = {};
            // For each status type, find its pizza status and get requirements
            for (const st of statusTypes) {
                const status = st.Status;
                const division = st.DivisionID;
                const pizzaId = st.PizzaStatusID;

                // IGNORE DELETED STATUSES
                if (st.isDeleted === true || st.IsDelete === true || String(st.isDeleted) === 'true') {
                    continue; // Skip processing deleted statuses
                }

                // Only allow divisions in whitelist
                if (!ALLOWED_DIVISIONS.includes(division)) {
                    continue;
                }

                if (!pizzaId || !pizzaRequirements[pizzaId]) {
                    continue;
                }

                const pizzaReq = pizzaRequirements[pizzaId];

                // Filter out non-operator statuses
                if (pizzaReq.is_operator !== true) {
                    continue;
                }

                const requiredCerts = pizzaReq.required_certifications.map(c => c.name);

                // Initialize status if not exists
                if (!requirements[status]) {
                    requirements[status] = {
                        order: st.OrderID || '',
                        divisions: {}
                    };
                }

                // Count operators in this division/status
                const operatorsInStatus = operators.filter(op => 
                    op.DivisionID === division && op.Status === status
                );
                
                // Store requirements for this status+division combo
                requirements[status].divisions[division] = {
                    order: st.OrderID || '',
                    pizzaStatusId: pizzaId,
                    pizzaStatusName: pizzaReq.pizza_status_name,
                    total_operators: operatorsInStatus.length,
                    required: requiredCerts.map(cert => ({
                        cert: cert,
                        count: operatorsInStatus.length,
                        total: operatorsInStatus.length,
                        percentage: 100.0
                    })),
                    common: [],
                    optional: []
                };
            }
            
            return requirements;
        }

        // Convert current requirements back to pizza status format for saving
        function convertToPizzaStatusFormat(requirements) {
            const pizzaGroups = {};
            
            // Step 1: Build a map of Status Name -> Pizza ID to fill in gaps
            const statusToPizzaIdMap = {};
            for (const [statusName, statusData] of Object.entries(requirements)) {
                const divisions = statusData.divisions || {};
                for (const divData of Object.values(divisions)) {
                    if (divData.pizzaStatusId) {
                        statusToPizzaIdMap[statusName] = divData.pizzaStatusId;
                        statusToPizzaIdMap[statusName.toUpperCase()] = divData.pizzaStatusId;
                    }
                }
            }

            // Group requirements by pizza status
            for (const [statusName, statusData] of Object.entries(requirements)) {
                const divisions = statusData.divisions || {};
                
                for (const [division, divData] of Object.entries(divisions)) {
                    let pizzaId = divData.pizzaStatusId;
                    
                    // Fallback: Try to infer ID from status name if missing
                    if (!pizzaId && statusToPizzaIdMap[statusName]) {
                        pizzaId = statusToPizzaIdMap[statusName];
                    }

                    if (!pizzaId) continue;
                    
                    // Initialize pizza status group if not exists
                    if (!pizzaGroups[pizzaId]) {
                        pizzaGroups[pizzaId] = {
                            pizza_status_id: pizzaId,
                            pizza_status_name: divData.pizzaStatusName || 'Unknown',
                            description: divData.pizzaStatusName || '',
                            is_operator: true,
                            threshold: 0.80,
                            operators_analyzed: divData.total_operators || 0,
                            required_certifications: [],
                            status_mappings: []
                        };
                    }
                    
                    // Update required certifications (MERGE with DIVISION SPECIFICITY)
                    const currentCerts = (divData.required || []).map(c => c.cert);
                    currentCerts.forEach(certName => {
                        // Check if exact match (Same Cert AND Same Division OR Global) exists
                        const existingCert = pizzaGroups[pizzaId].required_certifications.find(
                            pc => normalizeCertName(pc.name) === normalizeCertName(certName) &&
                                  (pc.division === division)
                        );
                        
                        if (!existingCert) {
                            pizzaGroups[pizzaId].required_certifications.push({
                                name: certName,
                                division: division, // Persist the division!
                                coverage: {
                                    count: divData.total_operators,
                                    total: divData.total_operators,
                                    percentage: 100.0
                                }
                            });
                        }
                    });
                    
                    // Add this status+division to the mappings
                    const existingMapping = pizzaGroups[pizzaId].status_mappings.find(
                        m => m.status === statusName && m.division === division
                    );
                    
                    if (!existingMapping) {
                        pizzaGroups[pizzaId].status_mappings.push({
                            status: statusName,
                            division: division,
                            order: divData.order || statusData.order || ''
                        });
                    }
                }
            }
            
            // Sort status mappings within each pizza status
            for (const pizzaReq of Object.values(pizzaGroups)) {
                pizzaReq.status_mappings.sort((a, b) => {
                    const orderA = String(a.order);
                    const orderB = String(b.order);
                    if (orderA !== orderB) return orderA.localeCompare(orderB);
                    return a.division.localeCompare(b.division);
                });
            }
            
            return pizzaGroups;
        }

        // Ideal lifecycle flow
        const idealFlow = [
            { step: 1, status: 'REGISTRATION' },
            { step: 2, status: 'ONBOARDING' },
            { step: 3, status: 'CREDENTIALING' },
            { step: 4, status: 'DOT SCREENING' },
            { step: 5, status: 'ORIENTATION-BIG STAR SAFETY & SERVICE' },
            { step: 7, status: 'APPROVED-ORIENTATION BTW' },
            { step: 8, status: 'COMPLIANCE REVIEW' },
            { step: 9, status: 'SBPC APPROVED FOR SERVICE' },
            { step: 11, status: 'APPROVED FOR CONTRACTING' },
            { step: 13, status: 'IN-SERVICE' }
        ];

        // Load data
        async function loadData() {
            if (isLoadingData) return;
            isLoadingData = true;
            cancelLoadData = false;

            try {
                
                // Cache buster to force fresh load
                const cacheBuster = '?v=' + Date.now();
                
                // Load clients first
                const clientsResponse = await fetch('/api/data/clients' + cacheBuster);
                if (!clientsResponse.ok) {
                    throw new Error('Failed to load clients: ' + clientsResponse.status);
                }
                clients = await clientsResponse.json();

                if (cancelLoadData) { isLoadingData = false; return; }
                
                // Normalize ID property
                clients.forEach(c => {
                    if (!c.Id && c.ID) {
                        c.Id = c.ID;
                    }
                });
                
                // Populate client dropdown
                const clientDropdown = document.getElementById('mainClientFilter');
                if (clientDropdown && clients.length > 0) {
                    clientDropdown.innerHTML = '<option value="">All Clients</option>';
                    clients.forEach(client => {
                        const option = document.createElement('option');
                        option.value = client.Id;
                        option.textContent = client.Description;
                        clientDropdown.appendChild(option);
                    });
                    
                    // Set default to "Big Star Transit" if exists
                    const bigStarClient = clients.find(c => c.Description === 'Big Star Transit');
                    if (bigStarClient) {
                        clientDropdown.value = bigStarClient.Id;
                        mainClientFilter = bigStarClient.Id;
                    }
                }
                
                // ===================================================================
                // LAZY LOADING: Don't load ALL operators - load first division only
                // ===================================================================
                
                // Get first division to load by default
                const divisionFilterDropdown = document.getElementById('mainDivisionFilter');
                let initialDivision = 'ALL'; // Default to ALL if no divisions found
                
                // Populate division dropdown first (we need StatusTypes for this)
                const statusTypesResponse = await fetch('/api/data/statustypes' + cacheBuster);
                if (!statusTypesResponse.ok) {
                    throw new Error('Failed to load status types: ' + statusTypesResponse.status);
                }
                statusTypes = await statusTypesResponse.json();

                if (cancelLoadData) { isLoadingData = false; return; }
                
                // Normalize statusTypes properties
                statusTypes.forEach(st => {
                    if (!st.DivisionID && st.DivisionId) {
                        st.DivisionID = st.DivisionId;
                    }
                    if (!st.ID && st.Id) {
                        st.ID = st.Id;
                    }
                });
                
                window.statusTypes = statusTypes;
                
                // Get unique divisions from statusTypes
                const divisions = [...new Set(statusTypes.map(st => st.DivisionID || st.DivisionId).filter(Boolean))];
                
                // Sort divisions numerically (same logic as populateMainDivisionFilter)
                divisions.sort((a, b) => {
                    const numA = parseInt(a.split(' - ')[0].trim()) || 9999;
                    const numB = parseInt(b.split(' - ')[0].trim()) || 9999;
                    return numA - numB;
                });
                
                // Filter to first WHITELISTED (non-grey) division
                const ALLOWED_DIVISIONS = ['1 - LA', '4 - Sac', '5 - CA', '6 - Fresno'];
                const firstWhitelistedDivision = divisions.find(div => ALLOWED_DIVISIONS.includes(div));
                
                // Select first whitelisted division, or first division (from sorted list), or ALL
                if (cancelLoadData) { isLoadingData = false; return; }

                if (firstWhitelistedDivision) {
                    initialDivision = firstWhitelistedDivision;
                } else if (divisions.length > 0) {
                    initialDivision = divisions[0];
                }
                
                // Load operators ONLY for the initial division
                const operatorsResponse = await fetch(`/Requirements/GetOperatorsByDivisionWithCerts?divisionId=${encodeURIComponent(initialDivision)}`);
                if (!operatorsResponse.ok) {
                    throw new Error('Failed to load operators data: ' + operatorsResponse.status);
                }
                const operatorsData = await operatorsResponse.json();
                if (cancelLoadData) { isLoadingData = false; return; }
                operators = operatorsData.operators || [];
                certifications = operatorsData.certifications || [];
                
                // Normalize data properties to match legacy behavior
                operators.forEach(op => {
                    // C# model returns "DivisionId", JS expects "DivisionID"
                    if (!op.DivisionID && op.DivisionId) {
                        op.DivisionID = op.DivisionId;
                    }
                    if (!op.ID && op.Id) {
                        op.ID = op.Id;
                    }
                });
                
                // Normalize certifications properties
                certifications.forEach(cert => {
                    if (!cert.OperatorID && cert.OperatorId) {
                        cert.OperatorID = cert.OperatorId;
                    }
                    if (!cert.CertTypeID && cert.CertTypeId) {
                        cert.CertTypeID = cert.CertTypeId;
                    }
                });
                
                // Join certifications to operators
                operators.forEach(op => {
                    op.certifications = certifications.filter(cert => cert.OperatorID === op.ID);
                });
                
                // Set the division filter to the loaded division
                mainDivisionFilter = initialDivision;

                if (cancelLoadData) { isLoadingData = false; return; }

                // Load pizza statuses for client filtering and for determining
                // which PizzaStatuses are actually visible in the workflow.
                const pizzaStatusesResponse = await fetch('/api/data/pizzastatuses' + cacheBuster);
                if (!pizzaStatusesResponse.ok) {
                    throw new Error('Failed to load pizza statuses: ' + pizzaStatusesResponse.status);
                }
                pizzaStatuses = await pizzaStatusesResponse.json();

                if (cancelLoadData) { isLoadingData = false; return; }
                
                // Normalize ID and ClientId properties
                pizzaStatuses.forEach(ps => {
                    if (!ps.ID && ps.Id) {
                        ps.ID = ps.Id;
                    }
                    // Ensure both ClientId and ClientID exist
                    if (ps.ClientID && !ps.ClientId) {
                        ps.ClientId = ps.ClientID;
                    }
                    if (ps.ClientId && !ps.ClientID) {
                        ps.ClientID = ps.ClientId;
                    }
                });

                // Build a map of PizzaStatus by ID for quick lookup
                const pizzaStatusMap = {};
                pizzaStatuses.forEach(p => {
                    const id = p.ID || p.Id;
                    if (id) {
                        pizzaStatusMap[id] = p;
                    }
                });

                // Determine which StatusTypes are actually visible for the current
                // division/client filters using the same rules as initializeDynamicWorkflow.
                let visibleStatusTypes = statusTypes.filter(st => {
                    const stDivision = st.DivisionID || st.DivisionId || st.divisionId || st.divisionID;
                    const stPizzaStatusId = st.PizzaStatusID || st.PizzaStatusId || st.pizzaStatusId || st.pizzaStatusID;
                    const stIsDeleted = st.isDeleted ?? st.IsDeleted ?? st.IsDelete ?? st.isDelete;
                    const stFleet = st.Fleet ?? st.fleet ?? 0;
                    const stProviders = st.Providers ?? st.providers ?? 0;

                    // Must have PizzaStatusID
                    if (!stPizzaStatusId) return false;

                    // Must have matching PizzaStatus in map
                    const ps = pizzaStatusMap[stPizzaStatusId];
                    if (!ps) return false;

                    // Deleted filter - must not be deleted
                    if (stIsDeleted === true || stIsDeleted === 1 || String(stIsDeleted).trim() === '1' || String(stIsDeleted).trim().toLowerCase() === 'true') return false;

                    // Operator-only filter: Fleet must be 0/false (not Fleet status)
                    if (stFleet === 1 || stFleet === true || String(stFleet).trim() === '1') return false;

                    // Operator-only filter: Providers must be 0/false (not Provider status)
                    if (stProviders === 1 || stProviders === true || String(stProviders).trim() === '1') return false;

                    // CRITICAL: PizzaStatus MUST have IsOperator = 1/true to be an Operator status
                    const psIsOperator = ps.IsOperator ?? ps.isOperator;
                    if (psIsOperator !== true && psIsOperator !== 1) return false;

                    // Division filter
                    if (mainDivisionFilter !== 'ALL' && stDivision !== mainDivisionFilter) return false;

                    // Client filter: Only show StatusTypes whose PizzaStatus matches the selected client
                    if (mainClientFilter) {
                        const psClientId = ps.ClientId || ps.ClientID || ps.clientId || ps.clientID;
                        if (psClientId !== mainClientFilter) return false;
                    }

                    return true;
                });

                // Collect the distinct PizzaStatus IDs for the visible statuses only
                const visiblePizzaStatusIds = Array.from(new Set(
                    visibleStatusTypes
                        .map(st => st.PizzaStatusID || st.PizzaStatusId || st.pizzaStatusId || st.pizzaStatusID)
                        .filter(id => !!id)
                ));

                if (cancelLoadData) { isLoadingData = false; return; }

                // Load cert types from API endpoint, scoped strictly to the
                // PizzaStatuses that are actually visible in the workflow.
                let certTypesUrl = '/api/data/certtypes';
                const queryParams = [];
                if (visiblePizzaStatusIds.length > 0) {
                    queryParams.push('pizzaStatusIds=' + encodeURIComponent(visiblePizzaStatusIds.join(',')));
                }
                // Retain clientId as a hint for any future server-side logic,
                // though the primary filter is PizzaStatusId.
                if (mainClientFilter && mainClientFilter !== '') {
                    queryParams.push('clientId=' + encodeURIComponent(mainClientFilter));
                }
                queryParams.push('v=' + Date.now());
                if (queryParams.length > 0) {
                    certTypesUrl += '?' + queryParams.join('&');
                }

                const certTypesResponse = await fetch(certTypesUrl);
                if (!certTypesResponse.ok) {
                    throw new Error('Failed to load cert types: ' + certTypesResponse.status);
                }
                certTypes = await certTypesResponse.json();
                if (certTypes.length > 0) {
                } else {
                    console.warn('   ⚠️ No CertTypes returned from API');
                }

                if (cancelLoadData) { isLoadingData = false; return; }

                // Populate CertType name on each certification by joining with certTypes
                certifications.forEach(cert => {
                    const certType = certTypes.find(ct => ct.ID === cert.CertTypeID);
                    if (certType) {
                        cert.CertType = certType.Certification;
                    }
                });
                // Sync with window.pizzaStatuses for global access
                window.pizzaStatuses = pizzaStatuses;
                
                 // Normalize data properties to match legacy behavior
                statusTypes.forEach(st => {
                    // C# model returns "DivisionId", JS expects "DivisionID"
                    if (!st.DivisionID && st.DivisionId) {
                        st.DivisionID = st.DivisionId;
                    }
                    if (!st.OrderID && st.OrderId) {
                        st.OrderID = st.OrderId;
                    }
                    // Fix PizzaStatusID casing mismatch
                    if (!st.PizzaStatusID && st.PizzaStatusId) {
                        st.PizzaStatusID = st.PizzaStatusId;
                    }
                });

                // Sync with window.statusTypes so initializeDynamicWorkflow uses the same array
                window.statusTypes = statusTypes;

                if (cancelLoadData) { isLoadingData = false; return; }
                
                // Load status tracker for operator duration tracking
                const statusTrackerResponse = await fetch('/api/data/statustracker' + cacheBuster);
                if (!statusTrackerResponse.ok) {
                    throw new Error('Failed to load status tracker: ' + statusTrackerResponse.status);
                }
                const statusTrackerData = await statusTrackerResponse.json();
                statusTracker = statusTrackerData.statusTracker || [];
                
                // Removed buildRequirementsFromPizzaStatus and related logic
                
                // Keep a copy of original data for comparison
                // Removed certRequirements and originalCertRequirements logic related to pizzaStatusRequirements
                // Build list of all existing certifications
                buildExistingCertsList();

                if (!cancelLoadData) {
                    // Initialize workflow - ALWAYS use dynamic workflow
                    initializeDynamicWorkflow();
                    renderWorkflow();
                    updateStats();
                    populateMainDivisionFilter();
                }
            } catch (error) {
                console.error('❌ Error loading data:', error);
                console.error('❌ Error stack:', error.stack);
                console.error('❌ Error message:', error.message);
                alert('Error loading data: ' + error.message + '\nCheck console for details.');
            } finally {
                isLoadingData = false;
            }
        }

        // Initialize workflow based on Dynamic Status Types
        function initializeDynamicWorkflow() {
            // Use StatusTypes for filtering, matching Python script logic
            // Ensure statusTypes and pizzaStatuses are loaded
            if (typeof window.statusTypes === 'undefined') {
                // Synchronously fetch status types from API endpoint
                var xhrST = new XMLHttpRequest();
                xhrST.open('GET', '/api/data/statustypes', false);
                xhrST.send(null);
                if (xhrST.status === 200) {
                    window.statusTypes = JSON.parse(xhrST.responseText);
                } else {
                    window.statusTypes = [];
                }
            }
            if (typeof window.pizzaStatuses === 'undefined') {
                // Synchronously fetch pizza statuses from API endpoint
                var xhrPS = new XMLHttpRequest();
                xhrPS.open('GET', '/api/data/pizzastatuses', false);
                xhrPS.send(null);
                if (xhrPS.status === 200) {
                    window.pizzaStatuses = JSON.parse(xhrPS.responseText);
                } else {
                    window.pizzaStatuses = [];
                }
            }
            const statusTypesArr = window.statusTypes;
            const pizzaStatusesArr = window.pizzaStatuses;
            const pizzaStatusMap = {};
            pizzaStatusesArr.forEach(p => { if (p.ID || p.Id) pizzaStatusMap[p.ID || p.Id] = p; });

            // Filter StatusTypes for the selected division and/or client
            // OPERATOR ONLY: Fleet=0, Providers=0, isDeleted=false, PizzaStatusID not null
            let divStatuses = statusTypesArr.filter(st => {
                // Get division ID with flexible property name (SQL vs JSON may differ)
                const stDivision = st.DivisionID || st.DivisionId || st.divisionId || st.divisionID;
                const stPizzaStatusId = st.PizzaStatusID || st.PizzaStatusId || st.pizzaStatusId || st.pizzaStatusID;
                const stIsDeleted = st.isDeleted ?? st.IsDeleted ?? st.IsDelete ?? st.isDelete;
                const stFleet = st.Fleet ?? st.fleet ?? 0;
                const stProviders = st.Providers ?? st.providers ?? 0;
                
                // Must have PizzaStatusID
                if (!stPizzaStatusId) return false;
                
                // Must have matching PizzaStatus in map
                if (!pizzaStatusMap[stPizzaStatusId]) return false;
                
                // Deleted filter - must not be deleted
                if (stIsDeleted === true || stIsDeleted === 1 || String(stIsDeleted).trim() === '1' || String(stIsDeleted).trim().toLowerCase() === 'true') return false;
                
                // Operator-only filter: Fleet must be 0/false (not Fleet status)
                if (stFleet === 1 || stFleet === true || String(stFleet).trim() === '1') return false;
                
                // Operator-only filter: Providers must be 0/false (not Provider status)
                if (stProviders === 1 || stProviders === true || String(stProviders).trim() === '1') return false;
                
                // CRITICAL: PizzaStatus MUST have IsOperator = 1/true to be an Operator status
                // This excludes event/accident statuses (NULL/NULL) and Provider statuses
                const ps = pizzaStatusMap[stPizzaStatusId];
                const psIsOperator = ps.IsOperator ?? ps.isOperator;
                // Require IsOperator to be explicitly true/1
                if (psIsOperator !== true && psIsOperator !== 1) return false;
                
                // Division filter
                if (mainDivisionFilter !== 'ALL' && stDivision !== mainDivisionFilter) return false;
                
                // Client filter: Only show StatusTypes whose PizzaStatus matches the selected client
                if (mainClientFilter) {
                    const psClientId = ps.ClientId || ps.ClientID || ps.clientId || ps.clientID;
                    if (psClientId !== mainClientFilter) return false;
                }
                
                return true;
            });

            // Sort by OrderID (as integer, fallback to 9999 if missing)
            divStatuses.sort((a, b) => {
                const ordA = parseInt(a.OrderID) || 9999;
                const ordB = parseInt(b.OrderID) || 9999;
                return ordA - ordB;
            });

            if (divStatuses.length > 0) {
                // Group by status name to avoid duplicates in ALL mode
                if (mainDivisionFilter === 'ALL') {
                    const statusMap = new Map();
                    divStatuses.forEach(st => {
                        if (!statusMap.has(st.Status)) {
                            statusMap.set(st.Status, st);
                        }
                    });
                    divStatuses = Array.from(statusMap.values());
                    divStatuses.sort((a, b) => {
                        const ordA = parseInt(a.OrderID) || 9999;
                        const ordB = parseInt(b.OrderID) || 9999;
                        return ordA - ordB;
                    });
                }
                
                currentWorkflow = divStatuses.map((st, idx) => ({
                    step: (parseInt(st.OrderID) || (idx + 1)),
                    status: st.Status,
                    statusId: st.Id || st.ID || null,
                    originalObj: st
                }));
            } else {
                // Empty workflow if no StatusTypes found for the filter combination
                console.warn(`No StatusTypes found for division=${mainDivisionFilter}, client=${mainClientFilter}`);
                currentWorkflow = [];
            }
        }

        // Reorder step functionality
        function reorderStep(index, direction) {
            if (mainDivisionFilter === 'ALL') {
                alert('Reordering is only available when filtering by a specific division.');
                return;
            }

            const newIndex = index + direction;
            if (newIndex < 0 || newIndex >= currentWorkflow.length) return;

            // Swap items in currentWorkflow
            const temp = currentWorkflow[index];
            currentWorkflow[index] = currentWorkflow[newIndex];
            currentWorkflow[newIndex] = temp;

            // Update OrderIDs for all items in currentWorkflow AND in the global statusTypes array
            currentWorkflow.forEach((item, idx) => {
                const newOrder = String(idx + 1); // OrderID should be a string like in the JSON
                item.step = idx + 1;
                
                // Update the underlying statusType object directly via reference
                if (item.originalObj) {
                    item.originalObj.OrderID = newOrder;
                }
                
                // Also find and update in the global statusTypes array by Status + DivisionID
                const globalStatusType = statusTypes.find(st => 
                    st.Status === item.status && st.DivisionID === mainDivisionFilter
                );
                if (globalStatusType) {
                    globalStatusType.OrderID = newOrder;
                }
            });
            
            hasUnsavedChanges = true;
            markUnsaved();
            
            // Re-render without calling initializeDynamicWorkflow (which would re-sort)
            renderWorkflowWithoutReinit();
            updateStats();
            
            // Add animations to affected cards
            setTimeout(() => {
                const cards = document.querySelectorAll('.step-card');
                
                // Determine the range of affected cards
                const minAffected = Math.min(index, newIndex);
                const maxAffected = Math.max(index, newIndex);
                
                cards.forEach((card, idx) => {
                    if (idx >= minAffected && idx <= maxAffected) {
                        if (idx === newIndex) {
                            // The moved card gets green wiggle
                            card.classList.add('wiggle');
                            setTimeout(() => card.classList.remove('wiggle'), 600);
                        } else {
                            // Other affected cards get yellow glow
                            card.classList.add('order-changed');
                            setTimeout(() => card.classList.remove('order-changed'), 800);
                        }
                    }
                });
            }, 50);
        }

        // Helper function to create a drop zone element
        function createDropZone(dropIndex) {
            const dropZone = document.createElement('div');
            dropZone.className = 'status-drop-zone';
            dropZone.dataset.dropIndex = dropIndex;
            dropZone.innerHTML = '<div class="drop-zone-indicator">Drop here to move status</div>';
            return dropZone;
        }

        // Render workflow without re-initializing (preserves current order)
        function renderWorkflowWithoutReinit() {
            const container = document.getElementById('workflowSteps');
            if (!container) return;
            
            container.innerHTML = '';

            // Add warning banner if ALL divisions mode
            if (mainDivisionFilter === 'ALL') {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'all-divisions-warning';
                warningDiv.style.marginBottom = '20px';
                warningDiv.innerHTML = `
                    <div class="icon">⚠️</div>
                    <div class="text">
                        <strong>GLOBAL EDIT MODE - ALL DIVISIONS</strong><br>
                        Changes made here may overwrite individual division customizations if not careful.
                    </div>
                `;
                container.appendChild(warningDiv);
            }
            
            let renderedCount = 0;
            let actualIndex = 0;

            // Add initial drop zone (before first card)
            if (mainDivisionFilter !== 'ALL') {
                container.appendChild(createDropZone(0));
            }

            currentWorkflow.forEach((flowStep, index) => {
                const statusName = flowStep.status;
                const pizzaStatusId = flowStep.originalObj ? flowStep.originalObj.PizzaStatusID : null;
                let operatorsInStep = operators.filter(op => 
                    op.Status === statusName || 
                    (op.Status && op.Status.toUpperCase() === statusName.toUpperCase())
                );
                
                if (mainDivisionFilter !== 'ALL') {
                    operatorsInStep = operatorsInStep.filter(op => op.DivisionID === mainDivisionFilter);
                }
                
                const allRequiredCerts = getRequiredCertsForStatus(statusName, pizzaStatusId);
                const validation = validateOperatorsInStep(operatorsInStep, allRequiredCerts, index);
                
                if (currentFilter === 'valid' && !validation.isValid) return;
                if (currentFilter === 'invalid' && validation.isValid) return;
                
                if (searchQuery) {
                    const statusMatch = statusName.toLowerCase().includes(searchQuery);
                    const certsMatch = allRequiredCerts.some(cert => cert.toLowerCase().includes(searchQuery));
                    const operatorsMatch = operatorsInStep.some(op => op.FullName?.toLowerCase().includes(searchQuery));
                    if (!statusMatch && !certsMatch && !operatorsMatch) return;
                }
                
                renderedCount++;
                const stepCard = createStepCard(flowStep, index);
                container.appendChild(stepCard);
                
                // Add drop zone after each card (only if filtering by division)
                if (mainDivisionFilter !== 'ALL') {
                    container.appendChild(createDropZone(index + 1));
                }
            });
            addDragAndDropListeners();

            // Update status containers with days info (operator cards are rendered inline now)
            updateStatusContainersWithDaysInfo();
        }

        // Render the workflow
        function renderWorkflow() {
            // Re-initialize workflow based on current filter state
            // ALWAYS use dynamic workflow now (no more hardcoded idealFlow)
            initializeDynamicWorkflow();

            // Check if we accidentally got into legacy "Edit Mode" state and reset it
            if (typeof editMode !== 'undefined' && editMode) {
                 editMode = false;
                 document.querySelector('.control-panel').style.display = 'block';
            }
            const container = document.getElementById('workflowSteps');
            if (!container) return; // Guard clause
            
            container.innerHTML = '';

            // Add warning banner if ALL divisions mode (INTEGRATED FROM EDIT MODE)
            if (mainDivisionFilter === 'ALL') {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'all-divisions-warning';
                warningDiv.style.marginBottom = '20px';
                warningDiv.innerHTML = `
                    <div class="icon">⚠️</div>
                    <div class="text">
                        <strong>GLOBAL EDIT MODE - ALL DIVISIONS</strong><br>
                        Changes made here may overwrite individual division customizations if not careful.
                    </div>
                `;
                container.appendChild(warningDiv);
            }
            
            let renderedCount = 0;

            // Add initial drop zone (before first card) - only for specific division
            if (mainDivisionFilter !== 'ALL') {
                container.appendChild(createDropZone(0));
            }

            currentWorkflow.forEach((flowStep, index) => {
                // Apply filters
                const statusName = flowStep.status;
                const pizzaStatusId = flowStep.originalObj ? flowStep.originalObj.PizzaStatusID : null;
                let operatorsInStep = operators.filter(op => 
                    op.Status === statusName || 
                    (op.Status && op.Status.toUpperCase() === statusName.toUpperCase())
                );
                
                // Apply division filter
                if (mainDivisionFilter !== 'ALL') {
                    operatorsInStep = operatorsInStep.filter(op => op.DivisionID === mainDivisionFilter);
                }
                
                const allRequiredCerts = getRequiredCertsForStatus(statusName, pizzaStatusId);
                const validation = validateOperatorsInStep(operatorsInStep, allRequiredCerts, index);
                
                // Filter logic
                if (currentFilter === 'valid' && !validation.isValid) {
                    return;
                }
                if (currentFilter === 'invalid' && validation.isValid) {
                    return;
                }
                
                // Search logic
                if (searchQuery) {
                    const statusMatch = statusName.toLowerCase().includes(searchQuery);
                    const certsMatch = allRequiredCerts.some(cert => 
                        cert.toLowerCase().includes(searchQuery)
                    );
                    const operatorsMatch = operatorsInStep.some(op => 
                        op.FullName?.toLowerCase().includes(searchQuery)
                    );
                    if (!statusMatch && !certsMatch && !operatorsMatch) {
                        return;
                    }
                }
                renderedCount++;
                const stepCard = createStepCard(flowStep, index);
                container.appendChild(stepCard);
                
                // Add drop zone after each card (only for specific division)
                if (mainDivisionFilter !== 'ALL') {
                    container.appendChild(createDropZone(index + 1));
                }
            });

            // Update status containers with days info (operator cards are rendered inline now)
            updateStatusContainersWithDaysInfo();

            // Add drag and drop event listeners
            addDragAndDropListeners();
        }

        /**
         * Update status containers with days information and apply red border if needed
         */
        function updateStatusContainersWithDaysInfo() {
            // Find all status cards
            const stepCards = document.querySelectorAll('.step-card');
            
            stepCards.forEach(stepCard => {
                // Find all operator items within this status card
                const operatorItems = stepCard.querySelectorAll('.operator-item');
                
                let maxDays = null;
                let hasOverdue = false;
                let operatorCount = 0;
                let hasCompleteOperator = false;
                
                operatorItems.forEach(item => {
                    operatorCount++;
                    if (item.classList.contains('operator-complete')) {
                        hasCompleteOperator = true;
                    }
                    
                    // Check if operator has days badge
                    const daysBadge = item.querySelector('.operator-days-in-status');
                    if (daysBadge) {
                        // Extract days number from badge text (e.g., "9d" or "⚠️ 35d")
                        const text = daysBadge.textContent.trim();
                        const daysMatch = text.match(/(\d+)d/);
                        if (daysMatch) {
                            const days = parseInt(daysMatch[1], 10);
                            if (maxDays === null || days > maxDays) {
                                maxDays = days;
                            }
                            if (days >= 30) {
                                hasOverdue = true;
                            }
                        }
                    }
                });
                
                // Apply red border if any operator is 30+ days
                if (hasOverdue) {
                    stepCard.classList.remove('valid');
                    stepCard.classList.add('invalid');
                } else {
                    stepCard.classList.remove('invalid');
                    stepCard.classList.add('valid');
                }

                // Highlight status card when it contains at least one fully compliant operator
                if (hasCompleteOperator) {
                    stepCard.classList.add('has-complete-operator');
                } else {
                    stepCard.classList.remove('has-complete-operator');
                }
                
                // Update the operator count display to include days info
                const dropdownTrigger = stepCard.querySelector('.operators-dropdown .dropdown-trigger span:first-child');
                if (dropdownTrigger && maxDays !== null) {
                    const countSpan = dropdownTrigger.querySelector('.count');
                    if (countSpan) {
                        const daysText = hasOverdue ? 
                            `⚠️ Max: ${maxDays}d` : 
                            `Max: ${maxDays}d`;
                        countSpan.innerHTML = `${operatorCount} <span style="margin-left: 8px; color: ${hasOverdue ? '#fa5c7c' : '#10b981'}; font-weight: 600;">${daysText}</span>`;
                    }
                }
            });
        }

        // Create a step card
        function createStepCard(flowStep, index) {
            const statusName = flowStep.status;
            const pizzaStatusId = flowStep.originalObj ? flowStep.originalObj.PizzaStatusID : null;
            
            let operatorsInStep = operators.filter(op => 
                op.Status === statusName || 
                (op.Status && op.Status.toUpperCase() === statusName.toUpperCase())
            );
            
            // Apply division filter
            if (mainDivisionFilter !== 'ALL') {
                operatorsInStep = operatorsInStep.filter(op => op.DivisionID === mainDivisionFilter);
            }

            // Get required certifications for this status (pass PizzaStatusID for precise matching)
            const allRequiredCerts = getRequiredCertsForStatus(statusName, pizzaStatusId);
            // Get certs from previous steps to exclude (show only in FIRST occurrence)
            // BUT: if previous step has SAME PizzaStatusID, don't exclude those certs (show on all statuses sharing PizzaStatusID)
            const previousCerts = new Set();
            for (let i = 0; i < index; i++) {
                const prevStatus = currentWorkflow[i].status;
                const prevPizzaStatusId = currentWorkflow[i].originalObj ? currentWorkflow[i].originalObj.PizzaStatusID : null;
                
                // Only exclude certs from previous steps with DIFFERENT PizzaStatusID
                if (prevPizzaStatusId !== pizzaStatusId) {
                    const prevRequiredCerts = getRequiredCertsForStatus(prevStatus, prevPizzaStatusId);
                    prevRequiredCerts.forEach(cert => previousCerts.add(cert));
                }
            }
            // Only show certs that haven't appeared in previous steps (with different PizzaStatusID)
            const certsToDisplay = allRequiredCerts.filter(cert => !previousCerts.has(cert));
            
            // Build map of which divisions require each cert
            const certDivisionMap = {};
            const statusData = certRequirements[statusName] || certRequirements[statusName.toUpperCase()];
            if (statusData && statusData.divisions) {
                Object.entries(statusData.divisions).forEach(([divId, divData]) => {
                    (divData.required || []).forEach(certObj => {
                        const certName = certObj.cert;
                        if (!certDivisionMap[certName]) {
                            certDivisionMap[certName] = [];
                        }
                        certDivisionMap[certName].push(divId);
                    });
                });
            }
            // Check for duplicates or near-duplicates
            const duplicateCheck = allRequiredCerts.filter(cert => 
                previousCerts.has(cert)
            );
            if (duplicateCheck.length > 0) {
            }

            // Check if all operators have required certs (cumulative - includes previous steps)
            const validation = validateOperatorsInStep(operatorsInStep, allRequiredCerts, index);

            // Note: Red border for 30+ day operators will be applied after operator cards are loaded
            // by updateStatusContainersWithDaysInfo() function
            
            const card = document.createElement('div');
            card.className = `step-card valid`; // Will be updated after operator cards load
            card.draggable = true;
            card.dataset.index = index;
            card.dataset.status = statusName;
            
            // Get divisions dynamically based on filter
            let divisionsText;
            if (mainDivisionFilter === 'ALL') {
                // Removed pizzaStatusRequirements usage for divisionsForStatus
                divisionsText = 'No divisions';
            } else {
                // Show only the filtered division
                divisionsText = mainDivisionFilter;
            }

            // Find StatusID and PizzaStatusID if specific division is selected
            let statusDebugInfo = '';
            let pizzaStatusName = '';
            let autoToggleHtml = '';
            if (mainDivisionFilter !== 'ALL') {
                const debugSt = statusTypes.find(st => st.Status === statusName && st.DivisionID === mainDivisionFilter);
                if (debugSt) {
                    statusDebugInfo = `<div style="font-size: 10px; color: #666; margin-top: 2px;">
                        IDs: <span style="font-family: monospace;">${debugSt.Id || 'N/A'}</span> (St) | 
                             <span style="font-family: monospace;">${debugSt.PizzaStatusID || 'N/A'}</span> (Pz)
                    </div>`;
                    
                    // Get PizzaStatus name
                    if (debugSt.PizzaStatusID && pizzaStatuses && Array.isArray(pizzaStatuses)) {
                        const pizzaStat = pizzaStatuses.find(ps => ps.ID === debugSt.PizzaStatusID || ps.Id === debugSt.PizzaStatusID);
                        if (pizzaStat) {
                            if (pizzaStat.Status) {
                                pizzaStatusName = pizzaStat.Status;
                            }
                            const isAuto = pizzaStat.IsAuto === true || pizzaStat.isAuto === true;
                            autoToggleHtml = `
                                <span>|</span>
                                <label class="auto-toggle-label" title="Auto-advance when requirements met">
                                    <input type="checkbox" class="auto-toggle-checkbox" ${isAuto ? 'checked' : ''}
                                           onchange="togglePizzaStatusAuto('${debugSt.PizzaStatusID}', this.checked); event.stopPropagation();" />
                                    Auto
                                </label>`;
                        }
                    }
                }
            }

            card.innerHTML = `
                <div class="step-header">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-info">
                        <div class="step-title">
                            ${statusName}
                            ${pizzaStatusName ? `<span class="pizza-status-tag">${pizzaStatusName}</span>` : ''}
                            ${statusDebugInfo}
                        </div>
                        <div class="step-meta">
                            ${!isNaN(flowStep.step) ? `<span>Original Step: ${flowStep.step}</span><span>|</span>` : ''}
                            <span>Division${mainDivisionFilter === 'ALL' ? 's' : ''}: ${divisionsText}</span>
                            <span>|</span>
                            <span>${certsToDisplay.length} New Required Cert${certsToDisplay.length !== 1 ? 's' : ''}</span>
                            ${previousCerts.size > 0 ? `<span>|</span><span style="color: #94a3b8;">${previousCerts.size} from previous steps</span>` : ''}
                            ${autoToggleHtml}
                        </div>
                    </div>
                </div>
                
                <!-- Status Actions -->
                ${mainDivisionFilter !== 'ALL' ? `
                <div style="position: absolute; top: 10px; right: 20px; display: flex; gap: 5px;">
                     <div class="step-reorder-buttons" style="display: flex; flex-direction: column; gap: 2px; margin-right: 10px;">
                        <button class="reorder-btn up" onclick="reorderStep(${index}, -1)" title="Move Up" ${index === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'}>
                            ▲
                        </button>
                        <button class="reorder-btn down" onclick="reorderStep(${index}, 1)" title="Move Down" ${index === currentWorkflow.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'}>
                            ▼
                        </button>
                    </div>
                    <button class="delete-cert-type-btn" data-status-name="${statusName}" data-division="${mainDivisionFilter}" title="Delete status '${statusName}' from Division ${mainDivisionFilter}" style="color: #fa5c7c;">
                        ✕
                    </button>
                </div>` : ''}

                <div class="operators-dropdown">
                    <div class="dropdown-trigger" onclick="toggleDropdown(this)">
                        <span>
                            <strong>Operators in this step</strong>
                            <span class="count">${operatorsInStep.length}</span>
                        </span>
                        <span class="arrow">▼</span>
                    </div>
                    <div class="dropdown-content">
                        ${operatorsInStep.length > 0 ? 
                            operatorsInStep.map(op => {
                                // Get certs needed for THIS operator's division and current status (PizzaStatusId logic)
                                const opDivision = op.DivisionID || '';
                                const opStatus = op.Status || '';
                                
                                // Find the operator's PizzaStatusId from statusTypes
                                let pizzaStatusId = null;
                                if (statusTypes && Array.isArray(statusTypes)) {
                                    const st = statusTypes.find(s => s.Status === opStatus && s.DivisionID === opDivision);
                                    if (st && st.PizzaStatusID) pizzaStatusId = st.PizzaStatusID;
                                }
                                
                                // Get all cert types for this PizzaStatusId and Division (not deleted)
                                let requiredCertTypes = [];
                                if (pizzaStatusId && certTypes && Array.isArray(certTypes)) {
                                    requiredCertTypes = certTypes.filter(ct => 
                                        ct.PizzaStatusID === pizzaStatusId && 
                                        ct.DivisionID === opDivision && 
                                        ct.isDeleted !== true && 
                                        ct.isDeleted !== 'true' && 
                                        String(ct.isDeleted) !== 'true'
                                    );
                                }

                                // Get operator's certifications
                                const operatorCerts = op.certifications || [];
                                
                                // Calculate cert status by matching CertTypeID
                                let validCount = 0;
                                let expiredCount = 0;
                                let missingCount = 0;

                                requiredCertTypes.forEach(certType => {
                                    const certTypeId = certType.ID; // The CertType ID we need to match
                                    
                                    // Find matching cert in operator's certifications by CertTypeID
                                    const cert = operatorCerts.find(c => {
                                        // Match by CertTypeID
                                        if (c.CertTypeID !== certTypeId) return false;
                                        // Must not be deleted
                                        if (c.IsDeleted === '1' || c.IsDeleted === 1 || c.IsDeleted === true) return false;
                                        // Must be approved (isApproved === '1')
                                        if (c.isApproved !== '1' && c.isApproved !== 1 && c.isApproved !== true) return false;
                                        return true;
                                    });
                                    
                                    if (cert) {
                                        // Check if expired
                                        const expireDate = cert.Date ? new Date(cert.Date) : null;
                                        const isExpired = expireDate && expireDate < new Date();
                                        if (isExpired) {
                                            expiredCount++;
                                        } else {
                                            validCount++;
                                        }
                                    } else {
                                        missingCount++;
                                    }
                                });
                                
                                if (op.LastName === 'Quainton') {
                                }

                                const total = validCount + missingCount; // Only count valid and missing, exclude expired
                                const validPercent = total > 0 ? (validCount / total * 100) : 0;
                                const isComplete = total > 0 && validCount === total;

                                // Calculate days in current status
                                const daysInStatus = getOperatorDaysInStatus(op.ID);
                                const isOverdue = daysInStatus !== null && daysInStatus >= 30;
                                const daysDisplay = daysInStatus !== null ? 
                                    `<span class="operator-days-in-status ${isOverdue ? 'overdue' : ''}" title="Days in current status">
                                        ${isOverdue ? '⚠️ ' : ''}${daysInStatus}d
                                    </span>` : '';
                                
                                // Cert count display (valid/total)
                                const certCountDisplay = total > 0 ? 
                                    `<span class="operator-cert-count" title="${validCount} valid, ${missingCount} missing">${validCount}/${total}</span>` : '';

                                // Render operator card directly (no server fetch needed)
                                const opName = (op.FirstName || '') + ' ' + (op.LastName || '');
                                const opInitials = ((op.FirstName || '?')[0] + (op.LastName || '?')[0]).toUpperCase();
                                
                                return `
                                    <div class="operator-item ${isComplete ? 'operator-complete' : ''}" 
                                         data-operator-id="${op.ID}"
                                         onclick="showOperatorProfileModal('${op.ID}')">
                                        <div class="operator-avatar">${opInitials}</div>
                                        <div class="operator-info">
                                            <span class="operator-name">${opName.trim() || 'Unknown'}</span>
                                            <div class="operator-meta">
                                                ${daysDisplay}
                                                ${certCountDisplay}
                                            </div>
                                        </div>
                                        ${isComplete ? '<span class="complete-badge" title="All required certs">✓</span>' : ''}
                                    </div>
                                `;
                            }).join('') : 
                            '<div class="operator-item"><span style="color: #94a3b8;">No operators in this step</span></div>'
                        }
                    </div>
                </div>

                <div class="cert-details">
                    <div class="cert-title">Required Certifications (${certsToDisplay.length}):</div>
                    <div class="cert-list cert-list-editable drop-zone" data-status="${statusName}" ondrop="handleCertDrop(event, this)" ondragover="handleCertDragOver(event)">
                        ${certsToDisplay.length > 0 ? 
                            certsToDisplay.slice(0, 50).map(cert => {
                                // Render cert badge directly (no server fetch needed)
                                return `<span class="cert-badge" draggable="true" ondragstart="handleCertDragStart(event, '${cert.replace(/'/g, "\\'")}')"
                                    data-cert="${cert}" data-status="${statusName}" title="${cert}">
                                    ${cert}
                                    <button class="remove-cert-btn" onclick="removeCert('${statusName}', '${cert.replace(/'/g, "\\'")}')" title="Remove">×</button>
                                </span>`;
                            }).join('') :
                            '<span style="color: #94a3b8;">No new certifications required at this step</span>'
                        }
                    </div>
                    <div class="add-cert-section">
                        <div class="add-cert-input">
                            <div class="add-cert-input-wrapper">
                                <input type="text" 
                                       placeholder="Type to search or add new certification..." 
                                       id="newCert_${index}" 
                                       autocomplete="off"
                                       oninput="handleCertInput(event, ${index})"
                                       onkeydown="handleCertKeydown(event, ${index})"
                                       onfocus="handleCertFocus(event, ${index})"
                                       onblur="handleCertBlur(event, ${index})" />
                                <div class="autocomplete-dropdown" id="autocomplete_${index}"></div>
                            </div>
                            <button class="btn btn-primary btn-small" onclick="addCert('${statusName}', ${index})">+ Add</button>
                        </div>
                    </div>
                </div>
            `;

            return card;
        }

        // Get required certs for a status (using CertTypes table directly)
        function getRequiredCertsForStatus(statusName, pizzaStatusIdHint = null) {
            const certs = [];

            // Fast path: if we know the exact PizzaStatusID for this workflow step,
            // use it directly instead of re-deriving via StatusTypes. This avoids
            // issues when reordering statuses and keeps certs stable.
            if (pizzaStatusIdHint && pizzaStatuses && Array.isArray(pizzaStatuses) && certTypes && Array.isArray(certTypes)) {
                const pizzaStatus = pizzaStatuses.find(ps => ps.ID === pizzaStatusIdHint || ps.Id === pizzaStatusIdHint);
                if (!pizzaStatus) return certs;

                // Only operator statuses are relevant here
                const psIsOperator = pizzaStatus.IsOperator ?? pizzaStatus.isOperator;
                if (psIsOperator !== true && psIsOperator !== 1) return certs;

                // Client filter via PizzaStatus
                if (mainClientFilter) {
                    const psClientId = pizzaStatus.ClientId || pizzaStatus.ClientID || pizzaStatus.clientId || pizzaStatus.clientID;
                    if (psClientId !== mainClientFilter) return certs;
                }

                certTypes.forEach(cert => {
                    if (!cert.PizzaStatusID) return;
                    if (cert.PizzaStatusID !== pizzaStatusIdHint) return;

                    // Division filter
                    if (mainDivisionFilter !== 'ALL' && cert.DivisionID !== mainDivisionFilter) return;

                    if (!cert.Certification) return;
                    if (!certs.includes(cert.Certification)) {
                        certs.push(cert.Certification);
                    }
                });

                return certs;
            }

            // Fallback: derive via StatusTypes when we don't have a PizzaStatusID hint
            if (!statusTypes || !Array.isArray(statusTypes) || !pizzaStatuses || !Array.isArray(pizzaStatuses)) {
                return certs;
            }

            const relevantStatusTypes = statusTypes.filter(s => {
                if (s.Status !== statusName) return false;
                if (mainDivisionFilter !== 'ALL' && s.DivisionID !== mainDivisionFilter) return false;

                if (s.PizzaStatusID) {
                    const pizzaStatus = pizzaStatuses.find(ps => ps.ID === s.PizzaStatusID || ps.Id === s.PizzaStatusID);
                    if (!pizzaStatus) return false;

                    const psIsOperator = pizzaStatus.IsOperator ?? pizzaStatus.isOperator;
                    if (psIsOperator !== true && psIsOperator !== 1) return false;

                    if (mainClientFilter) {
                        const psClientId = pizzaStatus.ClientId || pizzaStatus.ClientID || pizzaStatus.clientId || pizzaStatus.clientID;
                        if (psClientId !== mainClientFilter) return false;
                    }
                }

                return true;
            });

            relevantStatusTypes.forEach(st => {
                if (!st.PizzaStatusID) return;

                certTypes.forEach(cert => {
                    if (cert.PizzaStatusID !== st.PizzaStatusID) return;
                    if (mainDivisionFilter !== 'ALL' && cert.DivisionID !== st.DivisionID) return;
                    if (!cert.Certification) return;

                    if (!certs.includes(cert.Certification)) {
                        certs.push(cert.Certification);
                    }
                });
            });

            return certs;
        }

        // Get required certs for an operator based on their division and cumulative statuses
        function getRequiredCertsForOperator(operatorDivision, statusName) {
            const certs = new Set();
            
            // Find operator's current step in the workflow
            const currentStepIndex = idealFlow.findIndex(s => s.status === statusName);
            
            if (currentStepIndex >= 0) {
                // Get all statuses up to and including current (cumulative)
                const relevantStatuses = idealFlow.slice(0, currentStepIndex + 1).map(s => s.status);
                
                // Collect requirements from all these statuses for operator's division
                relevantStatuses.forEach(status => {
                    Object.values(pizzaStatusRequirements).forEach(pizzaStatus => {
                        (pizzaStatus.status_mappings || []).forEach(mapping => {
                            if (mapping.status === status && mapping.division === operatorDivision) {
                                (pizzaStatus.required_certifications || []).forEach(cert => {
                                    if (cert.division === operatorDivision) {
                                        certs.add(cert.name);
                                    }
                                });
                            }
                        });
                    });
                });
            }
            
            return Array.from(certs);
        }

        // Build list of all existing certifications from CertTypes (treating each cert+division as unique)
        function buildExistingCertsList() {
            const certsArray = [];
            
            // Add each cert type as a unique entry (no grouping by name)
            certTypes.forEach(certType => {
                const certName = certType.Certification;
                const division = certType.DivisionID;

                if (!certName) return;

                // Only allow divisions in whitelist
                if (division && !ALLOWED_DIVISIONS.includes(division)) return;

                // Each cert type is unique - don't group by name
                certsArray.push({
                    name: certName,
                    division: division || 'No division',
                    pizzaStatusId: certType.PizzaStatusID || null,
                    certTypeId: certType.CertID
                });
            });
            
            // Group only for display purposes (to show "Used in X divisions")
            const certsMap = new Map();
            certsArray.forEach(cert => {
                if (!certsMap.has(cert.name)) {
                    certsMap.set(cert.name, {
                        name: cert.name,
                        divisions: new Set(),
                        pizzaStatuses: new Set(),
                        entries: []
                    });
                }
                const entry = certsMap.get(cert.name);
                entry.divisions.add(cert.division);
                if (cert.pizzaStatusId) {
                    entry.pizzaStatuses.add(cert.pizzaStatusId);
                }
                entry.entries.push(cert);
            });
            
            // Convert to array with metadata
            allExistingCerts = Array.from(certsMap.entries()).map(([certName, data]) => ({
                name: certName,
                divisions: Array.from(data.divisions).sort(),
                divisionCount: data.divisions.size,
                pizzaStatusCount: data.pizzaStatuses.size,
                entries: data.entries // Keep individual entries for filtering
            }));
            
            // Sort by division count (most common first)
            allExistingCerts.sort((a, b) => b.divisionCount - a.divisionCount);
        }

        // Handle input in cert field (autocomplete)
        function handleCertInput(event, stepIndex) {
            const input = event.target;
            const value = input.value.trim().toLowerCase();
            const dropdown = document.getElementById(`autocomplete_${stepIndex}`);
            
            if (!value) {
                dropdown.classList.remove('active');
                return;
            }
            
            // Get current division filter (use selectedDivision for edit mode)
            const currentFilter = editMode ? selectedDivision : mainDivisionFilter;
            
            // Filter certifications by search term
            let matches = allExistingCerts.filter(cert => 
                cert.name.toLowerCase().includes(value)
            );
            
            // Filter by division if specific division selected
            if (currentFilter !== 'ALL') {
                const beforeCount = matches.length;
                matches = matches.filter(cert => {
                    // Check if ANY of the cert's individual entries (cert types) match the filter division
                    const hasMatch = cert.entries.some(entry => {
                        // Handle both "12 - PA" and "12-PA" formats
                        const divNum = currentFilter.replace(' - ', '-').split('-')[0];
                        const matches = entry.division && entry.division.includes(divNum);
                        return matches;
                    });
                    return hasMatch;
                });
                if (matches.length > 0 && matches.length <= 3) {
                }
            }
            
            // Limit to top 20 matches
            matches = matches.slice(0, 20);
            
            if (matches.length === 0) {
                const filterMsg = currentFilter !== 'ALL' ? ` for division ${currentFilter}` : '';
                dropdown.innerHTML = `<div class="autocomplete-no-results">No matches found${filterMsg}. Press Enter to add as new certification.</div>`;
                dropdown.classList.add('active');
            } else {
                dropdown.innerHTML = matches.map((cert, idx) => {
                    let displayDivisions = cert.divisions;
                    
                    // If filtering, only show matching divisions in the subtitle to reduce noise
                    if (currentFilter !== 'ALL') {
                        // Use helper to find matches
                        displayDivisions = displayDivisions.filter(d => isDivisionMatch(d, currentFilter));
                    }
                    
                    // Filter to only show allowed divisions (whitelist)
                    displayDivisions = displayDivisions.filter(d => ALLOWED_DIVISIONS.includes(d));
                    
                    const divisionsText = displayDivisions.length > 0 
                        ? displayDivisions.slice(0, 3).join(', ') + (displayDivisions.length > 3 ? '...' : '')
                        : (currentFilter !== 'ALL' ? currentFilter : 'No division');
                    
                    return `
                        <div class="autocomplete-item ${idx === 0 ? 'highlighted' : ''}" 
                             data-cert="${cert.name}"
                             onmousedown="selectCert(event, '${cert.name.replace(/'/g, "\\'")}', ${stepIndex})">
                            <div class="cert-name">${cert.name}</div>
                            <div class="cert-status-list">📍 ${divisionsText} | Used in ${cert.pizzaStatusCount} pizza status${cert.pizzaStatusCount > 1 ? 'es' : ''}</div>
                        </div>
                    `;
                }).join('');
                dropdown.classList.add('active');
                currentAutocompleteIndex = 0;
            }
        }
        
        // Expose to window for inline event handlers
        window.handleCertInput = handleCertInput;

        // Handle keyboard navigation in autocomplete
        function handleCertKeydown(event, stepIndex) {
            const dropdown = document.getElementById(`autocomplete_${stepIndex}`);
            const items = dropdown.querySelectorAll('.autocomplete-item');
            
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                if (currentAutocompleteIndex < items.length - 1) {
                    items[currentAutocompleteIndex]?.classList.remove('highlighted');
                    currentAutocompleteIndex++;
                    items[currentAutocompleteIndex]?.classList.add('highlighted');
                    items[currentAutocompleteIndex]?.scrollIntoView({ block: 'nearest' });
                }
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                if (currentAutocompleteIndex > 0) {
                    items[currentAutocompleteIndex]?.classList.remove('highlighted');
                    currentAutocompleteIndex--;
                    items[currentAutocompleteIndex]?.classList.add('highlighted');
                    items[currentAutocompleteIndex]?.scrollIntoView({ block: 'nearest' });
                }
            } else if (event.key === 'Enter') {
                event.preventDefault();
                const highlighted = items[currentAutocompleteIndex];
                if (highlighted) {
                    const certName = highlighted.dataset.cert;
                    selectCert(event, certName, stepIndex);
                } else {
                    // No selection, treat as new cert
                    const statusName = currentWorkflow[stepIndex].status;
                    addCert(statusName, stepIndex);
                }
            } else if (event.key === 'Escape') {
                dropdown.classList.remove('active');
            }
        }
        
        // Expose to window
        window.handleCertKeydown = handleCertKeydown;

        // Handle focus on input
        function handleCertFocus(event, stepIndex) {
            const input = event.target;
            if (input.value.trim()) {
                handleCertInput(event, stepIndex);
            }
        }
        
        // Expose to window
        window.handleCertFocus = handleCertFocus;

        // Handle blur on input
        function handleCertBlur(event, stepIndex) {
            // Delay to allow click on dropdown item
            setTimeout(() => {
                const dropdown = document.getElementById(`autocomplete_${stepIndex}`);
                dropdown.classList.remove('active');
                currentAutocompleteIndex = -1;
            }, 200);
        }
        
        // Expose to window
        window.handleCertBlur = handleCertBlur;

        // Select certification from autocomplete
        function selectCert(event, certName, stepIndex) {
            event.preventDefault();
            const input = document.getElementById(`newCert_${stepIndex}`);
            input.value = certName;
            const dropdown = document.getElementById(`autocomplete_${stepIndex}`);
            dropdown.classList.remove('active');
            // Auto-add the selected cert
            const statusName = currentWorkflow[stepIndex].status;
            addCert(statusName, stepIndex, certName);
        }

        // Check if operator has required certs considering step order
        function checkOperatorHasRequiredCerts(operator, requiredCerts, currentStepIndex) {
            if (!operator.certifications || operator.certifications.length === 0) {
                return requiredCerts.length === 0;
            }

            // Get all certs the operator has
            const operatorCerts = new Set(
                operator.certifications.map(cert => cert.CertType)
            );

            // Also check if operator should have completed certs from previous steps
            let allRequiredCerts = new Set(requiredCerts);
            
            // Add certs from all previous steps
            for (let i = 0; i < currentStepIndex; i++) {
                const prevStatus = currentWorkflow[i].status;
                const prevPizzaStatusId = currentWorkflow[i].originalObj ? currentWorkflow[i].originalObj.PizzaStatusID : null;
                const prevRequiredCerts = getRequiredCertsForStatus(prevStatus, prevPizzaStatusId);
                prevRequiredCerts.forEach(cert => allRequiredCerts.add(cert));
            }

            // Check if operator has all required certs
            for (let cert of allRequiredCerts) {
                if (!operatorCerts.has(cert)) {
                    return false;
                }
            }

            return true;
        }

        // Validate all operators in a step
        function validateOperatorsInStep(operatorsInStep, requiredCerts, stepIndex) {
            if (operatorsInStep.length === 0) {
                return { isValid: true, missingCount: 0 };
            }

            let missingCount = 0;
            operatorsInStep.forEach(op => {
                if (!checkOperatorHasRequiredCerts(op, requiredCerts, stepIndex)) {
                    missingCount++;
                }
            });

            return {
                isValid: missingCount === 0,
                missingCount: missingCount,
                total: operatorsInStep.length
            };
        }

        // Toggle dropdown
        function toggleDropdown(trigger) {
            const content = trigger.nextElementSibling;
            const arrow = trigger.querySelector('.arrow');
            
            content.classList.toggle('open');
            arrow.classList.toggle('open');
        }

        // Drag and drop functionality
        let draggedElement = null;
        let draggedIndex = null;

        function addDragAndDropListeners() {
            const stepCards = document.querySelectorAll('.step-card');

            stepCards.forEach(card => {
                card.addEventListener('dragstart', handleDragStart);
                card.addEventListener('dragend', handleDragEnd);
            });
            
            // Add listeners to drop zones between cards
            const dropZones = document.querySelectorAll('.status-drop-zone');
            dropZones.forEach(zone => {
                zone.addEventListener('dragover', handleDropZoneDragOver);
                zone.addEventListener('dragenter', handleDropZoneDragEnter);
                zone.addEventListener('dragleave', handleDropZoneDragLeave);
                zone.addEventListener('drop', handleDropZoneDrop);
            });
        }

        function handleDragStart(e) {
            draggedElement = this;
            draggedIndex = parseInt(this.dataset.index);
            this.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedIndex);
            
            // Show all drop zones
            setTimeout(() => {
                document.querySelectorAll('.status-drop-zone').forEach(zone => {
                    zone.classList.add('visible');
                });
            }, 0);
            
            // Add global drag tracking to highlight nearest zone
            document.addEventListener('drag', updateNearestDropZone);
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            
            // Remove global drag tracker
            document.removeEventListener('drag', updateNearestDropZone);
            
            // Hide all drop zones and remove highlights
            document.querySelectorAll('.status-drop-zone').forEach(zone => {
                zone.classList.remove('visible', 'drag-over');
            });
            
            // Remove drag-over class from all cards (legacy cleanup)
            document.querySelectorAll('.step-card').forEach(card => {
                card.classList.remove('drag-over');
            });
        }

        function handleDropZoneDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            return false;
        }
        
        // Highlight only the nearest drop zone based on cursor position
        function updateNearestDropZone(e) {
            const x = e.clientX;
            const y = e.clientY;
            
            if (x === 0 && y === 0) return; // Ignore invalid coordinates
            
            const dropZones = document.querySelectorAll('.status-drop-zone.visible');
            let nearestZone = null;
            let minDistance = Infinity;
            
            dropZones.forEach(zone => {
                const rect = zone.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                // Calculate distance from cursor to center of drop zone
                const distance = Math.sqrt(
                    Math.pow(x - centerX, 2) + 
                    Math.pow(y - centerY, 2)
                );
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestZone = zone;
                }
            });
            
            // Remove drag-over from all zones, then add to nearest
            dropZones.forEach(zone => {
                if (zone === nearestZone) {
                    zone.classList.add('drag-over');
                } else {
                    zone.classList.remove('drag-over');
                }
            });
        }

        function handleDropZoneDragEnter(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        function handleDropZoneDragLeave(e) {
            // Handled by updateNearestDropZone, no action needed
        }

        function handleDropZoneDrop(e) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            e.preventDefault();
            
            this.classList.remove('drag-over');

            const dropIndex = parseInt(this.dataset.dropIndex);
            
            if (draggedIndex === null || draggedIndex === undefined) return false;
            
            // Calculate the actual target index
            // If dropping after the dragged item, we need to adjust
            let targetIndex = dropIndex;
            if (draggedIndex < dropIndex) {
                targetIndex = dropIndex - 1;
            }

            if (draggedIndex !== targetIndex) {
                
                // Remove the item from its current position
                const [removed] = currentWorkflow.splice(draggedIndex, 1);
                // Insert at new position
                currentWorkflow.splice(targetIndex, 0, removed);

                // Update OrderIDs for all items (same logic as reorderStep)
                currentWorkflow.forEach((item, idx) => {
                    const newOrder = String(idx + 1);
                    item.step = idx + 1;
                    
                    if (item.originalObj) {
                        item.originalObj.OrderID = newOrder;
                    }
                    
                    const globalStatusType = statusTypes.find(st => 
                        st.Status === item.status && st.DivisionID === mainDivisionFilter
                    );
                    if (globalStatusType) {
                        globalStatusType.OrderID = newOrder;
                    }
                });
                
                hasUnsavedChanges = true;
                markUnsaved();

                // Re-render without reinitializing
                renderWorkflowWithoutReinit();
                updateStats();
                
                // Add animations to affected cards
                setTimeout(() => {
                    const cards = document.querySelectorAll('.step-card');
                    
                    // Determine the range of affected cards
                    const minAffected = Math.min(draggedIndex, targetIndex);
                    const maxAffected = Math.max(draggedIndex, targetIndex);
                    
                    cards.forEach((card, idx) => {
                        if (idx >= minAffected && idx <= maxAffected) {
                            if (idx === targetIndex) {
                                // The moved card gets green wiggle
                                card.classList.add('wiggle');
                                setTimeout(() => card.classList.remove('wiggle'), 600);
                            } else {
                                // Other affected cards get yellow glow
                                card.classList.add('order-changed');
                                setTimeout(() => card.classList.remove('order-changed'), 800);
                            }
                        }
                    });
                }, 50);
            }

            return false;
        }
        
        // Legacy handlers (kept for backwards compatibility, but not used for status reordering)
        function handleDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            return false;
        }

        function handleDragEnter(e) {
            if (this !== draggedElement) {
                this.classList.add('drag-over');
            }
        }

        function handleDragLeave(e) {
            this.classList.remove('drag-over');
        }

        function handleDrop(e) {
            // Legacy - not used for status reordering anymore
            return false;
        }

        // Update statistics - compute everything on the client
        async function updateStats() {
            // Filter operators by division
            let filteredOperators = operators;
            if (mainDivisionFilter !== 'ALL') {
                filteredOperators = filteredOperators.filter(op => op.DivisionID === mainDivisionFilter);
            }
            
            // Apply client filter if needed
            if (mainClientFilter && statusTypes && pizzaStatuses) {
                const clientPizzaStatuses = new Set(
                    pizzaStatuses
                        .filter(ps => ps.ClientId === mainClientFilter)
                        .map(ps => ps.ID)
                );
                
                const clientStatusNames = new Set(
                    statusTypes
                        .filter(st => st.PizzaStatusID && clientPizzaStatuses.has(st.PizzaStatusID))
                        .map(st => st.Status)
                );
                
                filteredOperators = filteredOperators.filter(op => {
                    const opStatus = op.Status;
                    return opStatus && clientStatusNames.has(opStatus);
                });
            }

            // Update total operators count
            const totalOpsCount = filteredOperators.length;
            const totalOpsEl = document.getElementById('totalOperators');
            if (totalOpsEl) {
                totalOpsEl.textContent = totalOpsCount;
            }

            // Build workflow distribution by counting operators in each status
            const statusCounts = new Map();
            const workflowLabels = [];
            const workflowData = [];
            
            // Initialize counts for all workflow statuses
            currentWorkflow.forEach(flow => {
                statusCounts.set(flow.status, 0);
            });
            
            // Count operators by their actual status
            filteredOperators.forEach(op => {
                const opStatus = op.Status;
                if (opStatus) {
                    // Try exact match first
                    if (statusCounts.has(opStatus)) {
                        statusCounts.set(opStatus, statusCounts.get(opStatus) + 1);
                    } else {
                        // Try case-insensitive match
                        for (let [statusName, count] of statusCounts) {
                            if (statusName.toUpperCase() === opStatus.toUpperCase()) {
                                statusCounts.set(statusName, count + 1);
                                break;
                            }
                        }
                    }
                }
            });

            // Build arrays for chart
            currentWorkflow.forEach(flow => {
                workflowLabels.push(flow.status);
                workflowData.push(statusCounts.get(flow.status) || 0);
            });

            // Calculate compliance: prefer server aggregate, fall back to client-side calculation
            let totalRequiredSlots = 0;
            let fulfilledSlots = 0;
            let compliancePercent = 0;

            // Try server endpoint first for authoritative aggregate
            let serverResult = null;
            if (mainDivisionFilter && mainDivisionFilter !== 'ALL') {
                try {
                    let url = `/Requirements/GetComplianceSummary?divisionId=${encodeURIComponent(mainDivisionFilter)}`;
                    if (mainClientFilter) {
                        url += `&clientId=${encodeURIComponent(mainClientFilter)}`;
                    }

                    const resp = await fetch(url);
                    if (resp.ok) {
                        const data = await resp.json();
                        serverResult = {
                            totalRequiredSlots: data.totalRequiredSlots || 0,
                            fulfilledSlots: data.fulfilledSlots || 0,
                            percent: data.percent || 0
                        };
                    }
                } catch (e) {
                    // If the endpoint fails for any reason, we'll fall back to client-side calculation
                }
            }

            if (serverResult) {
                totalRequiredSlots = serverResult.totalRequiredSlots;
                fulfilledSlots = serverResult.fulfilledSlots;
                compliancePercent = serverResult.percent;
            } else {
                // Fallback: compute on client using the same definition as operator cards
                try {
                    if (
                        mainDivisionFilter &&
                        mainDivisionFilter !== 'ALL' &&
                        Array.isArray(filteredOperators) &&
                        filteredOperators.length > 0 &&
                        Array.isArray(currentWorkflow) &&
                        currentWorkflow.length > 0 &&
                        Array.isArray(certTypes) &&
                        certTypes.length > 0
                    ) {
                        // Build a map from status name (uppercased) to workflow step / StatusType
                        const flowMap = new Map();
                        currentWorkflow.forEach(flow => {
                            if (flow && flow.status && flow.originalObj) {
                                flowMap.set(String(flow.status).toUpperCase(), flow.originalObj);
                            }
                        });

                        filteredOperators.forEach(op => {
                            const opStatus = op.Status;
                            const opId = op.ID || op.Id;
                            if (!opStatus || !opId) {
                                return;
                            }

                            const statusType = flowMap.get(String(opStatus).toUpperCase());
                            if (!statusType) {
                                return;
                            }

                            const stPizzaStatusId =
                                statusType.PizzaStatusID ||
                                statusType.PizzaStatusId ||
                                statusType.pizzaStatusId ||
                                statusType.pizzaStatusID;
                            const stDivisionId =
                                statusType.DivisionID ||
                                statusType.DivisionId ||
                                statusType.divisionId ||
                                statusType.divisionID;

                            // In some JSON-backed datasets DivisionId may be missing on StatusType;
                            // only enforce a division match when a division is actually present.
                            if (!stPizzaStatusId) {
                                return;
                            }
                            if (stDivisionId && stDivisionId !== mainDivisionFilter) {
                                return;
                            }

                            // Required cert types for this PizzaStatusID + division
                            const requiredCertTypes = certTypes.filter(ct => {
                                const ctPizzaStatusId =
                                    ct.PizzaStatusID ||
                                    ct.PizzaStatusId ||
                                    ct.pizzaStatusId ||
                                    ct.pizzaStatusID;
                                const ctDivisionId =
                                    ct.DivisionID ||
                                    ct.DivisionId ||
                                    ct.divisionId ||
                                    ct.divisionID;
                                const ctIsDeleted = ct.IsDeleted ?? ct.isDeleted ?? ct.isDelete;

                                if (!ctPizzaStatusId || ctIsDeleted === true) return false;
                                if (ctPizzaStatusId !== stPizzaStatusId) return false;
                                // As with StatusType, only enforce division matching when DivisionId exists on the cert type.
                                if (ctDivisionId && ctDivisionId !== mainDivisionFilter) return false;
                                return true;
                            });

                            if (requiredCertTypes.length === 0) {
                                return;
                            }

                            const opCerts = (op.certifications && Array.isArray(op.certifications))
                                ? op.certifications
                                : certifications.filter(c => (c.OperatorID || c.OperatorId) === opId);

                            requiredCertTypes.forEach(ct => {
                                const ctId = ct.ID || ct.Id;
                                if (!ctId) {
                                    return;
                                }

                                const hasCert = opCerts.some(c => {
                                    const cCertTypeId = c.CertTypeID || c.CertTypeId;
                                    const isDeleted = c.IsDeleted === true || c.isDeleted === true;
                                    const isApproved = c.IsApproved === true || c.isApproved === true;
                                    if (!cCertTypeId || isDeleted || !isApproved) return false;
                                    return cCertTypeId === ctId;
                                });

                                totalRequiredSlots++;
                                if (hasCert) {
                                    fulfilledSlots++;
                                }
                            });
                        });

                        if (totalRequiredSlots > 0) {
                            compliancePercent = Math.round((fulfilledSlots / totalRequiredSlots) * 100);
                        }
                    }
                } catch (e) {
                    // Swallow errors for safety; if anything goes wrong, chart stays at zero
                }
            }

            currentCompliancePercent = compliancePercent;

            // --- UPDATE CHARTS ---

            // 1. Compliance Doughnut
            const ctxComplianceInner = document.getElementById('complianceChart');
            if (ctxComplianceInner) {
                const compliantCountInner = fulfilledSlots;
                const nonCompliantCountInner = Math.max(totalRequiredSlots - fulfilledSlots, 0);

                if (!complianceChartInstance) {
                    complianceChartInstance = new Chart(ctxComplianceInner, {
                        type: 'doughnut',
                        data: {
                            labels: ['Compliant', 'Non-Compliant'],
                            datasets: [{
                                data: [compliantCountInner, nonCompliantCountInner],
                                backgroundColor: ['#22c55e', '#d1d5db'],
                                borderWidth: 0,
                                cutout: '65%'
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    enabled: true,
                                    callbacks: {
                                        label: function (context) {
                                            return context.label + ': ' + context.parsed + ' slots';
                                        }
                                    }
                                }
                            }
                        },
                        plugins: [{
                            id: 'centerText',
                            afterDatasetsDraw(chart) {
                                const { ctx, chartArea: { left, top, width, height } } = chart;
                                ctx.save();
                                const centerX = left + width / 2;
                                const centerY = top + height / 2;
                                const gradient = ctx.createLinearGradient(centerX - 30, centerY - 10, centerX + 30, centerY + 10);
                                gradient.addColorStop(0, '#1382CA');
                                gradient.addColorStop(1, '#39afd1');
                                ctx.font = 'bold 24px Arial';
                                ctx.fillStyle = gradient;
                                ctx.textAlign = 'center';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(currentCompliancePercent + '%', centerX, centerY);
                                ctx.restore();
                            }
                        }]
                    });
                } else {
                    complianceChartInstance.data.datasets[0].data = [compliantCountInner, nonCompliantCountInner];
                    complianceChartInstance.update();
                }
            }
            // 2. Workflow Distribution (Horizontal Bar)
            const ctxWorkflow = document.getElementById('workflowChart');
            if (ctxWorkflow) {
                if (!workflowChartInstance) {
                    workflowChartInstance = new Chart(ctxWorkflow, {
                        type: 'bar',
                        data: {
                            labels: workflowLabels,
                            datasets: [{
                                label: 'Operators',
                                data: workflowData,
                                backgroundColor: '#6366f1',
                                borderRadius: 4
                            }]
                        },
                        options: {
                            indexAxis: 'y',
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                x: { 
                                    beginAtZero: true,
                                    ticks: { 
                                        color: '#94a3b8',
                                        font: { size: 10 },
                                        stepSize: 1
                                    },
                                    grid: { color: '#1e293b' }
                                },
                                y: {
                                    ticks: { 
                                        color: '#94a3b8', 
                                        font: { size: 10 } 
                                    },
                                    grid: { display: false }
                                }
                            },
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    enabled: true,
                                    callbacks: {
                                        label: function(context) {
                                            return context.parsed.x + ' operators';
                                        }
                                    }
                                }
                            }
                        }
                    });
                } else {
                    workflowChartInstance.data.labels = workflowLabels;
                    workflowChartInstance.data.datasets[0].data = workflowData;
                    workflowChartInstance.update();
                }
            }
        }

        // Reset to ideal flow
        function resetToIdealFlow() {
            currentWorkflow = [...idealFlow];
            renderWorkflow();
            updateStats();
        }

        // Validate all steps
        function validateAll() {
            updateStats();
            alert('Validation complete! Check the stats above for results.');
        }

        // Show issues
        function showIssues() {
            let issuesList = [];

            currentWorkflow.forEach((flowStep, index) => {
                const statusName = flowStep.status;
                const pizzaStatusId = flowStep.originalObj ? flowStep.originalObj.PizzaStatusID : null;
                const operatorsInStep = operators.filter(op => 
                    op.Status === statusName || 
                    (op.Status && op.Status.toUpperCase() === statusName.toUpperCase())
                );

                const requiredCerts = getRequiredCertsForStatus(statusName, pizzaStatusId);
                const validation = validateOperatorsInStep(operatorsInStep, requiredCerts, index);

                if (!validation.isValid) {
                    issuesList.push(`Step ${index + 1} (${statusName}): ${validation.missingCount}/${validation.total} operators missing certifications`);
                }
            });

            if (issuesList.length === 0) {
                alert('✓ No issues found! All operators have required certifications.');
            } else {
                alert('⚠ Issues Found:\n\n' + issuesList.join('\n'));
            }
        }

        // Cert drag and drop
        let draggedCert = null;
        let draggedCertName = null;

        function handleCertDragStart(e, element) {
            draggedCert = element;
            draggedCertName = element.dataset.cert;
            element.classList.add('dragging-cert');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', draggedCertName);
        }

        function handleCertDragOver(e) {
            if (e.preventDefault) {
                e.preventDefault();
            }
            e.dataTransfer.dropEffect = 'move';
            return false;
        }

        function handleCertDrop(e, dropZone) {
            if (e.stopPropagation) {
                e.stopPropagation();
            }
            e.preventDefault();

            const certName = e.dataTransfer.getData('text/plain');
            const targetStatus = dropZone.dataset.status;
            
            if (draggedCert && certName) {
                // Remove from original location
                const sourceStatus = draggedCert.closest('.cert-list').dataset.status;
                
                // Find the PizzaStatusID for this status and division
                let pizzaStatusId = null;
                if (statusTypes && Array.isArray(statusTypes)) {
                    const st = statusTypes.find(s => s.Status === targetStatus && s.DivisionID === mainDivisionFilter);
                    if (st && st.PizzaStatusID) pizzaStatusId = st.PizzaStatusID;
                }

                // Check if this cert type is already assigned to a different PizzaStatusID in this division
                const existing = certTypes.find(ct =>
                    normalizeCertName(ct.Certification) === normalizeCertName(certName) &&
                    ct.DivisionID === mainDivisionFilter &&
                    ct.PizzaStatusID &&
                    ct.PizzaStatusID !== pizzaStatusId
                );

                if (existing) {
                    // Find the status name for the existing PizzaStatusID
                    let oldStatus = '';
                    const st = statusTypes.find(s => s.PizzaStatusID === existing.PizzaStatusID && s.DivisionID === mainDivisionFilter);
                    if (st) oldStatus = st.Status;
                    showCertDuplicateModal(certName, oldStatus, targetStatus, null);
                } else {
                    addCertToStatus(targetStatus, certName);
                    // Remove from old location if different
                    if (sourceStatus !== targetStatus) {
                        removeCertFromStatus(sourceStatus, certName);
                    }
                    draggedCert.classList.remove('dragging-cert');
                    draggedCert = null;
                    draggedCertName = null;
                    renderWorkflow();
                    markUnsaved();
                }
            }

            return false;
        }

        // Add certification to a status
function addCert(statusName, stepIndex) {
    let certName = arguments.length > 2 ? arguments[2] : undefined;
    let input = null;
    if (!certName) {
        input = document.getElementById(`newCert_${stepIndex}`);
        certName = input ? input.value.trim() : '';
    }
    if (!certName) {
        alert('Please enter a certification name');
        return;
    }

    // Find the PizzaStatusID for this status and division
    let pizzaStatusId = null;
    if (statusTypes && Array.isArray(statusTypes)) {
        const st = statusTypes.find(s => s.Status === statusName && s.DivisionID === mainDivisionFilter);
        if (st && st.PizzaStatusID) pizzaStatusId = st.PizzaStatusID;
    }

    // Check if this cert type is already assigned to a different PizzaStatusID in this division
    const existing = certTypes.find(ct =>
        normalizeCertName(ct.Certification) === normalizeCertName(certName) &&
        ct.DivisionID === mainDivisionFilter &&
        ct.PizzaStatusID &&
        ct.PizzaStatusID !== pizzaStatusId
    );

    if (existing) {
        // Find the status name for the existing PizzaStatusID
        let oldStatus = '';
        const st = statusTypes.find(s => s.PizzaStatusID === existing.PizzaStatusID && s.DivisionID === mainDivisionFilter);
        if (st) oldStatus = st.Status;
        showCertDuplicateModal(certName, oldStatus, statusName, stepIndex);
        return;
    }

    addCertToStatus(statusName, certName);
    if (input) input.value = '';
    renderWorkflow();
    markUnsaved();
}

function addCertToStatus(statusName, certName) {
    // Find the PizzaStatusID for this status and division
    let pizzaStatusId = null;
    if (statusTypes && Array.isArray(statusTypes)) {
        const st = statusTypes.find(s => s.Status === statusName && s.DivisionID === mainDivisionFilter);
        if (st && st.PizzaStatusID) pizzaStatusId = st.PizzaStatusID;
    }
    // Check if it already exists - if so, we may need to update PizzaStatusID
    const existingCert = certTypes.find(ct =>
        normalizeCertName(ct.Certification) === normalizeCertName(certName) &&
        ct.DivisionID === mainDivisionFilter
    );
    if (existingCert && existingCert.PizzaStatusID !== pizzaStatusId) {
        // Update existing cert's PizzaStatusID
        existingCert.PizzaStatusID = pizzaStatusId;
        if (existingCert.ID) modifiedCertTypeIds.add(existingCert.ID);  // Track modified
    } else if (!existingCert) {
        const newId = 'TEMP-' + Math.random().toString(36).substr(2, 9);
        certTypes.push({
            ID: newId,
            Certification: certName,
            PizzaStatusID: pizzaStatusId,
            DivisionID: mainDivisionFilter,
            CertificationType: 'Added in Session',
            CertificationID: newId
        });
        modifiedCertTypeIds.add(newId);  // Track new item
    }
}

        // Remove certification
        function removeCert(e, statusName, certName) {
            e.stopPropagation();
            
            if (confirm(`Remove "${certName}" from ${statusName}?`)) {
                removeCertFromStatus(statusName, certName);
                renderWorkflow();
                markUnsaved();
            }
        }

function removeCertFromStatus(statusName, certName) {
    // Find the PizzaStatusID for this status and division
    let pizzaStatusId = null;
    if (statusTypes && Array.isArray(statusTypes)) {
        const st = statusTypes.find(s => s.Status === statusName && s.DivisionID === mainDivisionFilter);
        if (st && st.PizzaStatusID) pizzaStatusId = st.PizzaStatusID;
    }
    let updatedCount = 0;
    certTypes.forEach(ct => {
        if (
            normalizeCertName(ct.Certification) === normalizeCertName(certName) &&
            ct.PizzaStatusID === pizzaStatusId &&
            ct.DivisionID === mainDivisionFilter
        ) {
            ct.PizzaStatusID = null; // or ""
            if (ct.ID) modifiedCertTypeIds.add(ct.ID);  // Track modified
            updatedCount++;
        }
    });
}

        // Delete entire status from a division
        async function deleteStatus(statusName, divisionId) {

            // 1. Check for operators in this status using the already-loaded operators array
            const affectedOperators = operators.filter(op => 
                (op.Status === statusName || (op.Status && op.Status.toUpperCase() === statusName.toUpperCase())) &&
                op.DivisionID === divisionId
            );
            const operatorCount = affectedOperators.length;

            // 2. Show warning modal with operator details
            if (operatorCount > 0) {
                showStatusDeleteWarning(statusName, divisionId, affectedOperators, operatorCount);
            } else {
                // No operators affected, proceed with simple confirmation
                if (confirm(`Remove "${statusName}" from Division ${divisionId}?\n\nNo operators are currently in this status.\n\nThis will:\n1. Mark this status as deleted\n2. Shift subsequent statuses up one step`)) {
                    executeStatusDeletion(statusName, divisionId);
                }
            }
        }

        // Show warning modal for status deletion with operator list
        async function showStatusDeleteWarning(statusName, divisionId, operators, count) {
            const modalBody = document.getElementById('statusDeleteWarningModalBody');
            if (!modalBody) {
                console.error('❌ Status delete warning modal not found');
                return;
            }

            // Get current status OrderId
            const currentStatus = statusTypes.find(st => st.Status === statusName && st.DivisionID === divisionId);
            const currentOrderId = currentStatus ? parseInt(currentStatus.OrderID) : 0;

            // Show loading state
            modalBody.innerHTML = '<div style="padding: 20px; text-align: center;"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

            try {
                // Fetch pre-rendered content from server
                const response = await fetch(
                    `/Requirements/RenderStatusDeleteWarning?statusName=${encodeURIComponent(statusName)}&divisionId=${encodeURIComponent(divisionId)}&currentOrderId=${currentOrderId}`
                );

                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }

                const html = await response.text();
                modalBody.innerHTML = html;

                // Store context for confirm button
                window._statusDeleteContext = { statusName, divisionId, operators };

                // Show modal
                const modalEl = document.getElementById('statusDeleteWarningModal');
                if (modalEl) {
                    if (window.bootstrap && window.bootstrap.Modal) {
                        const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    } else if (typeof $ !== 'undefined' && $(modalEl).modal) {
                        $(modalEl).modal('show');
                    } else {
                        modalEl.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error('❌ Error loading status delete warning:', error);
                modalBody.innerHTML = `<div style="padding: 20px; color: #dc3545;">Error loading data: ${error.message}</div>`;
            }
        }

        // Execute the actual status deletion after confirmation
        function executeStatusDeletion(statusName, divisionId) {

            // 1. Find the StatusType record
            const statusRecord = statusTypes.find(st => 
                st.Status === statusName && 
                st.DivisionID === divisionId
            );

            if (!statusRecord) {
                alert(`Error: Could not find StatusType record for ${statusName} in ${divisionId}`);
                return;
            }

            // 2. Mark as deleted
            statusRecord.isDeleted = true;
            statusRecord.IsDelete = true;
            if (statusRecord.ID) modifiedStatusTypeIds.add(statusRecord.ID);  // Track modified
            const deletedOrderId = parseInt(statusRecord.OrderID);
            // 3. Shift OrderID of subsequent statuses
            let shiftedCount = 0;
            statusTypes.forEach(st => {
                if (st.DivisionID === divisionId && st.Status !== statusName) {
                    const currentOrder = parseInt(st.OrderID);
                    if (!isNaN(currentOrder) && currentOrder > deletedOrderId) {
                        st.OrderID = (currentOrder - 1).toString();
                        if (st.ID) modifiedStatusTypeIds.add(st.ID);  // Track modified
                        shiftedCount++;
                    }
                }
            });

            // 4. Force UI refresh
            markUnsaved();
            renderWorkflow();
            
            alert('Status marked for deletion. Click "Save Changes" to apply.');
        }

        // Mark as having unsaved changes
        function markUnsaved() {
            hasUnsavedChanges = true;
            const unsavedIndicator = document.getElementById('unsavedIndicator');
            const saveBtn = document.getElementById('saveBtn');
            if (unsavedIndicator) {
                unsavedIndicator.style.display = 'block';
                unsavedIndicator.style.position = 'fixed';
                unsavedIndicator.style.top = '20px';
                unsavedIndicator.style.right = '20px';
                unsavedIndicator.style.zIndex = '2000';
                unsavedIndicator.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
                unsavedIndicator.style.color = 'white';
                unsavedIndicator.style.padding = '16px 24px';
                unsavedIndicator.style.borderRadius = '10px';
                unsavedIndicator.style.fontSize = '1.1rem';
                unsavedIndicator.style.fontWeight = 'bold';
                unsavedIndicator.style.boxShadow = '0 4px 16px rgba(245, 158, 11, 0.4)';
            } else {
                console.warn('unsavedIndicator element not found');
            }
            if (saveBtn) {
                saveBtn.style.display = 'inline-block';
                saveBtn.style.position = 'fixed';
                saveBtn.style.bottom = '40px';
                saveBtn.style.right = '40px';
                saveBtn.style.zIndex = '2000';
                saveBtn.style.background = 'linear-gradient(135deg, #10b981, #059669)';
                saveBtn.style.color = 'white';
                saveBtn.style.padding = '18px 32px';
                saveBtn.style.borderRadius = '12px';
                saveBtn.style.fontSize = '1.2rem';
                saveBtn.style.fontWeight = 'bold';
                saveBtn.style.boxShadow = '0 8px 32px rgba(16, 185, 129, 0.4)';
            } else {
                console.warn('saveBtn element not found');
            }
        }

        // Save changes - exports to pay_PizzaStatusRequirements.json format
        async function saveChanges() {

            if (!hasUnsavedChanges) {
                alert('No changes to save');
                return;
            }

            // If data is still loading, request cancellation so we can prioritize saving
            cancelLoadData = true;

            const saveBtn = document.getElementById('saveBtn');
            const originalLabel = saveBtn ? saveBtn.innerHTML : '';

            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Saving...';
            }

            let saveLog = '';
            let saveSuccess = true;

            try {
                // Save ONLY modified cert types
                if (modifiedCertTypeIds.size > 0) {
                    const modifiedCertTypes = certTypes.filter(ct => ct.ID && modifiedCertTypeIds.has(ct.ID)).map(ct => ({ ...ct }));
                    console.log(`Saving ${modifiedCertTypes.length} modified cert types (out of ${certTypes.length} total)`);
                    const responseCertTypes = await fetch('/api/data/certtypes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(modifiedCertTypes, null, 4)
                    });
                    if (responseCertTypes.ok) {
                        saveLog += `✓ Cert types saved (${modifiedCertTypes.length} items).\n`;
                    } else {
                        saveLog += `✗ Failed to save cert types: ${responseCertTypes.status} ${responseCertTypes.statusText}\n`;
                        saveSuccess = false;
                    }
                } else {
                    saveLog += '○ No cert types modified.\n';
                }
            } catch (err) {
                saveLog += `✗ Error during save: ${err.message || err}\n`;
                saveSuccess = false;
            }

            try {
                // Save ONLY modified status types
                if (modifiedStatusTypeIds.size > 0) {
                    const modifiedStatusTypes = statusTypes.filter(st => st.ID && modifiedStatusTypeIds.has(st.ID)).map(st => ({ ...st }));
                    console.log(`Saving ${modifiedStatusTypes.length} modified status types (out of ${statusTypes.length} total)`);
                    const responseStatusTypes = await fetch('/api/data/statustypes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(modifiedStatusTypes)
                    });
                    if (responseStatusTypes.ok) {
                        saveLog += `✓ Status types saved (${modifiedStatusTypes.length} items).\n`;
                    } else {
                        const errorText = await responseStatusTypes.text();
                        saveLog += `✗ Failed to save status types: ${responseStatusTypes.status} ${responseStatusTypes.statusText} - ${errorText}\n`;
                        saveSuccess = false;
                    }
                } else {
                    saveLog += '○ No status types modified.\n';
                }
            } catch (err) {
                saveLog += `✗ Error during save (status types): ${err.message || err}\n`;
                saveSuccess = false;
            }

            try {
                // Save ONLY modified pizza statuses
                if (modifiedPizzaStatusIds.size > 0) {
                    const modifiedPizzaStatuses = pizzaStatuses.filter(ps => ps.ID && modifiedPizzaStatusIds.has(ps.ID)).map(ps => ({ ...ps }));
                    console.log(`Saving ${modifiedPizzaStatuses.length} modified pizza statuses (out of ${pizzaStatuses.length} total)`);
                    const responsePizzaStatuses = await fetch('/api/data/pizzastatuses', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(modifiedPizzaStatuses)
                    });
                    if (responsePizzaStatuses.ok) {
                        saveLog += `✓ Pizza statuses saved (${modifiedPizzaStatuses.length} items).\n`;
                    } else {
                        const errorText = await responsePizzaStatuses.text();
                        saveLog += `✗ Failed to save pizza statuses: ${responsePizzaStatuses.status} ${responsePizzaStatuses.statusText} - ${errorText}\n`;
                        saveSuccess = false;
                    }
                } else {
                    saveLog += '○ No pizza statuses modified.\n';
                }
            } catch (err) {
                saveLog += `✗ Error during save (pizza statuses): ${err.message || err}\n`;
                saveSuccess = false;
            }

            // Show log/notice to user
            alert(`Save Attempt:\n${saveLog}`);

            // Update UI based on result
            if (saveSuccess) {
                hasUnsavedChanges = false;
                // Clear the modification tracking sets
                modifiedCertTypeIds.clear();
                modifiedStatusTypeIds.clear();
                modifiedPizzaStatusIds.clear();
                document.getElementById('unsavedIndicator').style.display = 'none';
                document.getElementById('saveBtn').style.display = 'none';
                // Refresh the page after a short delay to allow user to see the alert
                setTimeout(() => { window.location.reload(); }, 500);
            } else {
                hasUnsavedChanges = true;
                document.getElementById('unsavedIndicator').style.display = 'block';
                document.getElementById('saveBtn').style.display = 'inline-block';

                if (saveBtn) {
                    saveBtn.disabled = false;
                    saveBtn.innerHTML = originalLabel;
                }
            }
        }

        function downloadJSON(blob, filename = 'pay_PizzaStatusRequirements.json') {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert('✓ Changes exported!\n\nThe file has been downloaded as pay_PizzaStatusRequirements.json.\nPlease replace the existing file in the data/ directory and refresh the page.');
            
            hasUnsavedChanges = false;
            document.getElementById('unsavedIndicator').style.display = 'none';
            document.getElementById('saveBtn').style.display = 'none';
            
            // Update original data
            originalCertRequirements = JSON.parse(JSON.stringify(certRequirements));
        }

        // Toggle IsAuto flag for a PizzaStatus and mark changes
        function togglePizzaStatusAuto(pizzaStatusId, isAuto) {
            if (!pizzaStatusId || !pizzaStatuses || !Array.isArray(pizzaStatuses)) {
                return;
            }

            // Update both Id/ID and IsAuto/isAuto variants to keep data consistent
            pizzaStatuses.forEach(ps => {
                const idMatch = ps.ID === pizzaStatusId || ps.Id === pizzaStatusId;
                if (idMatch) {
                    ps.IsAuto = isAuto;
                    ps.isAuto = isAuto;
                    if (ps.ID) modifiedPizzaStatusIds.add(ps.ID);  // Track modified
                }
            });

            window.pizzaStatuses = pizzaStatuses;
            markUnsaved();
        }

        // Auto-move a single operator to their computed next status
        async function autoMoveOperatorToNextStatus(operatorId, nextStatusId, nextStatusName, nextOrderId, btn) {
            if (!operatorId || !nextStatusId) {
                return;
            }

            const confirmed = confirm(`Move this operator to the next status "${nextStatusName}"?`);
            if (!confirmed) {
                return;
            }

            try {
                if (btn) {
                    btn.disabled = true;
                    btn.textContent = 'Moving...';
                }

                const payload = {
                    OperatorIds: [operatorId],
                    NewStatusName: nextStatusName,
                    NewStatusId: nextStatusId,
                    NewOrderId: nextOrderId || ''
                };

                const response = await fetch('/api/data/operators/bulkupdatestatus', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const text = await response.text();
                    throw new Error(`Server returned ${response.status}: ${text}`);
                }

                // Update local operators array so UI stays roughly in sync
                operators.forEach(op => {
                    if (op.ID === operatorId || op.Id === operatorId) {
                        op.Status = nextStatusName;
                    }
                });

                markUnsaved();

                if (btn) {
                    btn.textContent = 'Moved';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-secondary');
                }
            } catch (err) {
                console.error('Error auto-moving operator:', err);
                alert('Failed to move operator: ' + (err.message || err));
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Move to next status';
                }
            }
        }

        // Compute the next status for a given operator based on the current workflow
        function computeNextStatusForOperator(operatorId) {
            if (!operatorId || !Array.isArray(currentWorkflow) || currentWorkflow.length === 0) {
                return null;
            }

            const op = operators.find(o => o.ID === operatorId || o.Id === operatorId);
            if (!op || !op.Status) {
                return null;
            }

            const opStatusUpper = String(op.Status).toUpperCase();

            // Find current workflow step for this operator's status
            const currentStep = currentWorkflow.find(flow =>
                flow && flow.status && String(flow.status).toUpperCase() === opStatusUpper
            );
            if (!currentStep) {
                return null;
            }

            const currentPizzaStatusId = currentStep.originalObj
                ? (currentStep.originalObj.PizzaStatusID || currentStep.originalObj.PizzaStatusId || currentStep.originalObj.pizzaStatusId || currentStep.originalObj.pizzaStatusID)
                : null;

            // Find the next step in the workflow with a different PizzaStatusID (if available)
            let nextStep = null;
            const currentOrder = typeof currentStep.step === 'number' ? currentStep.step : parseInt(currentStep.originalObj?.OrderID) || 0;

            currentWorkflow.forEach(flow => {
                if (!flow || !flow.status) return;
                const flowOrder = typeof flow.step === 'number' ? flow.step : parseInt(flow.originalObj?.OrderID) || 0;
                if (flowOrder <= currentOrder) return;

                const flowPizzaStatusId = flow.originalObj
                    ? (flow.originalObj.PizzaStatusID || flow.originalObj.PizzaStatusId || flow.originalObj.pizzaStatusId || flow.originalObj.pizzaStatusID)
                    : null;

                if (currentPizzaStatusId && flowPizzaStatusId && flowPizzaStatusId === currentPizzaStatusId) {
                    // Skip same PizzaStatusID to mirror auto-advance behavior
                    return;
                }

                if (!nextStep || flowOrder < (typeof nextStep.step === 'number' ? nextStep.step : parseInt(nextStep.originalObj?.OrderID) || Number.MAX_SAFE_INTEGER)) {
                    nextStep = flow;
                }
            });

            if (!nextStep) {
                return null;
            }

            const nextStatusName = nextStep.status;
            const nextStatusId = nextStep.statusId || nextStep.id || nextStep.Id || (nextStep.originalObj && (nextStep.originalObj.Id || nextStep.originalObj.ID));
            const nextOrderId = String(typeof nextStep.step === 'number' ? nextStep.step : (nextStep.originalObj?.OrderID || ''));

            if (!nextStatusName || !nextStatusId) {
                return null;
            }

            return {
                nextStatusName,
                nextStatusId,
                nextOrderId
            };
        }

        // Handler for "Next status" button on operator cards
        function moveOperatorToNextStatusFromCard(operatorId) {
            const next = computeNextStatusForOperator(operatorId);
            if (!next) {
                alert('No next status is configured for this operator in the current workflow.');
                return;
            }

            autoMoveOperatorToNextStatus(operatorId, next.nextStatusId, next.nextStatusName, next.nextOrderId);
        }

        // Handler for "Move to next status" button in the Operator Profile modal
        function moveOperatorToNextStatusFromProfile(operatorId) {
            const next = computeNextStatusForOperator(operatorId);
            if (!next) {
                alert('No next status is configured for this operator in the current workflow.');
                return;
            }

            autoMoveOperatorToNextStatus(operatorId, next.nextStatusId, next.nextStatusName, next.nextOrderId);
        }

        // ===== CONTROL CENTER FEATURES =====

        // Global search
        function handleGlobalSearch() {
            const query = document.getElementById('globalSearch').value.trim();
            searchQuery = query.toLowerCase();
            const clearBtn = document.querySelector('.clear-search');
            clearBtn.style.display = query ? 'block' : 'none';
            renderWorkflow();
        }

        function clearGlobalSearch() {
            document.getElementById('globalSearch').value = '';
            searchQuery = '';
            document.querySelector('.clear-search').style.display = 'none';
            renderWorkflow();
        }

        // Populate main division filter dropdown
        function populateMainDivisionFilter() {
            const filterSelect = document.getElementById('mainDivisionFilter');
            if (!filterSelect) return;

            // Get divisions that have StatusTypes with PizzaStatuses for the selected client
            let availableDivisions = new Set();
            
            if (mainClientFilter && statusTypes && pizzaStatuses) {
                // Build PizzaStatus lookup by ClientId
                const clientPizzaStatuses = new Set(
                    pizzaStatuses
                        .filter(ps => ps.ClientId === mainClientFilter)
                        .map(ps => ps.ID)
                );
                
                // Find divisions that have StatusTypes linked to this client's PizzaStatuses
                statusTypes.forEach(st => {
                    if (st.PizzaStatusID && clientPizzaStatuses.has(st.PizzaStatusID)) {
                        availableDivisions.add(st.DivisionID);
                    }
                });
            } else {
                // No client filter - show all divisions from statusTypes
                if (statusTypes) {
                    statusTypes.forEach(st => {
                        if (st.DivisionID) {
                            availableDivisions.add(st.DivisionID);
                        }
                    });
                }
            }

            // Convert to array and sort
            const divisionsArray = Array.from(availableDivisions).sort((a, b) => {
                const numA = parseInt(a.split(' - ')[0].trim()) || 9999;
                const numB = parseInt(b.split(' - ')[0].trim()) || 9999;
                return numA - numB;
            });

            // Clear existing options except "All Divisions"
            filterSelect.innerHTML = '<option value="ALL">All Divisions</option>';

            // Add divisions, greying out non-whitelisted ones
            divisionsArray.forEach(div => {
                const option = document.createElement('option');
                option.value = div;
                
                const isWhitelisted = ALLOWED_DIVISIONS.includes(div);
                if (isWhitelisted) {
                    option.textContent = div;
                    option.style.color = '';
                } else {
                    option.textContent = `${div} (Other)`;
                    option.style.color = '#999';
                    option.style.fontStyle = 'italic';
                }
                
                filterSelect.appendChild(option);
            });

            // Set the filter dropdown to match the current mainDivisionFilter
            if (mainDivisionFilter && filterSelect.value !== mainDivisionFilter) {
                filterSelect.value = mainDivisionFilter;
            }

            // After populating, check for division param in URL and set filter if present
            const urlParams = new URLSearchParams(window.location.search);
            const divisionParam = urlParams.get('division');
            if (divisionParam && filterSelect.value !== divisionParam) {
                filterSelect.value = divisionParam;
                handleMainDivisionFilter();
            }

            // Update the division title in the header
            updateDivisionTitle();
        }

        // Update the division title in the header
        function updateDivisionTitle() {
            const titleEl = document.getElementById('divisionTitle');
            if (!titleEl) return;
            if (mainDivisionFilter && mainDivisionFilter !== 'ALL') {
                titleEl.textContent = mainDivisionFilter;
            } else {
                titleEl.textContent = 'All Divisions';
            }
        }

        // Handle main division filter change
        async function handleMainDivisionFilter() {
            const previousDivision = mainDivisionFilter;
            mainDivisionFilter = document.getElementById('mainDivisionFilter').value;
            
            // If division changed, reload operators for new division
            if (previousDivision !== mainDivisionFilter) {
                try {
                    // Show loading indicator
                    const workflowSteps = document.getElementById('workflowSteps');
                    if (workflowSteps) {
                        workflowSteps.innerHTML = '<div style="padding: 40px; text-align: center; color: #94a3b8;"><i class="fas fa-spinner fa-spin"></i> Loading operators for division...</div>';
                    }
                    
                    // Fetch operators and certifications for selected division
                    const response = await fetch(`/Requirements/GetOperatorsByDivisionWithCerts?divisionId=${encodeURIComponent(mainDivisionFilter)}`);
                    if (!response.ok) {
                        throw new Error(`Failed to load division data: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    operators = data.operators || [];
                    certifications = data.certifications || [];
                    
                    // Normalize properties
                    operators.forEach(op => {
                        if (!op.DivisionID && op.DivisionId) {
                            op.DivisionID = op.DivisionId;
                        }
                        if (!op.ID && op.Id) {
                            op.ID = op.Id;
                        }
                    });
                    
                    certifications.forEach(cert => {
                        if (!cert.OperatorID && cert.OperatorId) {
                            cert.OperatorID = cert.OperatorId;
                        }
                        if (!cert.CertTypeID && cert.CertTypeId) {
                            cert.CertTypeID = cert.CertTypeId;
                        }
                    });
                    
                    // Join certifications to operators
                    operators.forEach(op => {
                        op.certifications = certifications.filter(cert => cert.OperatorID === op.ID);
                    });
                    
                } catch (error) {
                    console.error('❌ Error loading division data:', error);
                    alert('Failed to load operators for selected division. Please try again.');
                    // Revert to previous division
                    mainDivisionFilter = previousDivision;
                    document.getElementById('mainDivisionFilter').value = previousDivision;
                    return;
                }
            }
            
            // Update the URL with the selected division as a query parameter
            const url = new URL(window.location.href);
            if (mainDivisionFilter && mainDivisionFilter !== 'ALL') {
                url.searchParams.set('division', mainDivisionFilter);
            } else {
                url.searchParams.delete('division');
            }
            window.history.replaceState({}, '', url);
            updateDivisionTitle();
            renderWorkflow();
            updateStats();
            populateAddStatusFields();
            // After initializing this division's workflow, check for auto-advance candidates
            checkAutoAdvanceOnInit();
        }

        // Handle main client filter change
        function handleMainClientFilter() {
            const dropdown = document.getElementById('mainClientFilter');
            if (!dropdown) {
                console.error('mainClientFilter dropdown not found');
                return;
            }
            
            mainClientFilter = dropdown.value;
            
            // Empty string means "All Clients" - treat as no filter
            if (mainClientFilter === '') {
                mainClientFilter = null;
            }
            
            const selectedClient = clients.find(c => c.Id === mainClientFilter || c.ID === mainClientFilter);
            
            // Update the URL with the selected client as a query parameter
            const url = new URL(window.location.href);
            if (mainClientFilter) {
                url.searchParams.set('client', mainClientFilter);
            } else {
                url.searchParams.delete('client');
            }
            window.history.replaceState({}, '', url);
            
            // Update division filter to show only relevant divisions
            populateMainDivisionFilter();
            
            // Force re-initialize workflow with client filter
            // This ensures StatusTypes are re-filtered from scratch
            if (mainDivisionFilter !== 'ALL' || mainClientFilter) {
                initializeDynamicWorkflow();
            } else {
                currentWorkflow = [...idealFlow];
            }
            
            // Render and update stats
            renderWorkflow();
            updateStats();
            populateAddStatusFields();
        }

        // Add event listener to populate Add Status fields when accordion is opened

        document.addEventListener('DOMContentLoaded', function() {
            // Only add Status Accordion event here
            const addStatusAccordion = document.getElementById('addStatusAccordion');
            if (addStatusAccordion) {
                addStatusAccordion.addEventListener('show.bs.collapse', function() {
                    populateAddStatusFields();
                });
            }
        });

        // Show certification details panel
        async function showCertDetails(certName, statusName) {
            const panel = document.getElementById('detailsPanel');
            const title = document.getElementById('detailsTitle');
            const subtitle = document.getElementById('detailsSubtitle');
            const content = document.getElementById('detailsContent');
            
            title.textContent = certName;
            subtitle.textContent = `Viewing details for this certification`;
            
            // Show loading state
            content.innerHTML = '<div style="padding: 20px; text-align: center; color: #94a3b8;">Loading...</div>';
            panel.classList.add('open');
            
            // Fetch the partial view from server
            try {
                const response = await fetch(`/Requirements/RenderCertDetails?certName=${encodeURIComponent(certName)}&division=${encodeURIComponent(mainDivisionFilter)}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const html = await response.text();
                content.innerHTML = html;
            } catch (error) {
                console.error('Error loading cert details:', error);
                content.innerHTML = '<div style="padding: 20px; color: #fa5c7c;">Failed to load certification details</div>';
            }
        }

        function closeDetailsPanel() {
            document.getElementById('detailsPanel').classList.remove('open');
        }

        // Check for auto-advance candidates for the current division and show modal
        async function checkAutoAdvanceOnInit() {
            if (!mainDivisionFilter || mainDivisionFilter === 'ALL') {
                return;
            }

            try {
                let url = `/Requirements/GetAutoAdvanceCandidates?divisionId=${encodeURIComponent(mainDivisionFilter)}`;
                if (mainClientFilter) {
                    url += `&clientId=${encodeURIComponent(mainClientFilter)}`;
                }

                const response = await fetch(url);
                if (!response.ok) {
                    return;
                }

                const candidates = await response.json();
                if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
                    return;
                }

                const body = document.getElementById('autoAdvanceModalBody');
                if (!body) return;

                let html = '';
                html += `<p style="margin-bottom: 10px;">The following operators have all required certifications for an auto-advance status in division <strong>${mainDivisionFilter}</strong>.</p>`;
                html += '<div class="table-responsive">';
                html += '<table class="table table-sm align-middle mb-0">';
                html += '<thead><tr>' +
                    '<th>Operator</th>' +
                    '<th>Current Status</th>' +
                    '<th>Next Status</th>' +
                    '<th style="width: 1%; white-space: nowrap;">Action</th>' +
                    '</tr></thead><tbody>';

                candidates.forEach((c, idx) => {
                    const opName = c.OperatorName || c.operatorName || 'Unknown';
                    const currentStatus = c.CurrentStatusName || c.currentStatusName || '';
                    const nextStatus = c.NextStatusName || c.nextStatusName || '';
                    const nextStatusId = c.NextStatusId || c.nextStatusId || '';
                    const nextOrderId = c.NextOrderId || c.nextOrderId || '';
                    const opId = c.OperatorId || c.operatorId || '';
                    html += `<tr>` +
                        `<td>${opName}</td>` +
                        `<td>${currentStatus}</td>` +
                        `<td>${nextStatus}</td>` +
                        `<td>` +
                        `<button type="button" class="btn btn-sm btn-success" ` +
                        `onclick="autoMoveOperatorToNextStatus('${opId}','${nextStatusId}','${nextStatus}','${nextOrderId}', this)">` +
                        `Move to next status` +
                        `</button>` +
                        `</td>` +
                        `</tr>`;
                });

                html += '</tbody></table></div>';
                body.innerHTML = html;

                const modalEl = document.getElementById('autoAdvanceModal');
                if (modalEl) {
                    if (window.bootstrap && window.bootstrap.Modal) {
                        const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
                        modal.show();
                    } else if (typeof $ !== 'undefined' && $(modalEl).modal) {
                        $(modalEl).modal('show');
                    } else {
                        modalEl.style.display = 'block';
                    }
                }
            } catch (err) {
                console.error('Error checking auto-advance candidates:', err);
            }
        }

        // Bulk add certification to multiple statuses
        function showBulkAddModal() {
            const certName = prompt('Enter certification name to add to multiple statuses:');
            if (!certName) return;
            
            const statusesToAdd = prompt(
                `Add "${certName}" to which statuses? (comma-separated, or "all")\n\nAvailable: ${currentWorkflow.map(s => s.status).join(', ')}`
            );
            
            if (!statusesToAdd) return;
            
            let targetStatuses = [];
            if (statusesToAdd.toLowerCase() === 'all') {
                targetStatuses = currentWorkflow.map(s => s.status);
            } else {
                targetStatuses = statusesToAdd.split(',').map(s => s.trim());
            }
            
            let addedCount = 0;
            targetStatuses.forEach(statusName => {
                if (currentWorkflow.find(s => s.status === statusName)) {
                    addCertToStatus(statusName, certName);
                    addedCount++;
                }
            });
            
            alert(`Added "${certName}" to ${addedCount} status${addedCount !== 1 ? 'es' : ''}`);
            renderWorkflow();
            markUnsaved();
        }

        // Export as CSV
        // Generates an Excel-friendly layout with a clear table per division
        // (based on the currently queried workflow only).
        function exportAsCSV() {
            function esc(value) {
                if (value === null || value === undefined) return '';
                const s = String(value).replace(/"/g, '""');
                return `"${s}"`;
            }

            const lines = [];
            const today = new Date().toISOString().split('T')[0];

            const statusTypesArr = window.statusTypes || [];
            const pizzaStatusesArr = window.pizzaStatuses || [];
            const pizzaStatusMap = {};
            pizzaStatusesArr.forEach(p => {
                const id = p.ID || p.Id || p.id;
                if (id) {
                    pizzaStatusMap[id] = p;
                }
            });

            // Group current workflow steps by division based on the underlying StatusType
            const byDivision = new Map();
            currentWorkflow.forEach(step => {
                const st = step.originalObj || {};
                const divisionId = st.DivisionID || st.DivisionId || st.divisionId || st.divisionID || mainDivisionFilter || 'ALL';
                if (!byDivision.has(divisionId)) {
                    byDivision.set(divisionId, []);
                }
                byDivision.get(divisionId).push(step);
            });

            const divisionIds = Array.from(byDivision.keys());
            divisionIds.forEach((divisionId, idx) => {
                const steps = byDivision.get(divisionId) || [];
                if (!steps.length) return;

                // Section header
                lines.push(`Division,${esc(divisionId)}`);
                // Table header
                lines.push('Status,Order,Pizza Status,PizzaStatusId,Required Certification');

                // Ensure steps are ordered by their current step field
                steps
                    .slice()
                    .sort((a, b) => (a.step || 0) - (b.step || 0))
                    .forEach(step => {
                        const st = step.originalObj || {};
                        const pizzaStatusId = st.PizzaStatusID || st.PizzaStatusId || st.pizzaStatusId || st.pizzaStatusID || null;
                        const ps = pizzaStatusId ? pizzaStatusMap[pizzaStatusId] : null;
                        const pizzaStatusName = ps ? (ps.Status || ps.status || ps.Name || ps.name || '') : '';

                        const allCerts = getRequiredCertsForStatus(step.status, pizzaStatusId) || [];

                        if (allCerts.length === 0) {
                            lines.push([
                                esc(step.status),
                                esc(step.step),
                                esc(pizzaStatusName),
                                esc(pizzaStatusId || ''),
                                ''
                            ].join(','));
                        } else {
                            allCerts.forEach(cert => {
                                lines.push([
                                    esc(step.status),
                                    esc(step.step),
                                    esc(pizzaStatusName),
                                    esc(pizzaStatusId || ''),
                                    esc(cert)
                                ].join(','));
                            });
                        }
                    });

                // Blank line between divisions
                if (idx < divisionIds.length - 1) {
                    lines.push('');
                }
            });

            const csv = lines.join('\n');
            downloadFile(`operator_lifecycle_requirements_${today}.csv`, csv, 'text/csv');
            closeExportModal();
        }

        // Export compliance report
        function exportComplianceReport() {
            let report = '=== OPERATOR LIFECYCLE COMPLIANCE REPORT ===\n';
            report += `Generated: ${new Date().toLocaleString()}\n\n`;
            report += `Total Operators: ${operators.length}\n`;
            report += `Total Statuses: ${currentWorkflow.length}\n\n`;
            
            report += '=== STATUS BREAKDOWN ===\n\n';
            currentWorkflow.forEach(step => {
                const pizzaStatusId = step.originalObj ? step.originalObj.PizzaStatusID : null;
                const operatorsInStep = operators.filter(op => 
                    op.Status === step.status || 
                    (op.Status && op.Status.toUpperCase() === step.status.toUpperCase())                );
                const allCerts = getRequiredCertsForStatus(step.status, pizzaStatusId);
                const validCount = operatorsInStep.filter(op => {
                    return allCerts.every(cert => 
                        op.certifications?.some(c => certNamesMatch(c.CertType, cert))
                    );
                }).length;
                
                report += `${step.status} (Step: ${step.step})\n`;
                report += `  Required Certs: ${allCerts.length}\n`;
                report += `  Operators in Status: ${operatorsInStep.length}\n`;
                report += `  Fully Compliant: ${validCount} (${((validCount/Math.max(operatorsInStep.length, 1))*100).toFixed(1)}%)\n`;
                report += `  Certifications:\n`;
                allCerts.forEach(cert => {
                    const withCert = operatorsInStep.filter(op => 
                        op.certifications?.some(c => certNamesMatch(c.CertType, cert))
                    ).length;
                    report += `    - ${cert}: ${withCert}/${operatorsInStep.length} (${((withCert/Math.max(operatorsInStep.length,1))*100).toFixed(1)}%)\n`;
                });
                report += '\n';
            });
            
            downloadFile(`compliance_report_${new Date().toISOString().split('T')[0]}.txt`, report, 'text/plain');
            closeExportModal();
        }

        // Export bottleneck analysis
        function exportBottleneckAnalysis() {
            let report = '=== OPERATOR LIFECYCLE BOTTLENECK ANALYSIS ===\n';
            report += `Generated: ${new Date().toISOString()}\n\n`;
            
            // Find statuses with lowest compliance
            const statusCompliance = currentWorkflow.map(step => {
                const pizzaStatusId = step.originalObj ? step.originalObj.PizzaStatusID : null;
                const operatorsInStep = operators.filter(op => 
                    op.Status === step.status || 
                    (op.Status && op.Status.toUpperCase() === step.status.toUpperCase())
                );
                const allCerts = getRequiredCertsForStatus(step.status, pizzaStatusId);
                const validCount = operatorsInStep.filter(op => {
                    return allCerts.every(cert => 
                        op.certifications?.some(c => certNamesMatch(c.CertType, cert))
                    );
                }).length;
                return {
                    status: step.status,
                    compliance: (validCount / Math.max(operatorsInStep.length, 1)) * 100,
                    operatorCount: operatorsInStep.length,
                    certCount: allCerts.length
                };
            }).sort((a, b) => a.compliance - b.compliance);
            
            report += '=== TOP 5 BOTTLENECK STATUSES ===\n\n';
            statusCompliance.slice(0, 5).forEach((status, idx) => {
                report += `${idx + 1}. ${status.status}\n`;
                report += `   Compliance: ${status.compliance.toFixed(1)}%\n`;
                report += `   Operators: ${status.operatorCount}\n`;
                report += `   Required Certs: ${status.certCount}\n\n`;
            });
            
            // Find most problematic certs
            const certCompliance = {};
            currentWorkflow.forEach(step => {
                const pizzaStatusId = step.originalObj ? step.originalObj.PizzaStatusID : null;
                const allCerts = getRequiredCertsForStatus(step.status, pizzaStatusId);
                const operatorsInStep = operators.filter(op => 
                    op.Status === step.status || 
                    (op.Status && op.Status.toUpperCase() === step.status.toUpperCase())
                );
                allCerts.forEach(cert => {
                    if (!certCompliance[cert]) {
                        certCompliance[cert] = { total: 0, with: 0, statuses: [] };
                    }
                    certCompliance[cert].total += operatorsInStep.length;
                    certCompliance[cert].with += operatorsInStep.filter(op => 
                        op.certifications?.some(c => certNamesMatch(c.CertType, cert))
                    ).length;
                    certCompliance[cert].statuses.push(step.status);
                });
            });
            
            const certArray = Object.entries(certCompliance).map(([cert, data]) => ({
                cert,
                compliance: (data.with / Math.max(data.total, 1)) * 100,
                statuses: data.statuses.length
            })).sort((a, b) => a.compliance - b.compliance);
            
            report += '\n=== TOP 10 PROBLEMATIC CERTIFICATIONS ===\n\n';
            certArray.slice(0, 10).forEach((cert, idx) => {
                report += `${idx + 1}. ${cert.cert}\n`;
                report += `   Compliance: ${cert.compliance.toFixed(1)}%\n`;
                report += `   Used in ${cert.statuses} status${cert.statuses !== 1 ? 'es' : ''}\n\n`;
            });
            
            downloadFile(`bottleneck_analysis_${new Date().toISOString().split('T')[0]}.txt`, report, 'text/plain');
            closeExportModal();
        }

        // Export JSON backup
        function exportJSON() {
            const backup = {
                exportDate: new Date().toISOString(),
                workflow: currentWorkflow,
                requirements: certRequirements,
                operators: operators,
                stats: {
                    totalOperators: operators.length,
                    totalStatuses: currentWorkflow.length,
                    totalCertifications: allExistingCerts.length
                }
            };
            
            downloadFile(
                `lifecycle_backup_${new Date().toISOString().split('T')[0]}.json`,
                JSON.stringify(backup, null, 2),
                'application/json'
            );
            closeExportModal();
        }

        // Show certification analytics
        function showCertAnalytics() {
            const certStats = {};
            
            currentWorkflow.forEach(step => {
                const pizzaStatusId = step.originalObj ? step.originalObj.PizzaStatusID : null;
                const allCerts = getRequiredCertsForStatus(step.status, pizzaStatusId);
                const operatorsInStep = operators.filter(op => 
                    op.Status === step.status || 
                    (op.Status && op.Status.toUpperCase() === step.status.toUpperCase())
                );
                allCerts.forEach(cert => {
                    if (!certStats[cert]) {
                        certStats[cert] = {
                            statuses: [],
                            totalRequired: 0,
                            totalWith: 0
                        };
                    }
                    certStats[cert].statuses.push(step.status);
                    certStats[cert].totalRequired += operatorsInStep.length;
                    certStats[cert].totalWith += operatorsInStep.filter(op => 
                        op.certifications?.some(c => certNamesMatch(c.CertType, cert))
                    ).length;
                });
            });
            
            const sortedCerts = Object.entries(certStats)
                .map(([cert, data]) => ({
                    cert,
                    compliance: (data.totalWith / Math.max(data.totalRequired, 1) * 100).toFixed(1),
                    statuses: data.statuses.length,
                    totalWith: data.totalWith,
                    totalRequired: data.totalRequired
                }))
                .sort((a, b) => b.statuses - a.statuses);
            
            let report = '=== CERTIFICATION ANALYTICS ===\n\n';
            report += `Most Used Certifications:\n\n`;
            sortedCerts.slice(0, 15).forEach((cert, idx) => {
                report += `${idx + 1}. ${cert.cert}\n`;
                report += `   Used in: ${cert.statuses} statuses\n`;
                report += `   Compliance: ${cert.compliance}% (${cert.totalWith}/${cert.totalRequired})\n\n`;
            });
            
            alert(report);
        }

        // Clear all certifications
        function confirmClearAll() {
            if (confirm('⚠️ WARNING: This will remove ALL certifications from ALL statuses.\n\nAre you sure you want to continue?')) {
                Object.values(certRequirements).forEach(statusData => {
                    const divisions = statusData.divisions || {};
                    Object.values(divisions).forEach(divData => {
                        divData.required = [];
                        divData.common = [];
                        divData.optional = [];
                    });
                });
                renderWorkflow();
                markUnsaved();
                alert('All certifications have been cleared.');
            }
        }

        // Helper function to download files
        function downloadFile(filename, content, mimeType) {
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        function showExportModal() {
            document.getElementById('exportModal').classList.add('open');
        }

        function closeExportModal() {
            document.getElementById('exportModal').classList.remove('open');
        }

        // Show operator profile modal
        async function showOperatorProfile(operatorId) {
            const operator = operators.find(op => op.ID === operatorId);
            if (!operator) {
                alert('Operator not found');
                return;
            }

            const modal = document.getElementById('operatorModal');
            const nameEl = document.getElementById('operatorModalName');
            const subtitleEl = document.getElementById('operatorModalSubtitle');
            const bodyEl = document.getElementById('operatorModalBody');

            // Load content from server (including header data)
            bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading...</div>';
            
            try {
                const response = await fetch(`/Requirements/RenderOperatorProfile?operatorId=${encodeURIComponent(operatorId)}`);
                if (!response.ok) {
                    throw new Error(`Failed to load operator profile: ${response.status}`);
                }
                const html = await response.text();
                bodyEl.innerHTML = html;
                
                // Extract header data from server-rendered content and enhance with days calculation
                const headerData = bodyEl.querySelector('.modal-header-data');
                if (headerData) {
                    nameEl.textContent = headerData.dataset.operatorName || `${operator.FirstName} ${operator.LastName}`;
                    
                    // Get base subtitle from server
                    let subtitle = headerData.dataset.subtitle || '';
                    
                    // Calculate days in status client-side and append
                    const daysInStatus = getOperatorDaysInStatus(operatorId);
                    
                    if (daysInStatus !== null) {
                        subtitle += ` \u2022 ${daysInStatus} days in status`;
                        if (daysInStatus >= 30) {
                            subtitle += ' \u26a0\ufe0f OVERDUE';
                            subtitleEl.style.color = '#dc3545';
                            subtitleEl.style.fontWeight = '600';
                        } else {
                            subtitleEl.style.color = '';
                            subtitleEl.style.fontWeight = '';
                        }
                        
                        // Update the "Days in Status" stat in modal body
                        const daysStatValue = bodyEl.querySelector('.summary-stat .summary-value.days');
                        if (daysStatValue) {
                            const overdueWarning = daysInStatus >= 30 ? 
                                '<span style="color: #ef4444; font-weight: bold; margin-left: 8px;">⚠️ OVERDUE</span>' : '';
                            daysStatValue.innerHTML = `<span>${daysInStatus} days</span>${overdueWarning}`;
                        }
                    }
                    
                    subtitleEl.textContent = subtitle;
                }
            } catch (error) {
                console.error('Error loading operator profile:', error);
                bodyEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">Failed to load operator profile</div>';
            }

            modal.classList.add('open');
        }

        function closeOperatorModal() {
            document.getElementById('operatorModal').classList.remove('open');
        }


        function handleStatusSelectChange() {
            // Auto-select corresponding Pizza Mapping if name matches
            const statusNameSelect = document.getElementById('addStatusNameSelect');
            if (!statusNameSelect) return;
            const statusName = statusNameSelect.value;
            if (!statusName) return;
            // Simple fuzzy match attempt
            const select = document.getElementById('addStatusPizzaMapping');
            if (!select) return;
            for(let i=0; i<select.options.length; i++) {
                if (select.options[i].text.toUpperCase() === statusName.toUpperCase()) {
                    select.selectedIndex = i;
                    break;
                }
            }
        }

        function confirmAddStatus() {


            try {
                const divisionInput = document.getElementById('addStatusDivision');
                const statusNameInput = document.getElementById('addStatusNameSelect');
                const targetOrderInput = document.getElementById('addStatusPosition');
                const pizzaStatusInput = document.getElementById('pizzaStatusesDropdown');

                if (!divisionInput || !statusNameInput || !targetOrderInput || !pizzaStatusInput) {
                    alert('A required field is missing in the Add Status form.');
                    console.error('[AddStatus] One or more DOM elements are null');
                    return;
                }

                const division = divisionInput.value;
                const statusName = statusNameInput.value;
                const targetOrder = parseInt(targetOrderInput.value);
                const pizzaStatusId = pizzaStatusInput.value;

                if (!statusName) {
                    alert('Please select a Status Name.');
                    console.error('[AddStatus] Status Name missing');
                    return;
                }
                if (!targetOrder || isNaN(targetOrder)) {
                    alert('Please select a valid Insert Position.');
                    console.error('[AddStatus] Insert Position missing or invalid');
                    return;
                }
                if (!pizzaStatusId) {
                    alert('Please select a Pizza Status Mapping.');
                    console.error('[AddStatus] Pizza Status Mapping missing');
                    return;
                }

                // 1. Shift existing orders DOWN
                let shiftedCountDown = 0;
                statusTypes.forEach(st => {
                    if (st.DivisionID === division && 
                        !(st.isDeleted === true || st.IsDelete === true) && 
                        st.Status !== statusName) { // Don't shift the one we are about to update if it exists
                        const currentOrd = parseInt(st.OrderID) || 0;
                        if (currentOrd >= targetOrder) {
                            st.OrderID = (currentOrd + 1).toString();
                            if (st.ID) modifiedStatusTypeIds.add(st.ID);  // Track modified
                            shiftedCountDown++;
                        }
                    }
                });

                // 2. Find or Create StatusType Record
                let stRecord = statusTypes.find(st => st.DivisionID === division && st.Status === statusName);
                let wasDeleted = false;
                if (stRecord) {
                    // If status was deleted, mark as restored and always update all key fields
                    wasDeleted = (stRecord.isDeleted === true || stRecord.IsDelete === true || String(stRecord.isDeleted) === 'true');
                    stRecord.isDeleted = false;
                    stRecord.IsDelete = false;
                    stRecord.OrderID = targetOrder.toString();
                    stRecord.PizzaStatusID = pizzaStatusId;
                    // Defensive: update Description and RecordAt if missing
                    if (!stRecord.Description) stRecord.Description = statusName;
                    if (!stRecord.RecordAt) stRecord.RecordAt = new Date().toISOString();
                    if (stRecord.ID) modifiedStatusTypeIds.add(stRecord.ID);  // Track modified
                } else {
                    const newId = crypto.randomUUID ? crypto.randomUUID() : 'NEW-' + Math.random().toString(36).substr(2,9);
                    stRecord = {
                        ID: newId,
                        Id: newId,
                        Status: statusName,
                        DivisionID: division,
                        OrderID: targetOrder.toString(),
                        isDeleted: false,
                        IsDelete: false,
                        PizzaStatusID: pizzaStatusId,
                        Description: statusName,
                        RecordAt: new Date().toISOString(),
                        __IMTINDEX__: 0
                    };
                    statusTypes.push(stRecord);
                    modifiedStatusTypeIds.add(newId);  // Track new item
                }

                // 3. Update Pizza Status Mapping (REMOVED: pizzaStatusRequirements is deprecated)
                // No longer updating pizzaStatusRequirements. All status assignment logic is handled via statusTypes and certTypes only.

                // Shift OrderID for all statuses at or after the new one (except the one just added/restored)
                let shiftedCountUp = 0;
                statusTypes.forEach(st => {
                    if (st.DivisionID === division && st.Status !== statusName) {
                        const currentOrd = parseInt(st.OrderID) || 0;
                        if (currentOrd >= targetOrder) {
                            st.OrderID = (currentOrd + 1).toString();
                            if (st.ID) modifiedStatusTypeIds.add(st.ID);  // Track modified
                            shiftedCountUp++;
                        }
                    }
                });

                // Mark as unsaved so Save Changes appears
                markUnsaved();

                // Visual feedback - Inject into currentWorkflow view
                const newStepObj = {
                    step: targetOrder,
                    status: statusName,
                    statusId: stRecord.Id || stRecord.ID || null
                };

                // Remove previous occurrence if existed (e.g. at other position)
                const existIdx = currentWorkflow.findIndex(s => s.status === statusName);
                if (existIdx !== -1) {
                    currentWorkflow.splice(existIdx, 1);
                }

                // Insert at correct index
                const insertIdx = targetOrder - 1;
                currentWorkflow.splice(insertIdx, 0, newStepObj);

                // Re-number steps
                currentWorkflow.forEach((step, idx) => {
                    step.step = idx + 1;
                });

                renderWorkflow();

                let msg = `Added status "${statusName}" at Step ${targetOrder}.`;
                if (wasDeleted) {
                    msg += `\n\nNote: This status was previously deleted and has now been restored.`;
                }
                msg += `\n\nPlease click "Save Changes" to persist this to the database.`;
                alert(msg);
            } catch (err) {
                alert('An error occurred in confirmAddStatus. See console for details.');
                console.error('[AddStatus] Exception:', err);
                return;
            }
        }

        // Initialize on page load
        window.addEventListener('DOMContentLoaded', loadData);

        // Fallback: Attach Add Status button handler globally in case inline onclick fails
        document.addEventListener('click', function(e) {
            // Log all clicks for debugging
            // (Removed global Add Status button handler and alert)
        });

        // Log all clicks on elements that could trigger the Add Status modal
        document.addEventListener('click', function(e) {
            // Log all clicks for debugging
            if (e.target && e.target.closest('.bulk-btn, .add-status-btn, .btn-add-status')) {
            }
        });

        function populateAddStatusFields() {
            // Division field
            const divisionInput = document.getElementById('addStatusDivision');
            if (divisionInput) {
                divisionInput.value = mainDivisionFilter !== 'ALL' ? mainDivisionFilter : '';
            }

            // Status Name dropdown
            const statusNameSelect = document.getElementById('addStatusNameSelect');
            if (statusNameSelect) {
                statusNameSelect.innerHTML = '';
                // Ensure statusTypes and pizzaStatuses are loaded
                const statusTypesArr = window.statusTypes || [];
                const pizzaStatusesArr = window.pizzaStatuses || [];
                const pizzaStatusMap = {};
                pizzaStatusesArr.forEach(p => { if (p.ID) pizzaStatusMap[p.ID] = p; });

                // Filter for operator statuses in the selected division, deleted only
                const operatorStatuses = statusTypesArr.filter(st => {
                    return (
                        st.DivisionID === mainDivisionFilter &&
                        (st.isDeleted === true || st.IsDelete === true || String(st.isDeleted).trim() === '1' || String(st.IsDelete).trim() === '1' || String(st.isDeleted).trim().toLowerCase() === 'true' || String(st.IsDelete).trim().toLowerCase() === 'true') &&
                        st.PizzaStatusID &&
                        pizzaStatusMap[st.PizzaStatusID] &&
                        (String(st.isActive || '1').trim() === '1' || st.isActive === true) &&
                        pizzaStatusMap[st.PizzaStatusID].IsOperator === true
                    );
                });

                // Get unique status names
                const uniqueStatuses = Array.from(new Set(operatorStatuses.map(st => st.Status))).sort();
                uniqueStatuses.forEach(status => {
                    const opt = document.createElement('option');
                    opt.value = status;
                    opt.textContent = status;
                    statusNameSelect.appendChild(opt);
                });
            }

            // Insert Position dropdown
            const positionSelect = document.getElementById('addStatusPosition');
            if (positionSelect) {
                positionSelect.innerHTML = '';
                // Get number of statuses for this division
                const count = (window.statusTypes || []).filter(st => st.DivisionID === mainDivisionFilter && !(st.isDeleted === true || st.IsDelete === true)).length;
                for (let i = 1; i <= count + 1; i++) {
                    const opt = document.createElement('option');
                    opt.value = i;
                    opt.textContent = i;
                    positionSelect.appendChild(opt);
                }
            }

            // Pizza Statuses dropdown
            const pizzaStatusesSelect = document.getElementById('pizzaStatusesDropdown');
            if (pizzaStatusesSelect && window.pizzaStatuses) {
                pizzaStatusesSelect.innerHTML = '';
                window.pizzaStatuses
                    .filter(ps => {
                        // Only IsOperator true and IsProvider false or null
                        const isOperator = ps.IsOperator === true || ps.IsOperator === 'true' || String(ps.IsOperator).trim() === '1';
                        const isProvider = ps.IsProvider === true || ps.IsProvider === 'true' || String(ps.IsProvider).trim() === '1';
                        const operatorProviderMatch = isOperator && (!isProvider || ps.IsProvider === null || ps.IsProvider === undefined || ps.IsProvider === '' || ps.IsProvider === false || ps.IsProvider === 'false');
                        
                        // Filter by selected client if one is chosen
                        if (mainClientFilter) {
                            const psClientId = ps.ClientID || ps.ClientId || ps.client_id || '';
                            return operatorProviderMatch && psClientId === mainClientFilter;
                        }
                        
                        return operatorProviderMatch;
                    })
                    .sort((a, b) => {
                        // Sort by MobileAppOrder (numeric, fallback to 9999)
                        const orderA = parseInt(a.MobileAppOrder) || 9999;
                        const orderB = parseInt(b.MobileAppOrder) || 9999;
                        return orderA - orderB;
                    })
                    .forEach(ps => {
                        const opt = document.createElement('option');
                        // Show Status in bold, then (ClientID) [ID]
                        const status = ps.Status || '';
                        const clientId = ps.ClientID || ps.ClientId || ps.client_id || '';
                        const pizzaId = ps.ID || ps.PizzaStatusID || '';
                        // Use innerHTML for bold
                        let label = status ? `<b>${status}</b>` : '';
                        if (clientId) label += ` (${clientId})`;
                        if (pizzaId) label += ` [${pizzaId}]`;
                        opt.value = pizzaId;
                        opt.innerHTML = label;
                        pizzaStatusesSelect.appendChild(opt);
                    });
            }
        }

        // Placeholder functions for Create Pizza Status and Create Status modals
        function showCreatePizzaStatusModal() {
            alert('Create Pizza Status modal - TODO: Implement server-side modal\n\nRequired fields:\n- Status Name\n- Description\n- Client ID\n- Is Operator (checkbox)\n- Is Provider (checkbox)\n- Mobile App Order (number)');
        }

        function showCreateStatusModal() {
            alert('Create Status modal - TODO: Implement server-side modal\n\nRequired fields:\n- Status Name\n- Division ID\n- Pizza Status ID (dropdown)\n- Order ID (number)');
        }
