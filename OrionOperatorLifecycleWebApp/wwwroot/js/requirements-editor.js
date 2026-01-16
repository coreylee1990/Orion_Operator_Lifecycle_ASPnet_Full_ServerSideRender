// Show the duplicate cert modal
function showCertDuplicateModal(certName, oldStatus, newStatus, stepIndex) {
    const modalBody = document.getElementById('certDuplicateModalBody');
    if (modalBody) {
        modalBody.innerHTML = `
            <div class="mb-2">The certification <strong>"${certName}"</strong> is already assigned to <strong>${oldStatus}</strong> in this division.</div>
            <div class="mb-2">Do you want to move it to <strong>${newStatus}</strong> instead?</div>
            <div class="alert alert-warning">This will update the assignment and remove it from the previous status.</div>
        `;
    }
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
            console.log('[AddStatus] Add Status button clicked');
            confirmAddStatus();
        });
    }
});

        console.log('🚀 Script loading started');
        
        let operators = [];
        let statusTypes = [];
        let certTypes = [];  // Raw cert types from database
        let certifications = [];  // All certifications from pay_Certifications.json
        let certRequirements = {};
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
        let statusTracker = [];  // Track how long operators have been in each status
        let editedRequirements = {};

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
        
        console.log('✅ Variables declared successfully');
        console.log('   - currentFilter:', currentFilter);
        console.log('   - searchQuery:', searchQuery);

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
            if (!statusTracker || statusTracker.length === 0) return null;
            
            // Find all status tracker records for this operator
            const operatorRecords = statusTracker.filter(st => st.OperatorID === operatorId);
            
            if (operatorRecords.length === 0) return null;
            
            // Find the most recent record (latest date)
            let mostRecent = operatorRecords[0];
            for (const record of operatorRecords) {
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
                    op.DivisionID === division && op.StatusName === status
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
                        console.log(`⚠️ Inferred Pizza ID for ${statusName} (${division}): ${pizzaId}`);
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
            try {
                console.log('🚀 Starting data load...');
                
                // Cache buster to force fresh load
                const cacheBuster = '?v=' + Date.now();
                
                console.log('📥 Fetching operators...');
                // Load operators from API endpoint
                const operatorsResponse = await fetch('/api/data/operators' + cacheBuster);
                if (!operatorsResponse.ok) {
                    throw new Error('Failed to load operators data: ' + operatorsResponse.status);
                }
                operators = await operatorsResponse.json();
                console.log('✅ Operators loaded successfully');
                
                // Load certifications
                console.log('📥 Fetching certifications...');
                const certificationsResponse = await fetch('/api/data/certifications' + cacheBuster);
                if (!certificationsResponse.ok) {
                    throw new Error('Failed to load certifications: ' + certificationsResponse.status);
                }
                const certificationsData = await certificationsResponse.json();
                certifications = certificationsData.certifications || [];
                console.log('✅ Certifications loaded:', certifications.length, 'records');
                
                // Join certifications to operators
                console.log('🔗 Joining certifications to operators...');
                operators.forEach(op => {
                    op.certifications = certifications.filter(cert => cert.OperatorID === op.ID);
                });
                console.log('✅ Certifications joined to operators');
                
                console.log('🔵 Loaded operators:', operators.length);
                const willie = operators.find(op => op.LastName === 'Quainton');
                if (willie) {
                    console.log('🔵 Willie Quainton found!');
                    console.log('  - DivisionID:', willie.DivisionID);
                    console.log('  - StatusName:', willie.StatusName);
                    console.log('  - Certifications:', willie.certifications?.length || 0);
                } else {
                    console.log('❌ Willie Quainton NOT found');
                }

                console.log('📥 Fetching cert types...');
                // Load cert types from API endpoint
                const certTypesResponse = await fetch('/api/data/certtypes' + cacheBuster);
                if (!certTypesResponse.ok) {
                    throw new Error('Failed to load cert types: ' + certTypesResponse.status);
                }
                certTypes = await certTypesResponse.json();
                console.log('✅ Cert types loaded:', certTypes.length, 'certification types');
                
                // Removed pizza status requirements fetch and related logic
                
                // Load status types for mapping
                console.log('📥 Fetching status types...');
                const statusTypesResponse = await fetch('/api/data/statustypes' + cacheBuster);
                if (!statusTypesResponse.ok) {
                    throw new Error('Failed to load status types: ' + statusTypesResponse.status);
                }
                statusTypes = await statusTypesResponse.json();
                // Sync with window.statusTypes so initializeDynamicWorkflow uses the same array
                window.statusTypes = statusTypes;
                console.log('✅ Status types loaded:', statusTypes.length, 'status type mappings');
                
                // Load status tracker for operator duration tracking
                console.log('📥 Fetching status tracker...');
                const statusTrackerResponse = await fetch('/api/data/statustracker' + cacheBuster);
                if (!statusTrackerResponse.ok) {
                    throw new Error('Failed to load status tracker: ' + statusTrackerResponse.status);
                }
                const statusTrackerData = await statusTrackerResponse.json();
                statusTracker = statusTrackerData.statusTracker || [];
                console.log('✅ Status tracker loaded:', statusTracker.length, 'records');
                
                // Removed buildRequirementsFromPizzaStatus and related logic
                
                // Keep a copy of original data for comparison
                // Removed certRequirements and originalCertRequirements logic related to pizzaStatusRequirements

                console.log('🏗️ Building existing certs list...');
                // Build list of all existing certifications
                buildExistingCertsList();
                console.log('✅ Existing certs list built');

                console.log('🎨 Initializing workflow...');
                // Initialize workflow
                // initializeDynamicWorkflow(); // Logic moved to renderWorkflow for reactivity
                currentWorkflow = [...idealFlow];
                
                console.log('🔄 Initializing workflow with', currentWorkflow.length, 'steps');
                console.log('📊 Current workflow:', currentWorkflow);
                console.log('👥 Total operators loaded:', operators.length);
                console.log('🎯 Current filter:', currentFilter);
                console.log('🔍 Search query:', searchQuery);
                
                console.log('🎨 Rendering workflow...');
                renderWorkflow();
                console.log('✅ Workflow rendered');
                
                console.log('📊 Updating stats...');
                updateStats();
                console.log('✅ Stats updated');
                
                console.log('📋 Populating main division filter...');
                populateMainDivisionFilter();
                console.log('✅ Main division filter populated');
                
                console.log('✅ Initialization complete');
            } catch (error) {
                console.error('❌ Error loading data:', error);
                console.error('❌ Error stack:', error.stack);
                console.error('❌ Error message:', error.message);
                alert('Error loading data: ' + error.message + '\nCheck console for details.');
            }
        }

        // Initialize workflow based on Dynamic Status Types
        function initializeDynamicWorkflow() {
            if (mainDivisionFilter === 'ALL') {
                // Use legacy ideal flow as fallback or aggregated view
                currentWorkflow = [...idealFlow];
            } else {
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
                pizzaStatusesArr.forEach(p => { if (p.ID) pizzaStatusMap[p.ID] = p; });

                // Filter StatusTypes for the selected division, matching the script logic
                let divStatuses = statusTypesArr.filter(st => {
                    return (
                        st.DivisionID === mainDivisionFilter &&
                        !(st.isDeleted === true || st.IsDelete === true || String(st.isDeleted).trim() === '1' || String(st.IsDelete).trim() === '1' || String(st.isDeleted).trim().toLowerCase() === 'true' || String(st.IsDelete).trim().toLowerCase() === 'true') &&
                        st.PizzaStatusID &&
                        pizzaStatusMap[st.PizzaStatusID] &&
                        (String(st.isActive || '1').trim() === '1' || st.isActive === true) &&
                        pizzaStatusMap[st.PizzaStatusID].IsOperator === true
                    );
                });

                // Sort by OrderID (as integer, fallback to 9999 if missing)
                divStatuses.sort((a, b) => {
                    const ordA = parseInt(a.OrderID) || 9999;
                    const ordB = parseInt(b.OrderID) || 9999;
                    return ordA - ordB;
                });

                if (divStatuses.length > 0) {
                    currentWorkflow = divStatuses.map((st, idx) => ({
                        step: (parseInt(st.OrderID) || (idx + 1)),
                        status: st.Status,
                        statusId: st.Id || st.ID || null,
                        originalObj: st
                    }));
                } else {
                    // Fallback if no specific configuration found
                    console.warn(`No StatusTypes found for ${mainDivisionFilter}, using default flow.`);
                    currentWorkflow = [...idealFlow];
                }
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

            console.log(`🔄 Reordering: moving index ${index} ${direction > 0 ? 'down' : 'up'} to ${newIndex}`);

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
                    console.log(`   Updated originalObj for ${item.status}: OrderID = ${newOrder}`);
                }
                
                // Also find and update in the global statusTypes array by Status + DivisionID
                const globalStatusType = statusTypes.find(st => 
                    st.Status === item.status && st.DivisionID === mainDivisionFilter
                );
                if (globalStatusType) {
                    globalStatusType.OrderID = newOrder;
                    console.log(`   Updated global statusTypes for ${item.status}: OrderID = ${newOrder}`);
                }
            });
            
            hasUnsavedChanges = true;
            markUnsaved();
            
            // Re-render without calling initializeDynamicWorkflow (which would re-sort)
            renderWorkflowWithoutReinit();
            updateStats();
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
            console.log('🎨 renderWorkflowWithoutReinit() called');
            console.log('   - currentWorkflow length:', currentWorkflow.length);
            
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
                let operatorsInStep = operators.filter(op => 
                    op.StatusName === statusName || 
                    (op.StatusName && op.StatusName.toUpperCase() === statusName.toUpperCase())
                );
                
                if (mainDivisionFilter !== 'ALL') {
                    operatorsInStep = operatorsInStep.filter(op => op.DivisionID === mainDivisionFilter);
                }
                
                const allRequiredCerts = getRequiredCertsForStatus(statusName);
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

            console.log(`🎨 Rendered ${renderedCount} of ${currentWorkflow.length} steps`);
            addDragAndDropListeners();
        }

        // Render the workflow
        function renderWorkflow() {
            // Re-initialize workflow based on current filter state
            // This ensures we see the correct list of statuses for the selected division
            if (mainDivisionFilter !== 'ALL') {
                initializeDynamicWorkflow();
            } else {
                currentWorkflow = [...idealFlow];
            }

            // Check if we accidentally got into legacy "Edit Mode" state and reset it
            if (typeof editMode !== 'undefined' && editMode) {
                 editMode = false;
                 document.querySelector('.control-panel').style.display = 'block';
            }

            console.log('🎨 renderWorkflow() called');
            console.log('   - currentWorkflow length:', currentWorkflow.length);
            console.log('   - currentFilter:', currentFilter);
            console.log('   - searchQuery:', searchQuery);
            
            const container = document.getElementById('workflowSteps');
            console.log('   - container element:', container ? 'Found' : 'NOT FOUND');
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
                let operatorsInStep = operators.filter(op => 
                    op.StatusName === statusName || 
                    (op.StatusName && op.StatusName.toUpperCase() === statusName.toUpperCase())
                );
                
                // Apply division filter
                if (mainDivisionFilter !== 'ALL') {
                    operatorsInStep = operatorsInStep.filter(op => op.DivisionID === mainDivisionFilter);
                }
                
                const allRequiredCerts = getRequiredCertsForStatus(statusName);
                const validation = validateOperatorsInStep(operatorsInStep, allRequiredCerts, index);
                
                console.log(`   Step ${index + 1}: ${statusName} - valid: ${validation.isValid}, operators: ${operatorsInStep.length}, certs: ${allRequiredCerts.length}`);
                
                // Filter logic
                if (currentFilter === 'valid' && !validation.isValid) {
                    console.log(`     ⏭️ Skipping (filter: valid only)`);
                    return;
                }
                if (currentFilter === 'invalid' && validation.isValid) {
                    console.log(`     ⏭️ Skipping (filter: invalid only)`);
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
                        console.log(`     ⏭️ Skipping (no search match)`);
                        return;
                    }
                }
                
                console.log(`     ✅ Rendering step`);
                renderedCount++;
                const stepCard = createStepCard(flowStep, index);
                container.appendChild(stepCard);
                
                // Add drop zone after each card (only for specific division)
                if (mainDivisionFilter !== 'ALL') {
                    container.appendChild(createDropZone(index + 1));
                }
            });


            console.log(`🎨 Rendered ${renderedCount} of ${currentWorkflow.length} steps`);

            // Add drag and drop event listeners
            addDragAndDropListeners();
        }

        // Create a step card
        function createStepCard(flowStep, index) {
            const statusName = flowStep.status;
            let operatorsInStep = operators.filter(op => 
                op.StatusName === statusName || 
                (op.StatusName && op.StatusName.toUpperCase() === statusName.toUpperCase())
            );
            
            // Apply division filter
            if (mainDivisionFilter !== 'ALL') {
                operatorsInStep = operatorsInStep.filter(op => op.DivisionID === mainDivisionFilter);
            }

            // Get required certifications for this status
            const allRequiredCerts = getRequiredCertsForStatus(statusName);
            
            console.log(`\n📋 Step ${index + 1} (${statusName}):`);
            console.log(`   All required certs (${allRequiredCerts.length}):`, allRequiredCerts);
            
            // Get certs from previous steps to exclude (show only in FIRST occurrence)
            const previousCerts = new Set();
            for (let i = 0; i < index; i++) {
                const prevStatus = currentWorkflow[i].status;
                const prevRequiredCerts = getRequiredCertsForStatus(prevStatus);
                console.log(`   Previous step ${i + 1} (${prevStatus}) had:`, prevRequiredCerts);
                prevRequiredCerts.forEach(cert => previousCerts.add(cert));
            }
            
            console.log(`   Total previous certs (${previousCerts.size}):`, Array.from(previousCerts));
            
            // Only show certs that haven't appeared in previous steps (first occurrence only)
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
            
            console.log(`   Certs to display (${certsToDisplay.length}):`, certsToDisplay);
            console.log(`   Cert division map:`, certDivisionMap);
            
            // Check for duplicates or near-duplicates
            const duplicateCheck = allRequiredCerts.filter(cert => 
                previousCerts.has(cert)
            );
            if (duplicateCheck.length > 0) {
                console.log(`   🔄 Filtered out duplicates (${duplicateCheck.length}):`, duplicateCheck);
            }

            // Check if all operators have required certs (cumulative - includes previous steps)
            const validation = validateOperatorsInStep(operatorsInStep, allRequiredCerts, index);

            const card = document.createElement('div');
            card.className = `step-card ${validation.isValid ? 'valid' : 'invalid'}`;
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

            card.innerHTML = `
                <div class="step-header">
                    <div class="step-number">${index + 1}</div>
                    <div class="step-info">
                        <div class="step-title">${statusName}</div>
                        <div class="step-meta">
                            ${!isNaN(flowStep.step) ? `<span>Original Step: ${flowStep.step}</span><span>|</span>` : ''}
                            <span>Division${mainDivisionFilter === 'ALL' ? 's' : ''}: ${divisionsText}</span>
                            <span>|</span>
                            <span>${certsToDisplay.length} New Required Cert${certsToDisplay.length !== 1 ? 's' : ''}</span>
                            ${previousCerts.size > 0 ? `<span>|</span><span style="color: #94a3b8;">${previousCerts.size} from previous steps</span>` : ''}
                        </div>
                    </div>
                    <div class="status-indicator ${validation.isValid ? 'valid' : 'invalid'}">
                        <div class="status-dot"></div>
                        ${validation.isValid ? '✓ Valid' : '⚠ Issues'}
                    </div>
                </div>
                
                <!-- Status Actions -->
                ${mainDivisionFilter !== 'ALL' ? `
                <div style="position: absolute; top: 10px; right: 140px; display: flex; gap: 5px;">
                     <div class="step-reorder-buttons" style="display: flex; flex-direction: column; gap: 2px; margin-right: 10px;">
                        <button class="reorder-btn up" onclick="reorderStep(${index}, -1)" title="Move Up" ${index === 0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'}>
                            ▲
                        </button>
                        <button class="reorder-btn down" onclick="reorderStep(${index}, 1)" title="Move Down" ${index === currentWorkflow.length - 1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"' : 'style="cursor:pointer;"'}>
                            ▼
                        </button>
                    </div>
                    <button class="delete-cert-type-btn" onclick="deleteStatus('${statusName}', '${mainDivisionFilter}')" title="Delete status '${statusName}' from Division ${mainDivisionFilter}">
                        🗑️ Remove Status
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
                                const opStatus = op.StatusName || '';
                                
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
                                    console.log('  OPERATOR:', op.FirstName, op.LastName);
                                    console.log('  - PizzaStatusId:', pizzaStatusId);
                                    console.log('  - Required CertTypes:', requiredCertTypes.length);
                                    console.log('  - Operator Certs:', operatorCerts.length);
                                    console.log('  - COUNTS - valid:', validCount, 'expired:', expiredCount, 'missing:', missingCount);
                                }

                                const total = validCount + expiredCount + missingCount;
                                const validPercent = total > 0 ? (validCount / total * 100) : 0;
                                const expiredPercent = total > 0 ? (expiredCount / total * 100) : 0;
                                const missingPercent = total > 0 ? (missingCount / total * 100) : 0;

                                // Calculate days in current status
                                const daysInStatus = getOperatorDaysInStatus(op.ID);
                                const isOverdue = daysInStatus !== null && daysInStatus >= 30;
                                const daysDisplay = daysInStatus !== null ? 
                                    `<span class="operator-days-in-status ${isOverdue ? 'overdue' : ''}" title="Days in current status">
                                        ${isOverdue ? '⚠️ ' : ''}${daysInStatus}d
                                    </span>` : '';
                                
                                // Cert count display (valid/total)
                                const certCountDisplay = total > 0 ? 
                                    `<span class="operator-cert-count" title="${validCount} valid, ${expiredCount} expired, ${missingCount} missing">${validCount}/${total}</span>` : '';

                                return `
                                    <div class="operator-item ${isOverdue ? 'operator-overdue' : ''}" onclick="showOperatorProfile('${op.ID}')" style="cursor: pointer;" title="${validCount} Valid, ${expiredCount} Expired, ${missingCount} Missing${daysInStatus !== null ? ' | ' + daysInStatus + ' days in status' : ''}">
                                        <div class="operator-name-row">
                                            <span class="operator-name">${op.FirstName} ${op.LastName}</span>
                                            <div class="operator-badges">
                                                ${certCountDisplay}
                                                ${daysDisplay}
                                            </div>
                                        </div>
                                        <div class="operator-progress">
                                            ${total > 0 ? `
                                                ${validPercent > 0 ? `<div class="operator-progress-segment valid" style="width: ${validPercent}%"></div>` : ''}
                                                ${expiredPercent > 0 ? `<div class="operator-progress-segment expired" style="width: ${expiredPercent}%"></div>` : ''}
                                                ${missingPercent > 0 ? `<div class="operator-progress-segment missing" style="width: ${missingPercent}%"></div>` : ''}
                                            ` : '<div class="operator-progress-segment no-data" style="width: 100%"></div>'}
                                        </div>
                                    </div>
                                `;
                            }).join('') : 
                            '<div class="operator-item"><span style="color: #94a3b8;">No operators in this step</span></div>'
                        }
                    </div>
                </div>

                <div class="cert-details">
                    <div class="cert-title">New Required Certifications (${certsToDisplay.length}):</div>
                    <div class="cert-list cert-list-editable drop-zone" data-status="${statusName}" ondrop="handleCertDrop(event, this)" ondragover="handleCertDragOver(event)">
                        ${certsToDisplay.length > 0 ? 
                            certsToDisplay.slice(0, 50).map(cert => {
                                return `
                                    <span class="cert-badge" draggable="true" ondragstart="handleCertDragStart(event, this)" data-cert="${cert}" onclick="showCertDetails('${cert.replace(/'/g, "\\'")}', '${statusName}')" style="cursor: pointer;">
                                        ${cert}
                                        <span class="remove-cert" onclick="event.stopPropagation(); removeCert(event, '${statusName}', '${cert.replace(/'/g, "\\'")}')">×</span>
                                    </span>
                                `;
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

        // Get required certifications for a status (using CertTypes table directly)
        function getRequiredCertsForStatus(statusName) {
            // Find the PizzaStatusID for this status and division
            let pizzaStatusId = null;
            if (statusTypes && Array.isArray(statusTypes)) {
                const st = statusTypes.find(s => s.Status === statusName && s.DivisionID === mainDivisionFilter);
                if (st && st.PizzaStatusID) pizzaStatusId = st.PizzaStatusID;
            }
            const certs = [];
            if (pizzaStatusId) {
                certTypes.forEach(cert => {
                    if (cert.PizzaStatusID === pizzaStatusId && cert.DivisionID === mainDivisionFilter) {
                        certs.push(cert.Certification);
                    }
                });
            }
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
            
            console.log(`Found ${allExistingCerts.length} unique certifications from CertTypes (${certsArray.length} total cert types)`);
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
            console.log(`🔍 Autocomplete filter: editMode=${editMode}, currentFilter='${currentFilter}'`);
            
            // Filter certifications by search term
            let matches = allExistingCerts.filter(cert => 
                cert.name.toLowerCase().includes(value)
            );
            
            console.log(`   Found ${matches.length} matches for search term '${value}'`);
            
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
                console.log(`   After division filter '${currentFilter}': ${matches.length} matches (was ${beforeCount})`);
                if (matches.length > 0 && matches.length <= 3) {
                    console.log(`   Sample matches:`, matches.map(m => `${m.name} [${m.divisions.join(', ')}]`));
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
                    
                    // Filter excluded divisions from display
                    displayDivisions = displayDivisions.filter(d => !EXCLUDED_DIVISIONS.some(ex => d.toUpperCase().includes(ex.toUpperCase())));
                    
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

        // Handle focus on input
        function handleCertFocus(event, stepIndex) {
            const input = event.target;
            if (input.value.trim()) {
                handleCertInput(event, stepIndex);
            }
        }

        // Handle blur on input
        function handleCertBlur(event, stepIndex) {
            // Delay to allow click on dropdown item
            setTimeout(() => {
                const dropdown = document.getElementById(`autocomplete_${stepIndex}`);
                dropdown.classList.remove('active');
                currentAutocompleteIndex = -1;
            }, 200);
        }

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
                const prevRequiredCerts = getRequiredCertsForStatus(prevStatus);
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
        }

        function handleDragEnd(e) {
            this.classList.remove('dragging');
            
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

        function handleDropZoneDragEnter(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        }

        function handleDropZoneDragLeave(e) {
            this.classList.remove('drag-over');
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
                console.log(`🔄 Drag-drop: moving index ${draggedIndex} to position ${targetIndex}`);
                
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

        // Update statistics
        function updateStats() {
            let validSteps = 0;
            let invalidSteps = 0;

            currentWorkflow.forEach((flowStep, index) => {
                const statusName = flowStep.status;
                const operatorsInStep = operators.filter(op => 
                    op.StatusName === statusName || 
                    (op.StatusName && op.StatusName.toUpperCase() === statusName.toUpperCase())
                );

                const requiredCerts = getRequiredCertsForStatus(statusName);
                const validation = validateOperatorsInStep(operatorsInStep, requiredCerts, index);

                if (validation.isValid) {
                    validSteps++;
                } else {
                    invalidSteps++;
                }
            });

            const complianceRate = currentWorkflow.length > 0 ? 
                Math.round((validSteps / currentWorkflow.length) * 100) : 0;

            document.getElementById('totalOperators').textContent = operators.length;
            document.getElementById('validSteps').textContent = validSteps;
            document.getElementById('invalidSteps').textContent = invalidSteps;
            document.getElementById('complianceRate').textContent = `${complianceRate}%`;
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
                const operatorsInStep = operators.filter(op => 
                    op.StatusName === statusName || 
                    (op.StatusName && op.StatusName.toUpperCase() === statusName.toUpperCase())
                );

                const requiredCerts = getRequiredCertsForStatus(statusName);
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
                    console.log(`[DND] Duplicate cert detected: ${certName} already assigned to ${oldStatus} (PizzaStatusID mismatch)`);
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
    // Check if it already exists
    const exists = certTypes.some(ct =>
        normalizeCertName(ct.Certification) === normalizeCertName(certName) &&
        ct.PizzaStatusID === pizzaStatusId &&
        ct.DivisionID === mainDivisionFilter
    );
    if (!exists) {
        certTypes.push({
            Certification: certName,
            PizzaStatusID: pizzaStatusId,
            DivisionID: mainDivisionFilter,
            CertificationType: 'Added in Session',
            CertificationID: 'TEMP-' + Math.random().toString(36).substr(2, 9)
        });
        console.log(`   ✅ Added new certType: ${certName} for status ${statusName} in division ${mainDivisionFilter}`);
    } else {
        console.log(`   ⚠️ CertType already exists: ${certName} for status ${statusName} in division ${mainDivisionFilter}`);
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
            updatedCount++;
        }
    });
    console.log(`   ✂️ Unlinked ${updatedCount} entries in CertTypes (PizzaStatusID = null)`);
}

        // Delete entire status from a division
        function deleteStatus(statusName, divisionId) {
            if (!confirm(`⚠️ Are you sure you want to remove "${statusName}" from Division ${divisionId}?\n\nThis will:\n1. Mark this status as deleted for this division\n2. Shift all subsequent statuses UP one step`)) {
                return;
            }

            console.log(`🗑️ Deleting status ${statusName} for division ${divisionId}`);

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
            statusRecord.IsDelete = true; // Handle potential schema inconsistencies
            const deletedOrderId = parseInt(statusRecord.OrderID);
            console.log(`   - Marked ID ${statusRecord.Id} as deleted (Order: ${deletedOrderId})`);

            // 3. Find other statuses in this division and shift OrderID
            let shiftedCount = 0;
            statusTypes.forEach(st => {
                if (st.DivisionID === divisionId && st.Status !== statusName) {
                    const currentOrder = parseInt(st.OrderID);
                    if (!isNaN(currentOrder) && currentOrder > deletedOrderId) {
                        st.OrderID = (currentOrder - 1).toString();
                        shiftedCount++;
                    }
                }
            });
            console.log(`   - Shifted ${shiftedCount} subsequent statuses up`);

            // 4. Force UI refresh
            markUnsaved();
            
            // Re-infer workflow from new status data? 
            // Currently idealFlow is static, so we might need a page reload to see effect fully, 
            // or we manually remove it from current view.
            alert('Status marked for removal. Please click "Save Changes" to apply.');
            
            // Reload page suggestion?
            // For now, let's just save.
        }

        // Mark as having unsaved changes
        function markUnsaved() {
            hasUnsavedChanges = true;
            const unsavedIndicator = document.getElementById('unsavedIndicator');
            const saveBtn = document.getElementById('saveBtn');
            console.log('[markUnsaved] called. Save button and unsaved indicator should be visible.');
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

            let saveLog = '';
            let saveSuccess = true;

            try {
                // Save cert types
                const cleanCertTypes = certTypes.map(ct => ({ ...ct }));
                const responseCertTypes = await fetch('/api/data/certtypes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanCertTypes, null, 4)
                });
                if (responseCertTypes.ok) {
                    saveLog += '✓ Cert types saved successfully.\n';
                } else {
                    saveLog += `✗ Failed to save cert types: ${responseCertTypes.status} ${responseCertTypes.statusText}\n`;
                    saveSuccess = false;
                }
            } catch (err) {
                saveLog += `✗ Error during save: ${err.message || err}\n`;
                saveSuccess = false;
            }

            try {
                // Save status types (including deleted and reordered)
                const cleanStatusTypes = statusTypes.map(st => ({ ...st }));
                console.log('📤 Saving status types:', cleanStatusTypes.length, 'items');
                console.log('📤 Sample status types (first 3):', cleanStatusTypes.slice(0, 3));
                
                // Log any items for the current division to verify OrderID updates
                const currentDivItems = cleanStatusTypes.filter(st => st.DivisionID === mainDivisionFilter);
                console.log(`📤 Items for division ${mainDivisionFilter}:`, currentDivItems.map(st => ({ Status: st.Status, OrderID: st.OrderID })));
                
                const responseStatusTypes = await fetch('/api/data/statustypes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(cleanStatusTypes)
                });
                if (responseStatusTypes.ok) {
                    saveLog += '✓ Status types saved successfully.\n';
                } else {
                    const errorText = await responseStatusTypes.text();
                    saveLog += `✗ Failed to save status types: ${responseStatusTypes.status} ${responseStatusTypes.statusText} - ${errorText}\n`;
                    saveSuccess = false;
                }
            } catch (err) {
                saveLog += `✗ Error during save (status types): ${err.message || err}\n`;
                saveSuccess = false;
            }

            // Show log/notice to user
            alert(`Save Attempt:\n${saveLog}`);
            console.log('Save Attempt Log:', saveLog);

            // Update UI based on result
            if (saveSuccess) {
                hasUnsavedChanges = false;
                document.getElementById('unsavedIndicator').style.display = 'none';
                document.getElementById('saveBtn').style.display = 'none';
                // Refresh the page after a short delay to allow user to see the alert
                setTimeout(() => { window.location.reload(); }, 500);
            } else {
                hasUnsavedChanges = true;
                document.getElementById('unsavedIndicator').style.display = 'block';
                document.getElementById('saveBtn').style.display = 'inline-block';
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

        // Filter controls
        function setFilter(filterType) {
            currentFilter = filterType;
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.filter === filterType);
            });
            renderWorkflow();
        }

        // Populate main division filter dropdown
        function populateMainDivisionFilter() {
            const filterSelect = document.getElementById('mainDivisionFilter');
            if (!filterSelect) return;

            // Use whitelist and sort numerically
            const sortedDivisions = sortDivisionsByNumber(ALLOWED_DIVISIONS);

            // Clear existing options except "All Divisions"
            filterSelect.innerHTML = '<option value="ALL">🌐 All Divisions</option>';

            // Add only allowed divisions, sorted
            sortedDivisions.forEach(div => {
                const option = document.createElement('option');
                option.value = div;
                option.textContent = div;
                filterSelect.appendChild(option);
            });

            // After populating, check for division param in URL and set filter if present
            const urlParams = new URLSearchParams(window.location.search);
            const divisionParam = urlParams.get('division');
            if (divisionParam && filterSelect.value !== divisionParam) {
                filterSelect.value = divisionParam;
                handleMainDivisionFilter();
            }

            console.log('✅ Populated main division filter with', sortedDivisions.length, 'divisions');

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
        function handleMainDivisionFilter() {
            mainDivisionFilter = document.getElementById('mainDivisionFilter').value;
            console.log('🔄 Division filter changed to:', mainDivisionFilter);
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
        function showCertDetails(certName, statusName) {
            const panel = document.getElementById('detailsPanel');
            const title = document.getElementById('detailsTitle');
            const subtitle = document.getElementById('detailsSubtitle');
            const content = document.getElementById('detailsContent');
            
            title.textContent = certName;
            subtitle.textContent = `Viewing details for this certification`;
            
            // Find the certType record for this cert name in the current division
            const certType = certTypes.find(ct => 
                ct.Certification === certName && 
                ct.DivisionID === mainDivisionFilter &&
                ct.isDeleted !== true && 
                ct.isDeleted !== 'true'
            );
            const certTypeId = certType?.ID || null;
            const pizzaStatusId = certType?.PizzaStatusID || null;
            
            // Find all statuses using this cert (by PizzaStatusID from certTypes)
            const statusesUsing = [];
            if (pizzaStatusId && statusTypes && Array.isArray(statusTypes)) {
                statusTypes.forEach(st => {
                    if (st.PizzaStatusID === pizzaStatusId && 
                        st.DivisionID === mainDivisionFilter &&
                        st.isDeleted !== true && 
                        String(st.isDeleted) !== 'true') {
                        statusesUsing.push(st.Status);
                    }
                });
            }
            
            // Find operators IN THIS STATUS AND DIVISION with this cert (matching by CertTypeID, approved and not deleted)
            const operatorsInStatusWithCert = [];
            const operatorsInStatusMissingCert = [];
            
            if (pizzaStatusId) {
                operators.forEach(op => {
                    // Must be in the selected division
                    if (op.DivisionID !== mainDivisionFilter) return;
                    
                    // Check if operator's current status uses this PizzaStatusID
                    const opStatusType = statusTypes.find(st => 
                        st.Status === op.StatusName && 
                        st.DivisionID === op.DivisionID
                    );
                    if (!opStatusType || opStatusType.PizzaStatusID !== pizzaStatusId) return;
                    
                    // Check if operator has the cert
                    const hasCert = op.certifications?.some(cert => {
                        const matchesCertType = certTypeId ? cert.CertTypeID === certTypeId : cert.Cert === certName;
                        if (!matchesCertType) return false;
                        if (cert.isApproved !== '1' && cert.isApproved !== 1 && cert.isApproved !== true) return false;
                        if (cert.IsDeleted === '1' || cert.IsDeleted === 1 || cert.IsDeleted === true) return false;
                        return true;
                    });
                    
                    if (hasCert) {
                        operatorsInStatusWithCert.push(op);
                    } else {
                        operatorsInStatusMissingCert.push(op);
                    }
                });
            }
            
            content.innerHTML = `
                <div class="details-section">
                    <h4>📋 Cert Type Details</h4>
                    <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 10px;">
                        ${certTypeId ? `<div><strong>CertType ID:</strong> <span style="font-family: monospace; font-size: 0.8rem;">${certTypeId}</span></div>` : ''}
                        ${pizzaStatusId ? `<div><strong>PizzaStatus ID:</strong> <span style="font-family: monospace; font-size: 0.8rem;">${pizzaStatusId}</span></div>` : ''}
                        <div><strong>Division:</strong> ${mainDivisionFilter}</div>
                    </div>
                </div>
                
                <div class="details-section">
                    <h4>📍 Used In ${statusesUsing.length} Status${statusesUsing.length !== 1 ? 'es' : ''}</h4>
                    <div style="color: #94a3b8; font-size: 0.9rem;">
                        ${statusesUsing.join(', ') || 'None'}
                    </div>
                </div>
                
                <div class="details-section">
                    <h4>✅ Operators In Status With Cert (${operatorsInStatusWithCert.length})</h4>
                    <div class="operator-list">
                        ${operatorsInStatusWithCert.slice(0, 20).map(op => {
                            const cert = op.certifications?.find(c => {
                                const matchesCertType = certTypeId ? c.CertTypeID === certTypeId : c.Cert === certName;
                                return matchesCertType && 
                                    (c.isApproved === '1' || c.isApproved === 1 || c.isApproved === true) &&
                                    c.IsDeleted !== '1' && c.IsDeleted !== 1 && c.IsDeleted !== true;
                            });
                            const expireDate = cert?.Date;
                            const isExpired = expireDate && new Date(expireDate) < new Date();
                            return `
                                <div class="operator-item" onclick="showOperatorProfile('${op.ID}')" style="cursor: pointer;">
                                    <div class="operator-name-row">
                                        <span class="operator-name">${op.FirstName || ''} ${op.LastName || 'Unknown'}</span>
                                        <span class="operator-status-badge ${isExpired ? 'expired' : 'has-cert'}">
                                            ${isExpired ? '⚠️ Expired' : '✓ Valid'}
                                        </span>
                                    </div>
                                    <div style="font-size: 0.75rem; color: #64748b;">${op.StatusName || ''} • ${op.DivisionID || ''}</div>
                                </div>
                            `;
                        }).join('')}
                        ${operatorsInStatusWithCert.length > 20 ? `<div style="color: #64748b; padding: 10px; text-align: center;">... and ${operatorsInStatusWithCert.length - 20} more</div>` : ''}
                        ${operatorsInStatusWithCert.length === 0 ? '<div style="color: #64748b; padding: 10px;">No operators in this status have this certification</div>' : ''}
                    </div>
                </div>
                
                <div class="details-section">
                    <h4>❌ Operators In Status Missing Cert (${operatorsInStatusMissingCert.length})</h4>
                    <div class="operator-list">
                        ${operatorsInStatusMissingCert.slice(0, 20).map(op => `
                            <div class="operator-item" onclick="showOperatorProfile('${op.ID}')" style="cursor: pointer;">
                                <div class="operator-name-row">
                                    <span class="operator-name">${op.FirstName || ''} ${op.LastName || 'Unknown'}</span>
                                    <span class="operator-status-badge missing-cert">✗ Missing</span>
                                </div>
                                <div style="font-size: 0.75rem; color: #64748b;">${op.StatusName || ''} • ${op.DivisionID || ''}</div>
                            </div>
                        `).join('')}
                        ${operatorsInStatusMissingCert.length > 20 ? `<div style="color: #64748b; padding: 10px; text-align: center;">... and ${operatorsInStatusMissingCert.length - 20} more</div>` : ''}
                        ${operatorsInStatusMissingCert.length === 0 ? '<div style="color: #64748b; padding: 10px;">All operators in this status have this certification</div>' : ''}
                    </div>
                </div>
            `;
            
            panel.classList.add('open');
        }

        function closeDetailsPanel() {
            document.getElementById('detailsPanel').classList.remove('open');
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
        function exportAsCSV() {
            let csv = 'Status,Order,Certification,Level,Operators With Cert,Total Operators,Compliance %\n';
            
            currentWorkflow.forEach(step => {
                const allCerts = getRequiredCertsForStatus(step.status);
                allCerts.forEach(cert => {
                    const withCert = operators.filter(op => 
                        op.certifications?.some(c => certNamesMatch(c.CertType, cert))
                    ).length;
                    const compliance = ((withCert / operators.length) * 100).toFixed(1);
                    
                    csv += `"${step.status}",${step.step},"${cert}",required,${withCert},${operators.length},${compliance}%\n`;
                });
            });
            
            downloadFile(`operator_lifecycle_requirements_${new Date().toISOString().split('T')[0]}.csv`, csv, 'text/csv');
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
                const operatorsInStep = operators.filter(op => 
                    op.StatusName === step.status || 
                    (op.StatusName && op.StatusName.toUpperCase() === step.status.toUpperCase())                );
                const allCerts = getRequiredCertsForStatus(step.status);
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
                const operatorsInStep = operators.filter(op => 
                    op.StatusName === step.status || 
                    (op.StatusName && op.StatusName.toUpperCase() === step.status.toUpperCase())
                );
                const allCerts = getRequiredCertsForStatus(step.status);
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
                const allCerts = getRequiredCertsForStatus(step.status);
                const operatorsInStep = operators.filter(op => 
                    op.StatusName === step.status || 
                    (op.StatusName && op.StatusName.toUpperCase() === step.status.toUpperCase())
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
                const allCerts = getRequiredCertsForStatus(step.status);
                const operatorsInStep = operators.filter(op => 
                    op.StatusName === step.status || 
                    (op.StatusName && op.StatusName.toUpperCase() === step.status.toUpperCase())
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
        function showOperatorProfile(operatorId) {
            const operator = operators.find(op => op.ID === operatorId);
            if (!operator) {
                alert('Operator not found');
                return;
            }

            const modal = document.getElementById('operatorModal');
            const nameEl = document.getElementById('operatorModalName');
            const subtitleEl = document.getElementById('operatorModalSubtitle');
            const bodyEl = document.getElementById('operatorModalBody');

            nameEl.textContent = `${operator.FirstName} ${operator.LastName}`;
            subtitleEl.textContent = `${operator.StatusName || 'Unknown Status'} • Division ${operator.DivisionID || 'N/A'}`;

            // Get certs for the operator's current status's PizzaStatusId
            const opDivision = operator.DivisionID || '';
            const opStatus = operator.StatusName || '';
            let pizzaStatusId = null;
            // Find the current status object (from pay_StatusTypes)
            let statusObj = null;
            if (opStatus && Array.isArray(statusTypes)) {
                statusObj = statusTypes.find(s => s.Status === opStatus && s.DivisionID === opDivision);
                if (statusObj && statusObj.PizzaStatusID) {
                    pizzaStatusId = statusObj.PizzaStatusID;
                }
            }
            // Get all cert types for this PizzaStatusId
            let pizzaStatusCertTypes = [];
            if (pizzaStatusId && Array.isArray(certTypes)) {
                pizzaStatusCertTypes = certTypes.filter(ct => ct.PizzaStatusID === pizzaStatusId && ct.DivisionID === opDivision && !ct.isDeleted);
            }
            // For the full/cumulative set (for the lower section)
            const allCertsNeeded = new Set();
            const currentStepIndex = idealFlow.findIndex(s => s.status === opStatus);
            if (currentStepIndex >= 0) {
                const relevantStatuses = idealFlow.slice(0, currentStepIndex + 1).map(s => s.status);
                relevantStatuses.forEach(statusName => {
                    const statusData = certRequirements[statusName];
                    if (statusData) {
                        const divisions = statusData.divisions || {};
                        if (opDivision && divisions[opDivision]) {
                            (divisions[opDivision].required || []).forEach(cert => {
                                allCertsNeeded.add(cert.cert);
                            });
                        }
                    }
                });
            }

            // Get operator's certifications, filtered by:
            // - not deleted (IsDeleted !== '1')
            // - IsApproved (isApproved === '1')
            const operatorCerts = (operator.certifications || []).filter(cert => {
                // Must not be deleted
                if (cert.IsDeleted === '1' || cert.IsDeleted === 1 || cert.IsDeleted === true) return false;
                // Must be approved
                if (cert.isApproved !== '1' && cert.isApproved !== 1 && cert.isApproved !== true) return false;
                return true;
            });

            // Build cert status map for current PizzaStatus certs
            const pizzaStatusCertStatusMap = {};
            pizzaStatusCertTypes.forEach(certType => {
                const certName = certType.Certification;
                const certTypeId = certType.ID || ''; // Use ID, not CertTypeID
                // Find approved cert for this operator by matching CertTypeID
                const cert = (operator.certifications || []).find(c => {
                    // Match by CertTypeID
                    if (c.CertTypeID !== certTypeId) return false;
                    // Must not be deleted
                    if (c.IsDeleted === '1' || c.IsDeleted === 1 || c.IsDeleted === true) return false;
                    // Must be approved (isApproved === '1')
                    if (c.isApproved !== '1' && c.isApproved !== 1 && c.isApproved !== true) return false;
                    return true;
                });
                if (cert) {
                    pizzaStatusCertStatusMap[certName] = {
                        status: 'has-cert',
                        label: 'Valid',
                        issueDate: cert.RecordAt,
                        expireDate: cert.Date,
                        certificateId: cert.CertificationID || '',
                        certTypeId: certTypeId
                    };
                } else {
                    pizzaStatusCertStatusMap[certName] = {
                        status: 'missing',
                        label: 'Missing',
                        certificateId: '',
                        certTypeId: certTypeId
                    };
                }
            });
            // Stats for current PizzaStatus only
            const currentValid = Object.values(pizzaStatusCertStatusMap).filter(c => c.status === 'has-cert').length;
            const currentMissing = Object.values(pizzaStatusCertStatusMap).filter(c => c.status === 'missing' && c.certTypeId).length;
            // Build HTML
            let html = `
                <div class="operator-info-grid">
                    <div class="operator-info-item">
                        <div class="operator-info-label">Operator ID</div>
                        <div class="operator-info-value">${operator.ID}</div>
                    </div>
                    <div class="operator-info-item">
                        <div class="operator-info-label">Status</div>
                        <div class="operator-info-value">${operator.StatusName || 'Unknown'}</div>
                    </div>
                    <div class="operator-info-item">
                        <div class="operator-info-label">Division</div>
                        <div class="operator-info-value">${operator.DivisionID || 'N/A'}</div>
                    </div>
                </div>

                <h3 class="certs-section-title">Required for This Status (${pizzaStatusCertTypes.length})</h3>
                <div class="cert-grid">
            `;
            // Show all certs for this PizzaStatus, green if operator has, missing otherwise
            Object.entries(pizzaStatusCertStatusMap).forEach(([certName, certInfo]) => {
                html += `
                    <div class="cert-card ${certInfo.status}">
                        <div class="cert-card-header">
                            <div class="cert-card-name">${certName}</div>
                            <div class="cert-card-status">${certInfo.label}</div>
                        </div>
                        ${(certInfo.certificateId || certInfo.certTypeId || certInfo.issueDate || certInfo.expireDate) ? `
                        <div class="cert-card-details">
                            <div class="cert-card-ids">
                                ${certInfo.certificateId ? `<div class='cert-card-id'>Cert ID: <span>${certInfo.certificateId}</span></div>` : ''}
                                ${certInfo.certTypeId ? `<div class='cert-card-type-id'>CertType ID: <span>${certInfo.certTypeId}</span></div>` : ''}
                            </div>
                            <div class="cert-card-dates">
                                ${certInfo.issueDate ? `<div class='cert-card-date'>Issued: ${certInfo.issueDate}</div>` : ''}
                                ${certInfo.expireDate ? `<div class='cert-card-date'>Expires: ${certInfo.expireDate}</div>` : ''}
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `;
            });
            html += `</div>`;

            bodyEl.innerHTML = html;
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
                console.log('[DEBUG] confirmAddStatus called');
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

                console.log(`🚀 Adding Status '${statusName}' to '${division}' at Order ${targetOrder}`);

                // 1. Shift existing orders DOWN
                let shiftedCountDown = 0;
                statusTypes.forEach(st => {
                    if (st.DivisionID === division && 
                        !(st.isDeleted === true || st.IsDelete === true) && 
                        st.Status !== statusName) { // Don't shift the one we are about to update if it exists
                        const currentOrd = parseInt(st.OrderID) || 0;
                        if (currentOrd >= targetOrder) {
                            st.OrderID = (currentOrd + 1).toString();
                            shiftedCountDown++;
                        }
                    }
                });
                console.log(`   shifted ${shiftedCountDown} subsequent statuses down`);

                // 2. Find or Create StatusType Record
                let stRecord = statusTypes.find(st => st.DivisionID === division && st.Status === statusName);
                let wasDeleted = false;
                if (stRecord) {
                    // If status was deleted, mark as restored and always update all key fields
                    wasDeleted = (stRecord.isDeleted === true || stRecord.IsDelete === true || String(stRecord.isDeleted) === 'true');
                    console.log(`[AddStatus] Found existing status record:`, JSON.stringify(stRecord));
                    stRecord.isDeleted = false;
                    stRecord.IsDelete = false;
                    stRecord.OrderID = targetOrder.toString();
                    stRecord.PizzaStatusID = pizzaStatusId;
                    // Defensive: update Description and RecordAt if missing
                    if (!stRecord.Description) stRecord.Description = statusName;
                    if (!stRecord.RecordAt) stRecord.RecordAt = new Date().toISOString();
                    console.log(`[AddStatus] Updated status record fields: isDeleted=false, IsDelete=false, OrderID=${stRecord.OrderID}, PizzaStatusID=${pizzaStatusId}, DivisionID=${division}`);
                } else {
                    stRecord = {
                        Id: crypto.randomUUID ? crypto.randomUUID() : 'NEW-' + Math.random().toString(36).substr(2,9),
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
                    console.log(`[AddStatus] Created new status record:`, JSON.stringify(stRecord));
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
                console.log('[DEBUG] Potential Add Status trigger clicked:', e.target);
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
                        return isOperator && (!isProvider || ps.IsProvider === null || ps.IsProvider === undefined || ps.IsProvider === '' || ps.IsProvider === false || ps.IsProvider === 'false');
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

