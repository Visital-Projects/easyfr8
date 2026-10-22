const { chromium } = require('playwright');
const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'easyfr8',
};

async function runBrowserVerification() {
  console.log('====================================================');
  console.log('EASYFR8 ADMIN DOCUMENT VERIFICATION UI BROWSER TEST');
  console.log('====================================================\n');

  const pool = mysql.createPool(DB_CONFIG);

  // Create a clean dedicated test document for UI verification
  const testDocId = `DOC-TEST-UI-${Date.now()}`;
  console.log(`Setting up dedicated test document ${testDocId} in MariaDB...`);
  await pool.query(
    `INSERT INTO kyc_documents (id, \`user\`, name, type, date, status, remarks, file_url, file_type, created_at, updated_at)
     VALUES (?, 'user318@easyfr8.com', 'Shipper PAN Card Verification Test', 'PAN Certificate', CURDATE(), 'Pending Review', 'Initial upload by shipper for review', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'png', NOW(), NOW())`,
    [testDocId]
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  const page = await context.newPage();

  let passed = 0;
  let failed = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Admin Login -> Dashboard -> User Documents Navigation
    // -------------------------------------------------------------------------
    console.log('--- TEST 1: Admin Login -> Dashboard -> User Documents Navigation ---');
    await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle' });
    await page.fill('#email', 'biswa@easyfr8.com');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    assert(page.url().includes('/dashboard'), 'Admin successfully authenticated and reached /dashboard');

    // Look for sidebar link
    const docLink = await page.waitForSelector('a[href="/documents"]', { timeout: 8000 });
    assert(docLink !== null, 'Sidebar contains "User Documents" navigation link');

    await docLink.click();
    await page.waitForURL('**/documents', { timeout: 8000 });
    assert(page.url().includes('/documents'), 'Successfully navigated to http://localhost:3001/documents');

    // Verify Page Header
    const title = await page.waitForSelector('h1:has-text("User Document Verification")', { timeout: 8000 });
    assert(title !== null, 'Page header title "User Document Verification" rendered');

    // Verify KPI counters are present
    await page.waitForSelector('[data-testid="kpi-total"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="kpi-pending"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="kpi-approved"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="kpi-rejected"]', { timeout: 5000 });
    assert(true, 'All 4 KPI summary cards rendered');

    // -------------------------------------------------------------------------
    // TEST 2: Document List & Status Filtering
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 2: Inspecting Document List & Filters ---');
    // Find our test document row
    const testDocRow = await page.waitForSelector(`tr:has-text("${testDocId}")`, { timeout: 8000 });
    assert(testDocRow !== null, `Document record ${testDocId} found in data table`);

    const docText = await testDocRow.innerText();
    assert(docText.includes('Pending Review'), 'Initial status badge is "Pending Review"');
    assert(docText.includes('Easyfr8 User 318') || docText.includes('user318@easyfr8.com'), 'Shipper name / email displayed correctly');

    // Test Pending Review tab filter
    const pendingTab = await page.waitForSelector('button:has-text("Pending Review")');
    await pendingTab.click();
    await page.waitForTimeout(500);
    const stillVisible = await page.$(`tr:has-text("${testDocId}")`);
    assert(stillVisible !== null, 'Test document visible in "Pending Review" filter view');

    // -------------------------------------------------------------------------
    // TEST 3: Secure Document Preview Modal
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 3: Document Preview Modal ---');
    const viewBtn = await testDocRow.$('button:has-text("View")');
    assert(viewBtn !== null, 'Found "View" button for document');
    await viewBtn.click();

    const previewModal = await page.waitForSelector('.modal-overlay.active', { timeout: 5000 });
    assert(previewModal !== null, 'Preview modal opened');

    const previewHeader = await previewModal.$('text=Shipper PAN Card Verification Test');
    assert(previewHeader !== null, 'Preview modal displays correct document title');

    // Close preview modal
    const closeBtn = await previewModal.$('.modal-close');
    await closeBtn.click();
    await page.waitForTimeout(400);

    // -------------------------------------------------------------------------
    // TEST 4: Document Review & Verification Workflow
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 4: Document Review Workflow ---');
    const testRowAgain = await page.waitForSelector(`tr:has-text("${testDocId}")`);
    const reviewBtn = await testRowAgain.$('button:has-text("Review")');
    await reviewBtn.click();

    const reviewModal = await page.waitForSelector('.modal-overlay.active', { timeout: 5000 });
    assert(reviewModal !== null, 'Review modal opened');

    // Test rejection validation: select Reject, clear remarks, click Proceed
    const rejectBtn = await reviewModal.$('button:has-text("Reject Document")');
    await rejectBtn.click();

    const remarksTextarea = await reviewModal.$('textarea');
    await remarksTextarea.fill('');

    const proceedBtn = await reviewModal.$('button:has-text("Proceed to Reject")');
    await proceedBtn.click();

    // Check error validation message
    const errorAlert = await reviewModal.waitForSelector('text=specify the rejection reason', { timeout: 3000 });
    assert(errorAlert !== null, 'Rejection without reason blocked with validation message');

    // Now select Approve
    const approveBtn = await reviewModal.$('button:has-text("Approve & Verify")');
    await approveBtn.click();

    const testRemarks = 'PAN card verified successfully by Compliance Officer';
    await remarksTextarea.fill(testRemarks);

    const proceedApproveBtn = await reviewModal.$('button:has-text("Proceed to Approve")');
    await proceedApproveBtn.click();

    // Verify confirmation dialog appears
    const confirmBox = await reviewModal.waitForSelector('text=Confirm Decision', { timeout: 3000 });
    assert(confirmBox !== null, 'Confirmation dialog step appeared before committing');

    const commitBtn = await reviewModal.waitForSelector('button:has-text("Confirm & Mark Approved")', { timeout: 3000 });
    await commitBtn.click();

    // Verify toast notification
    const toast = await page.waitForSelector('text=successfully marked as Approved', { timeout: 6000 });
    assert(toast !== null, 'Success toast displayed after approving');

    // -------------------------------------------------------------------------
    // TEST 5: Direct Database Verification
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 5: MariaDB Persistence Verification ---');
    const [[updatedDoc]] = await pool.query('SELECT status, remarks, updated_at FROM kyc_documents WHERE id = ?', [testDocId]);
    assert(updatedDoc.status === 'Approved', `MariaDB status is "Approved" (persisted: ${updatedDoc.status})`);
    assert(updatedDoc.remarks === testRemarks, `MariaDB remarks match entered reviewer remarks`);

    // Verify Audit Log
    const [audit] = await pool.query('SELECT action FROM audit_logs WHERE action LIKE ? ORDER BY created_at DESC LIMIT 1', [`%${testDocId}%`]);
    assert(audit.length > 0 && audit[0].action.includes('Approved'), `Audit log created for document verification action: ${audit[0]?.action}`);

    // Switch filter to All Documents to view the newly approved row
    await page.click('button:has-text("All Documents")');
    await page.waitForTimeout(600);
    const updatedRow = await page.waitForSelector(`tr:has-text("${testDocId}")`, { timeout: 8000 });
    const updatedRowText = await updatedRow.innerText();
    assert(updatedRowText.includes('Approved'), 'UI table badge updated to "Approved"');
    assert(updatedRowText.includes(testRemarks), 'UI table displays updated reviewer remarks');

    // Take screenshot of admin verification page
    await page.screenshot({ path: 'scripts/admin_document_verification_verified.png' });
    console.log('✓ Saved screenshot to scripts/admin_document_verification_verified.png');

    // -------------------------------------------------------------------------
    // TEST 6: Shipper Portal Synchronization
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 6: Shipper Portal Synchronization on localhost:3000 ---');
    // Set localStorage auth token for user318@easyfr8.com in a new browser context
    const shipperContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const shipperPage = await shipperContext.newPage();

    // Go to public site to establish origin
    await shipperPage.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    // Inject token for user318@easyfr8.com
    const crypto = require('crypto');
    const JWT_SECRET = process.env.JWT_SECRET || 'easyfr8_secret_key';
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ id: 'USR-318', email: 'user318@easyfr8.com', name: 'Easyfr8 User 318', role: 'Customer', exp: Math.floor(Date.now()/1000) + 86400 })).toString('base64url');
    const sig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    const shipperJwt = `${header}.${body}.${sig}`;

    await shipperPage.evaluate(({ token }) => {
      localStorage.setItem('easyfr8_token', token);
      localStorage.setItem('easyfr8_user', JSON.stringify({
        id: 'USR-318',
        email: 'user318@easyfr8.com',
        name: 'Easyfr8 User 318',
        role: 'Customer',
      }));
    }, { token: shipperJwt });

    // Navigate to shipper documents portal
    await shipperPage.goto('http://localhost:3000/user/documents', { waitUntil: 'domcontentloaded' });

    // Wait for documents table
    const shipperDocRow = await shipperPage.waitForSelector(`tr:has-text("${testDocId}")`, { timeout: 8000 });
    assert(shipperDocRow !== null, 'Shipper portal displays test document');

    const shipperDocText = await shipperDocRow.innerText();
    assert(shipperDocText.includes('Approved'), 'Shipper portal reflects "Approved" review status');
    assert(shipperDocText.includes(testRemarks), 'Shipper portal reflects updated reviewer remarks');

    await shipperPage.screenshot({ path: 'scripts/shipper_portal_synchronized.png' });
    console.log('✓ Saved screenshot to scripts/shipper_portal_synchronized.png');

    await shipperContext.close();

    // Clean up test document
    await pool.query('DELETE FROM kyc_documents WHERE id = ?', [testDocId]);
    console.log(`\n✓ Cleaned up test document ${testDocId} from MariaDB.`);

  } catch (err) {
    console.error('Test Execution Error:', err);
    failed++;
  } finally {
    await browser.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log(`BROWSER VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
}

runBrowserVerification();
