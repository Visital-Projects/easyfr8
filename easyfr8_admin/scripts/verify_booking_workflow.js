const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log('   VERIFYING FREIGHT BOOKING & RATES WORKFLOW');
console.log('====================================================\n');

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`[PASS] ${message}`);
  } else {
    console.error(`[FAIL] ${message}`);
    allPassed = false;
  }
}

// 1. Inspect Home.jsx
const homePath = path.resolve(__dirname, '../../easyfr8 react/src/pages/Home.jsx');
const homeCode = fs.readFileSync(homePath, 'utf8');

assert(homeCode.includes('const handleBookRate = (route, container, rate) =>'), 'Home.jsx defines handleBookRate(route, container, rate)');
assert(homeCode.includes('navigate(\'/booking?\' + params.toString(), { state: statePayload })'), 'Home.jsx navigates with both URL params and rich location.state');
assert(homeCode.includes('transVal = route.transhipment?.code || rate.transhipment_code'), 'Home.jsx safely resolves transshipment port code');
assert(homeCode.includes('carrier: route.carrier || rate.carrier'), 'Home.jsx attaches carrier info');
assert(homeCode.includes('pricing: {'), 'Home.jsx packages structured pricing breakdown (price, THC, other charges, transit time)');
assert(homeCode.includes('handleOpenContainerEnquiry(selectedRoute, container)'), 'Home.jsx preserves container enquiry fallback for unpriced containers');

// 2. Inspect Rates.jsx
const ratesPath = path.resolve(__dirname, '../../easyfr8 react/src/pages/Rates.jsx');
const ratesCode = fs.readFileSync(ratesPath, 'utf8');

assert(ratesCode.includes('const handleBookRate = (rate) =>'), 'Rates.jsx defines handleBookRate(rate)');
assert(ratesCode.includes('navigate(`/booking?${params.toString()}`, { state: statePayload })'), 'Rates.jsx navigates with both URL params and rich location.state');
assert(ratesCode.includes('transVal = rate.transhipment_code || rate.transhipment_name'), 'Rates.jsx safely extracts transshipment data');
assert(ratesCode.includes('onClick={() => handleBookRate(rate)}'), 'Rates.jsx connects Booking button to handleBookRate');

// 3. Inspect Booking.jsx
const bookingPath = path.resolve(__dirname, '../../easyfr8 react/src/pages/Booking.jsx');
const bookingCode = fs.readFileSync(bookingPath, 'utf8');

assert(bookingCode.includes('const navState = location.state || {}'), 'Booking.jsx extracts location.state');
assert(bookingCode.includes('const navRate = navState.rate || null'), 'Booking.jsx extracts navRate from state');
assert(bookingCode.includes('const [selectedRate, setSelectedRate] = useState(() => navRate)'), 'Booking.jsx initializes selectedRate immediately from state');
assert(bookingCode.includes('const [selectedTranshipmentPort, setSelectedTranshipmentPort] = useState('), 'Booking.jsx initializes selectedTranshipmentPort');
assert(bookingCode.includes('const [selectedLoadingPortId, setSelectedLoadingPortId] = useState('), 'Booking.jsx initializes selectedLoadingPort from state/route');
assert(bookingCode.includes('const [selectedDischargePortId, setSelectedDischargePortId] = useState('), 'Booking.jsx initializes selectedDischargePort from state/route');
assert(bookingCode.includes('Change / Unlock Route'), 'Booking.jsx has user-friendly Change / Unlock Route button');
assert(bookingCode.includes('View in My Bookings'), 'Booking.jsx provides View in My Bookings button for authenticated users on success');
assert(bookingCode.includes('sessionStorage.setItem(\'easyfr8_pending_booking\''), 'Booking.jsx saves pending booking state in sessionStorage');
assert(bookingCode.includes('setShowAuthModal(true)'), 'Booking.jsx shows Authentication Required modal for unauthenticated users');

// 4. Inspect UserPortal / UserLogin redirection
const loginPath = path.resolve(__dirname, '../../easyfr8 react/src/pages/user/UserLogin.jsx');
const loginCode = fs.readFileSync(loginPath, 'utf8');
assert(loginCode.includes('searchParams.get(\'redirect\')'), 'UserLogin.jsx respects redirect query parameter after auth');

console.log('\n====================================================');
if (allPassed) {
  console.log('   ALL VERIFICATION CHECKS PASSED SUCCESSFULLY! ✓');
} else {
  console.log('   SOME CHECKS FAILED. PLEASE REVIEW ABOVE LOGS.');
}
console.log('====================================================\n');
