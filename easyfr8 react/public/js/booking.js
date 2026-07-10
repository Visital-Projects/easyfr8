
// // Make switchTab function globally available
// window.switchTab = function(tab) {
//     console.log('Switching to tab:', tab);
    
//     const oceanSection = document.getElementById('oceanSection');
//     const airSection = document.getElementById('airSection');
//     const tabs = document.querySelectorAll('.quote-tab');
    
//     if (tab === 'ocean') {
//         if (oceanSection) oceanSection.style.display = 'block';
//         if (airSection) airSection.style.display = 'none';
//         if (tabs[0]) tabs[0].classList.add('active');
//         if (tabs[1]) tabs[1].classList.remove('active');
//     } else if (tab === 'air') {
//         if (oceanSection) oceanSection.style.display = 'none';
//         if (airSection) airSection.style.display = 'block';
//         if (tabs[0]) tabs[0].classList.remove('active');
//         if (tabs[1]) tabs[1].classList.add('active');
//     }
// };

// // Wait for page to fully load
// window.onload = function() {
//     console.log('Page loaded, checking URL parameters...');
    
//     const urlParams = new URLSearchParams(window.location.search);
//     const freightType = urlParams.get('freightType');
//     const fromAirport = urlParams.get('fromAirport');
//     const toAirport = urlParams.get('toAirport');
//     const weight = urlParams.get('weight');
//     const weightUnit = urlParams.get('weightUnit');
//     const fromPort = urlParams.get('fromPort');
//     const toPort = urlParams.get('toPort');
//     const finalDelivery = urlParams.get('finalDelivery');
    
//     console.log('Parameters found:', {
//         freightType: freightType,
//         fromAirport: fromAirport,
//         toAirport: toAirport,
//         weight: weight,
//         weightUnit: weightUnit,
//         fromPort: fromPort,
//         toPort: toPort,
//         finalDelivery: finalDelivery
//     });
    
//     // Check which type of freight booking this is
//     if (freightType === 'ocean') {
//         console.log('Ocean freight parameters detected, switching to Ocean tab...');
        
//         // Switch to Ocean Freight tab
//         window.switchTab('ocean');
        
//         // Prefill ocean freight fields
//         setTimeout(function() {
//             // Prefill Port of Loading
//             if (fromPort) {
//                 const portLoading = document.querySelector('#oceanSection select[name="pol"]');
//                 if (portLoading) {
//                     // Try to find exact match first
//                     let found = false;
//                     for (let option of portLoading.options) {
//                         if (option.value === fromPort) {
//                             option.selected = true;
//                             found = true;
//                             break;
//                         }
//                     }
//                     // If not found by exact value, try by text
//                     if (!found) {
//                         for (let option of portLoading.options) {
//                             if (option.text.includes(fromPort.split(',')[0])) {
//                                 option.selected = true;
//                                 break;
//                             }
//                         }
//                     }
//                     console.log('Filled fromPort:', fromPort, 'Actual value:', portLoading.value);
//                 } else {
//                     console.error('Could not find pol field in ocean section');
//                 }
//             }
            
//             // Prefill Port of Discharge
//             if (toPort) {
//                 const portDischarge = document.querySelector('#oceanSection select[name="pod"]');
//                 if (portDischarge) {
//                     // Try to find exact match first
//                     let found = false;
//                     for (let option of portDischarge.options) {
//                         if (option.value === toPort) {
//                             option.selected = true;
//                             found = true;
//                             break;
//                         }
//                     }
//                     // If not found by exact value, try by text
//                     if (!found) {
//                         for (let option of portDischarge.options) {
//                             if (option.text.includes(toPort.split(',')[0])) {
//                                 option.selected = true;
//                                 break;
//                             }
//                         }
//                     }
//                     console.log('Filled toPort:', toPort, 'Actual value:', portDischarge.value);
//                 } else {
//                     console.error('Could not find pod field in ocean section');
//                 }
//             }
            
//             // Prefill Final Place of Delivery
//             if (finalDelivery) {
//                 const finalDeliveryInput = document.querySelector('#oceanSection input[name="final_delivery"]');
//                 if (finalDeliveryInput) {
//                     finalDeliveryInput.value = finalDelivery;
//                     console.log('Filled finalDelivery:', finalDelivery, 'Actual value:', finalDeliveryInput.value);
//                 } else {
//                     console.error('Could not find final_delivery field in ocean section');
//                 }
//             }
//         }, 200);
        
//     } else if (fromAirport || toAirport || weight) {
//         console.log('Air freight parameters detected, switching to Air tab...');
        
//         // Switch to Air Freight tab
//         window.switchTab('air');
        
//         // Prefill air freight fields after a short delay
//         setTimeout(function() {
//             // Prefill Airport of Loading
//             if (fromAirport) {
//                 const airportLoading = document.querySelector('#airSection select[name="airport_loading"]');
//                 if (airportLoading) {
//                     airportLoading.value = fromAirport;
//                     console.log('Filled fromAirport:', fromAirport, 'Actual value:', airportLoading.value);
//                 } else {
//                     console.error('Could not find airport_loading field in air section');
//                 }
//             }
            
//             // Prefill Airport of Discharge
//             if (toAirport) {
//                 const airportDischarge = document.querySelector('#airSection select[name="airport_discharge"]');
//                 if (airportDischarge) {
//                     airportDischarge.value = toAirport;
//                     console.log('Filled toAirport:', toAirport, 'Actual value:', airportDischarge.value);
//                 } else {
//                     console.error('Could not find airport_discharge field in air section');
//                 }
//             }
            
//             // Prefill Weight
//             if (weight) {
//                 const weightInput = document.querySelector('#airSection input[name="air_weight"]');
//                 if (weightInput) {
//                     weightInput.value = weight;
//                     console.log('Filled weight:', weight, 'Actual value:', weightInput.value);
//                 } else {
//                     console.error('Could not find air_weight field in air section');
//                 }
//             }
//             // Prefill Weight Unit
// if (weightUnit) {
//     const weightUnitSelect = document.querySelector('#airSection select[name="air_weight_unit"]');
//     if (weightUnitSelect) {
//         weightUnitSelect.value = weightUnit;
//         console.log('Filled weightUnit:', weightUnit, 'Actual value:', weightUnitSelect.value);
//     } else {
//         console.error('Could not find air_weight_unit field in air section');
//     }
// }
//         }, 200);
//     } else {
//         console.log('No parameters found, staying on Ocean tab');
//     }
// };












// Make switchTab function globally available
window.switchTab = function(tab) {
    console.log('Switching to tab:', tab);
    
    const oceanSection = document.getElementById('oceanSection');
    const airSection = document.getElementById('airSection');
    const tabs = document.querySelectorAll('.quote-tab');
    
    if (tab === 'ocean') {
        if (oceanSection) oceanSection.classList.add('active');
        if (airSection) airSection.classList.remove('active');
        if (tabs[0]) tabs[0].classList.add('active');
        if (tabs[1]) tabs[1].classList.remove('active');
    } else if (tab === 'air') {
        if (oceanSection) oceanSection.classList.remove('active');
        if (airSection) airSection.classList.add('active');
        if (tabs[0]) tabs[0].classList.remove('active');
        if (tabs[1]) tabs[1].classList.add('active');
    }
};

// Container type matching function
function matchContainerType(containerTypeParam, containerSelect) {
    if (!containerTypeParam || !containerSelect) return false;
    
    // Decode URL parameter (handles special characters like %27 for apostrophe)
    const decodedParam = decodeURIComponent(containerTypeParam).trim();
    console.log('Decoded container type:', decodedParam);
    
    // Try exact match first
    for (let option of containerSelect.options) {
        if (option.value === decodedParam) {
            option.selected = true;
            console.log('Exact match found:', option.value);
            return true;
        }
    }
    
    // Try case-insensitive partial match
    const lowerParam = decodedParam.toLowerCase();
    for (let option of containerSelect.options) {
        const lowerOption = option.value.toLowerCase();
        const lowerText = option.text.toLowerCase();
        
        if (lowerOption.includes(lowerParam) || 
            lowerText.includes(lowerParam) ||
            lowerParam.includes(lowerOption) ||
            lowerParam.includes(lowerText)) {
            option.selected = true;
            console.log('Partial match found:', option.value);
            return true;
        }
    }
    
    // Try removing special characters for matching
    const cleanParam = decodedParam.replace(/[^\w\s]/g, '').toLowerCase();
    for (let option of containerSelect.options) {
        const cleanOption = option.value.replace(/[^\w\s]/g, '').toLowerCase();
        const cleanText = option.text.replace(/[^\w\s]/g, '').toLowerCase();
        
        if (cleanOption.includes(cleanParam) || 
            cleanText.includes(cleanParam) ||
            cleanParam.includes(cleanOption) ||
            cleanParam.includes(cleanText)) {
            option.selected = true;
            console.log('Clean match found:', option.value);
            return true;
        }
    }
    
    return false;
}

// Function to show gauge dropdown for Open Top containers
function showGaugeDropdownForOpenTop() {
    console.log('showGaugeDropdownForOpenTop called');
    
    // Find all container selects
    const containerSelects = document.querySelectorAll('select[name^="container_type_"]');
    
    containerSelects.forEach((containerSelect, index) => {
        if (containerSelect.value && containerSelect.value.includes('Open Top')) {
            console.log(`Found Open Top container in select ${index + 1}:`, containerSelect.value);
            
            const containerItem = containerSelect.closest('.container-item');
            if (!containerItem) {
                console.log('Could not find container item');
                return;
            }
            
            // Find the gauge section
            const gaugeSection = containerItem.querySelector('.gauge-selection-section');
            const dimensionRow = containerItem.querySelector('.dimension-row');
            
            if (gaugeSection) {
                console.log('Found gauge section, showing it...');
                gaugeSection.style.display = 'block';
                
                // Also ensure dimensions are shown
                if (dimensionRow) {
                    dimensionRow.style.display = 'flex';
                }
                
                // Make gauge selection required
                const gaugeSelect = containerItem.querySelector('select[name^="gauge_type_"]');
                if (gaugeSelect) {
                    gaugeSelect.required = true;
                    console.log('Set gauge select as required');
                }
                
                console.log('✓ Gauge dropdown shown successfully');
            } else {
                console.log('Could not find gauge section');
            }
        }
    });
}

// Function to trigger container type change and show gauge dropdown for Open Top
function triggerContainerTypeChange(containerSelect) {
    if (!containerSelect) return;
    
    console.log('Triggering container type change for:', containerSelect.value);
    
    // First, directly show the gauge dropdown for Open Top
    if (containerSelect.value && containerSelect.value.includes('Open Top')) {
        console.log('Open Top detected, showing gauge dropdown directly...');
        showGaugeDropdownForOpenTop();
    }
    
    // Then call the original handleContainerTypeChange function if it exists
    if (typeof handleContainerTypeChange === 'function') {
        console.log('Calling original handleContainerTypeChange function');
        handleContainerTypeChange(containerSelect);
    }
    
    // Also dispatch the change event
    setTimeout(() => {
        containerSelect.dispatchEvent(new Event('change'));
        console.log('Change event dispatched');
    }, 100);
}

// Wait for page to fully load
window.onload = function() {
    console.log('Page loaded, checking URL parameters...');
    
    const urlParams = new URLSearchParams(window.location.search);
    const freightType = urlParams.get('freightType');
    const fromAirport = urlParams.get('fromAirport');
    const toAirport = urlParams.get('toAirport');
    const weight = urlParams.get('weight');
    const weightUnit = urlParams.get('weightUnit');
    const fromPort = urlParams.get('fromPort');
    const toPort = urlParams.get('toPort');
    const containerType = urlParams.get('containerType');
    
    console.log('Parameters found:', {
        freightType: freightType,
        fromAirport: fromAirport,
        toAirport: toAirport,
        weight: weight,
        weightUnit: weightUnit,
        fromPort: fromPort,
        toPort: toPort,
        containerType: containerType
    });
    
    // Log full URL for debugging
    console.log('Full URL:', window.location.href);
    
    // Check which type of freight booking this is
    if (freightType === 'ocean') {
        console.log('Ocean freight parameters detected, switching to Ocean tab...');
        
        // Switch to Ocean Freight tab
        setTimeout(() => {
            window.switchTab('ocean');
            
            // Prefill ocean freight fields after DOM is ready
            setTimeout(prefillOceanForm, 300);
        }, 100);
        
    } else if (fromAirport || toAirport || weight) {
        console.log('Air freight parameters detected, switching to Air tab...');
        
        // Switch to Air Freight tab
        setTimeout(() => {
            window.switchTab('air');
            
            // Prefill air freight fields after DOM is ready
            setTimeout(prefillAirForm, 300);
        }, 100);
    } else {
        console.log('No parameters found, defaulting to Ocean tab');
    }
    
    // Ocean form prefilling function
    function prefillOceanForm() {
        console.log('Prefilling Ocean Form...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const fromPort = urlParams.get('fromPort');
        const toPort = urlParams.get('toPort');
        const containerType = urlParams.get('containerType');
        
        // Prefill Port of Loading
        if (fromPort) {
            const portLoading = document.querySelector('#oceanSection select[name="pol"]');
            if (portLoading) {
                // Try to set value directly
                portLoading.value = decodeURIComponent(fromPort);
                
                // If not set, try to find match
                if (!portLoading.value) {
                    for (let option of portLoading.options) {
                        if (option.value.includes(fromPort.split(',')[0]) || 
                            option.text.includes(fromPort.split(',')[0])) {
                            option.selected = true;
                            break;
                        }
                    }
                }
                console.log('Port of Loading set to:', portLoading.value);
            }
        }
        
        // Prefill Port of Discharge
        if (toPort) {
            const portDischarge = document.querySelector('#oceanSection select[name="pod"]');
            if (portDischarge) {
                // Try to set value directly
                portDischarge.value = decodeURIComponent(toPort);
                
                // If not set, try to find match
                if (!portDischarge.value) {
                    for (let option of portDischarge.options) {
                        if (option.value.includes(toPort.split(',')[0]) || 
                            option.text.includes(toPort.split(',')[0])) {
                            option.selected = true;
                            break;
                        }
                    }
                }
                console.log('Port of Discharge set to:', portDischarge.value);
            }
        }
        
        // Prefill Container Type (IMPORTANT FIX)
        if (containerType) {
            console.log('Attempting to prefill container type:', containerType);
            
            // Wait a bit more for container select to be available
            setTimeout(() => {
                const containerSelect = document.querySelector('#oceanSection select[name="container_type_1"]');
                
                if (containerSelect) {
                    console.log('Found container select element');
                    
                    // Try to match container type
                    const success = matchContainerType(containerType, containerSelect);
                    
                    if (success) {
                        console.log('✓ Container type prefilled successfully:', containerSelect.value);
                        
                        // TRIGGER THE CONTAINER TYPE CHANGE TO SHOW GAUGE DROPDOWN
                        triggerContainerTypeChange(containerSelect);
                        
                    } else {
                        console.log('✗ Could not match container type:', containerType);
                        console.log('Trying manual matching...');
                        
                        // Manual matching based on common container types
                        const decodedType = decodeURIComponent(containerType).toLowerCase();
                        let matchedValue = null;
                        
                        // Common container type mappings
                        if (decodedType.includes("20' dry")) {
                            matchedValue = "20' Dry";
                        } else if (decodedType.includes("40' dry")) {
                            matchedValue = "40' Dry";
                        } else if (decodedType.includes("40' dry high")) {
                            matchedValue = "40' Dry High";
                        } else if (decodedType.includes("45' dry high")) {
                            matchedValue = "45' Dry High";
                        } else if (decodedType.includes("20' reefer")) {
                            matchedValue = "20' Reefer Standard";
                        } else if (decodedType.includes("40' reefer")) {
                            matchedValue = "40' Reefer High";
                        } else if (decodedType.includes("20' open top")) {
                            matchedValue = "20' Open Top";
                        } else if (decodedType.includes("40' open top")) {
                            matchedValue = "40' Open Top";
                        } else if (decodedType.includes("40' open top high")) {
                            matchedValue = "40' Open Top High";
                        } else if (decodedType.includes("40' flat standard")) {
                            matchedValue = "40' Flat Standard";
                        } else if (decodedType.includes("40' flat high")) {
                            matchedValue = "40' Flat High";
                        } else if (decodedType.includes("20' flat")) {
                            matchedValue = "20' Flat";
                        } else if (decodedType.includes("20' tank")) {
                            matchedValue = "20' Tank";
                        }
                        
                        if (matchedValue) {
                            containerSelect.value = matchedValue;
                            console.log('Manual result:', containerSelect.value);
                            
                            // TRIGGER THE CONTAINER TYPE CHANGE TO SHOW GAUGE DROPDOWN
                            triggerContainerTypeChange(containerSelect);
                        } else {
                            console.log('No manual match found for:', decodedType);
                        }
                    }
                } else {
                    console.error('Could not find container_type_1 select element');
                }
            }, 500);
        }
    }
    
    // Air form prefilling function
    function prefillAirForm() {
        console.log('Prefilling Air Form...');
        
        const urlParams = new URLSearchParams(window.location.search);
        const fromAirport = urlParams.get('fromAirport');
        const toAirport = urlParams.get('toAirport');
        const weight = urlParams.get('weight');
        const weightUnit = urlParams.get('weightUnit');
        
        // Prefill Airport of Loading
        if (fromAirport) {
            const airportLoading = document.querySelector('#airSection select[name="airport_loading"]');
            if (airportLoading) {
                airportLoading.value = decodeURIComponent(fromAirport);
                console.log('Airport of Loading set to:', airportLoading.value);
            }
        }
        
        // Prefill Airport of Discharge
        if (toAirport) {
            const airportDischarge = document.querySelector('#airSection select[name="airport_discharge"]');
            if (airportDischarge) {
                airportDischarge.value = decodeURIComponent(toAirport);
                console.log('Airport of Discharge set to:', airportDischarge.value);
            }
        }
        
        // Prefill Weight
        if (weight) {
            const weightInput = document.querySelector('#airSection input[name="air_weight"]');
            if (weightInput) {
                weightInput.value = weight;
                console.log('Weight set to:', weightInput.value);
            }
        }
        
        // Prefill Weight Unit
        if (weightUnit) {
            const weightUnitSelect = document.querySelector('#airSection select[name="air_weight_unit"]');
            if (weightUnitSelect) {
                weightUnitSelect.value = weightUnit;
                console.log('Weight Unit set to:', weightUnitSelect.value);
            }
        }
    }
};

// Debug function to check URL parameters
function debugURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('=== URL PARAMETERS DEBUG ===');
    urlParams.forEach((value, key) => {
        console.log(`${key}: ${value} (decoded: ${decodeURIComponent(value)})`);
    });
    console.log('===========================');
}

// Call debug on load
window.addEventListener('load', debugURLParameters);

// EMERGENCY FIX: Direct DOM manipulation to show gauge dropdown
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded, running emergency gauge fix...');
    
    // Check if we have an Open Top container in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const containerType = urlParams.get('containerType');
    
    if (containerType && decodeURIComponent(containerType).toLowerCase().includes('open top')) {
        console.log('Emergency fix: Open Top container detected in URL');
        
        // Run multiple times with increasing delays to ensure it works
        [500, 1000, 1500, 2000].forEach(delay => {
            setTimeout(() => {
                console.log(`Emergency fix attempt at ${delay}ms`);
                
                // Find the container select
                const containerSelect = document.querySelector('select[name="container_type_1"]');
                if (!containerSelect) {
                    console.log(`Emergency fix ${delay}ms: No container select found`);
                    return;
                }
                
                console.log(`Emergency fix ${delay}ms: Container select value is "${containerSelect.value}"`);
                
                // If value is set and contains "Open Top"
                if (containerSelect.value && containerSelect.value.includes('Open Top')) {
                    console.log(`Emergency fix ${delay}ms: Found Open Top, showing gauge dropdown...`);
                    
                    // Find the container item
                    const containerItem = containerSelect.closest('.container-item');
                    if (!containerItem) {
                        console.log(`Emergency fix ${delay}ms: No container item found`);
                        return;
                    }
                    
                    // Find and show the gauge section
                    const gaugeSection = containerItem.querySelector('.gauge-selection-section');
                    if (gaugeSection) {
                        console.log(`Emergency fix ${delay}ms: Found gauge section`);
                        gaugeSection.style.display = 'block';
                        
                        // Make sure it's really visible
                        setTimeout(() => {
                            if (gaugeSection.style.display !== 'block') {
                                gaugeSection.style.display = 'block';
                                console.log(`Emergency fix ${delay}ms: Forced gauge section to block`);
                            }
                        }, 100);
                        
                        console.log(`Emergency fix ${delay}ms: ✓ Gauge dropdown should be visible now`);
                        
                        // Also show dimensions
                        const dimensionRow = containerItem.querySelector('.dimension-row');
                        if (dimensionRow) {
                            dimensionRow.style.display = 'flex';
                        }
                    } else {
                        console.log(`Emergency fix ${delay}ms: No gauge section found`);
                    }
                } else {
                    console.log(`Emergency fix ${delay}ms: Container value doesn't contain "Open Top"`);
                }
            }, delay);
        });
    }
});

// Add this as a last resort - it will run after everything else
setTimeout(function() {
    console.log('Last resort gauge fix check...');
    
    // Look for any Open Top containers and force gauge dropdown to show
    const containerSelects = document.querySelectorAll('select[name^="container_type_"]');
    
    containerSelects.forEach((select, index) => {
        if (select.value && select.value.includes('Open Top')) {
            console.log(`Last resort: Found Open Top in select ${index + 1}`);
            
            const containerItem = select.closest('.container-item');
            if (containerItem) {
                const gaugeSection = containerItem.querySelector('.gauge-selection-section');
                if (gaugeSection) {
                    // Force it to show with !important style
                    gaugeSection.style.cssText = 'display: block !important';
                    console.log(`Last resort: Forced gauge dropdown to show with !important`);
                }
            }
        }
    });
}, 3000); // 3 seconds - should be enough for everything to load