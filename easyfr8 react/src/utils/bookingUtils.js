/**
 * Helper to parse structured cargo_details from EasyFr8 bookings
 */
export function parseBookingCargoDetails(cargoDetails, defaultContainerName = '') {
  if (!cargoDetails || typeof cargoDetails !== 'string') {
    return {
      containers: [],
      weight: '',
      dimensions: '',
      finalDelivery: '',
      remarks: '',
      specialInstructions: '',
      raw: ''
    };
  }

  // Parse [Containers]: lines
  const containerLines = cargoDetails.match(/- Container #\d+:[^\n]+/g) || [];
  const parsedContainers = containerLines.map((line, idx) => {
    const eqMatch = line.match(/- Container #\d+:\s*([^|]+)/);
    const qtyMatch = line.match(/Qty:\s*([^|]+)/);
    const weightMatch = line.match(/Weight:\s*([^|]+)/);
    const dimMatch = line.match(/Dim:\s*([^|\n]+)/);
    const tempMatch = line.match(/Temp:\s*([^|]+)/);
    return {
      index: idx + 1,
      equipment: eqMatch ? eqMatch[1].trim() : (defaultContainerName || 'Container'),
      quantity: qtyMatch ? qtyMatch[1].trim() : '1',
      weight: weightMatch ? weightMatch[1].trim() : '',
      dimensions: dimMatch ? dimMatch[1].trim() : '',
      temperature: tempMatch ? tempMatch[1].trim() : ''
    };
  });

  // Extract weight and dimensions summary for clean display
  let weight = '';
  let dimensions = '';
  if (parsedContainers.length > 0) {
    if (parsedContainers.length === 1) {
      weight = parsedContainers[0].weight || '';
      dimensions = parsedContainers[0].dimensions || '';
    } else {
      weight = parsedContainers.map((c) => `#${c.index}: ${c.weight || 'N/A'}`).join(', ');
      dimensions = parsedContainers.map((c) => c.dimensions ? `#${c.index}: ${c.dimensions}` : '').filter(Boolean).join(', ');
    }
  }

  const deliveryMatch = cargoDetails.match(/Final Delivery Place:\s*([^\n]+)/i);
  const remarksMatch = cargoDetails.match(/Cargo Remarks:\s*([^\n]+)/i);
  const specialMatch = cargoDetails.match(/Special Instructions:\s*([^\n]+)/i);

  return {
    containers: parsedContainers,
    weight,
    dimensions,
    finalDelivery: deliveryMatch ? deliveryMatch[1].trim() : '',
    remarks: remarksMatch ? remarksMatch[1].trim() : '',
    specialInstructions: specialMatch ? specialMatch[1].trim() : '',
    raw: cargoDetails
  };
}

/**
 * Format dimension string like "1000x1000x1000mm" to "1000 × 1000 × 1000 mm"
 */
export function formatDimensions(dimStr) {
  if (!dimStr) return '';
  const match = dimStr.match(/^([\d.]+)[xX]([\d.]+)[xX]([\d.]+)(.*)$/);
  if (match) {
    const unit = match[4]?.trim() || 'mm';
    return `${match[1]} × ${match[2]} × ${match[3]} ${unit}`;
  }
  return dimStr;
}
