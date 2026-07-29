import sqlite3 from 'sqlite3';

const API_BASE = 'http://localhost:5000/api';

async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data.token;
}

async function request(path, method, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, { ...options });
  const data = await res.json();
  return { status: res.status, ok: res.ok, data };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  try {
    console.log('--- STARTING QR WORKFLOW VERIFICATION ---');

    // 1. Login as Student and apply for leave
    console.log('\n[1] Logging in as student...');
    const studentToken = await login('sarvath@college.edu', 'password123');
    
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

    console.log('Applying for leave...');
    const applyRes = await request('/leaves/apply', 'POST', {
      leaveType: 'Outstation',
      reason: 'Family event check',
      destination: 'Home town',
      address: '123 Street Name',
      emergencyContact: '+91 9999999999',
      travelMode: 'Train',
      startDate: tomorrow,
      endDate: dayAfter,
      expectedReturnTime: '18:00',
      documents: []
    }, studentToken);

    if (!applyRes.ok) {
      console.log('Apply leave failed:', applyRes.data.message);
      if (applyRes.data.message.includes('already have a pending or active leave')) {
        console.log('Existing pending/active leave detected. We will proceed with approvals or checking the database.');
      } else {
        throw new Error('Could not apply for leave: ' + applyRes.data.message);
      }
    }

    // Get leaves list to find the pending leave request ID
    const studentLeaves = await request('/leaves/student', 'GET', null, studentToken);
    const pendingLeave = studentLeaves.data.find(l => l.status !== 'APPROVED' && l.status !== 'REJECTED');
    if (!pendingLeave) {
      throw new Error('No pending leave found to test approvals.');
    }
    const leaveId = pendingLeave.id;
    console.log(`Found pending Leave ID: ${leaveId}, Current status: ${pendingLeave.status}, Handler: ${pendingLeave.current_handler_role}`);

    // 2. CC Approval
    if (pendingLeave.status === 'PENDING_CC') {
      console.log('\n[2] Logging in as CC...');
      const ccToken = await login('priya.cc@college.edu', 'password123');
      const ccApprove = await request('/leaves/review', 'POST', { leaveId, action: 'APPROVE', remarks: 'CC Approved' }, ccToken);
      console.log('CC approval response:', ccApprove.data.message || ccApprove.data);
    }

    // 3. HOD Approval
    console.log('\n[3] Logging in as HOD...');
    const hodToken = await login('ramesh.hod@college.edu', 'password123');
    const hodApprove = await request('/leaves/review', 'POST', { leaveId, action: 'APPROVE', remarks: 'HOD Approved' }, hodToken);
    console.log('HOD approval response:', hodApprove.data.message || hodApprove.data);

    // 4. Dean Approval
    console.log('\n[4] Logging in as Dean...');
    const deanToken = await login('dean@college.edu', 'password123');
    const deanApprove = await request('/leaves/review', 'POST', { leaveId, action: 'APPROVE', remarks: 'Dean Approved' }, deanToken);
    console.log('Dean approval response:', deanApprove.data.message || deanApprove.data);

    // 5. Warden Approval (Generates QR code)
    console.log('\n[5] Logging in as Warden...');
    const wardenToken = await login('warden@college.edu', 'password123');
    const wardenApprove = await request('/leaves/review', 'POST', { leaveId, action: 'APPROVE', remarks: 'Warden Approved' }, wardenToken);
    console.log('Warden approval response:', wardenApprove.data.message || wardenApprove.data);

    // 6. Get active QR pass from student
    console.log('\n[6] Getting active pass for student...');
    const activePassRes = await request('/passes/active', 'GET', null, studentToken);
    if (!activePassRes.ok) {
      throw new Error('Active pass not found for student after warden approval: ' + activePassRes.data.message);
    }
    const encryptedToken = activePassRes.data.encrypted_token;
    console.log('Active Pass ID:', activePassRes.data.pass_id);
    console.log('Active Pass Status:', activePassRes.data.status);
    console.log('Encrypted Pass Token:', encryptedToken.slice(0, 30) + '...');

    // 7. Login as Guard
    console.log('\n[7] Logging in as Guard...');
    const guardToken = await login('guard@college.edu', 'password123');

    // 8. Test Future Pass Check (Should fail because leave starts tomorrow)
    console.log('\n[8] Scanning for exit (expected failure due to FUTURE start date)...');
    const scanExitFuture = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: '' }, guardToken);
    console.log('Future exit scan status:', scanExitFuture.status);
    console.log('Future exit scan message:', scanExitFuture.data.message);
    if (scanExitFuture.status !== 400 || !scanExitFuture.data.message.includes('FUTURE PASS')) {
      throw new Error('Future pass check failed: expected 400 with FUTURE PASS but got: ' + scanExitFuture.status + ' ' + JSON.stringify(scanExitFuture.data));
    }

    // Let's modify the database start_date for this leave request to 'today' so we can test the exit/entry duplicate flow!
    console.log('\n[8b] Simulating start date as today in database...');
    const db = new sqlite3.Database('hlms.db');
    await new Promise((resolve, reject) => {
      db.run(`UPDATE leave_requests SET start_date = ? WHERE id = ?`, [today, leaveId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log('Database updated: start_date set to today.');

    // 9. Scan 1: Exit Scan
    console.log('\n[9] Scanning for exit (Start date is now today)...');
    const scanExit1 = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: '' }, guardToken);
    console.log('Exit scan 1 status:', scanExit1.status);
    console.log('Exit scan 1 response action:', scanExit1.data.action);
    console.log('Exit scan 1 response message:', scanExit1.data.message);
    if (!scanExit1.ok || scanExit1.data.action !== 'EXIT') {
      throw new Error('Exit scan 1 failed: ' + JSON.stringify(scanExit1.data));
    }

    // 10. Scan 2: Duplicate Exit Scan immediately
    console.log('\n[10] Scanning for exit again immediately (Duplicate exit)...');
    const scanExit2 = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: '' }, guardToken);
    console.log('Exit scan 2 (duplicate) status:', scanExit2.status);
    console.log('Exit scan 2 response action:', scanExit2.data.action);
    console.log('Exit scan 2 response message:', scanExit2.data.message);
    if (!scanExit2.ok || scanExit2.data.action !== 'EXIT' || !scanExit2.data.message.includes('Duplicate scan ignored')) {
      throw new Error('Exit scan 2 duplicate check failed: ' + JSON.stringify(scanExit2.data));
    }

    // 11. Scan 3: Entry Scan within 10 seconds (Should still be duplicate exit scan!)
    console.log('\n[11] Scanning again within 10s of exit (Should still trigger duplicate exit protection)...');
    const scanEntryEarly = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: '' }, guardToken);
    console.log('Early entry scan status:', scanEntryEarly.status);
    console.log('Early entry scan action:', scanEntryEarly.data.action);
    console.log('Early entry scan message:', scanEntryEarly.data.message);
    if (!scanEntryEarly.ok || scanEntryEarly.data.action !== 'EXIT') {
      throw new Error('Early entry scan failed to hit duplicate exit check: ' + JSON.stringify(scanEntryEarly.data));
    }

    // 12. Sleep 11 seconds to clear duplicate exit window
    console.log('\n[12] Sleeping 11 seconds...');
    await sleep(11000);

    // 13. Scan 4: Entry Scan
    console.log('\n[13] Scanning for entry (after 11 seconds)...');
    const scanEntry1 = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: 'Heavy traffic' }, guardToken);
    console.log('Entry scan 1 status:', scanEntry1.status);
    console.log('Entry scan 1 action:', scanEntry1.data.action);
    console.log('Entry scan 1 message:', scanEntry1.data.message);
    if (!scanEntry1.ok || scanEntry1.data.action !== 'ENTRY') {
      throw new Error('Entry scan 1 failed: ' + JSON.stringify(scanEntry1.data));
    }

    // 14. Scan 5: Duplicate Entry Scan immediately
    console.log('\n[14] Scanning for entry again immediately (Duplicate entry)...');
    const scanEntry2 = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: '' }, guardToken);
    console.log('Entry scan 2 (duplicate) status:', scanEntry2.status);
    console.log('Entry scan 2 action:', scanEntry2.data.action);
    console.log('Entry scan 2 message:', scanEntry2.data.message);
    if (!scanEntry2.ok || scanEntry2.data.action !== 'ENTRY' || !scanEntry2.data.message.includes('Duplicate scan ignored')) {
      throw new Error('Entry scan 2 duplicate check failed: ' + JSON.stringify(scanEntry2.data));
    }

    // 15. Sleep 11 seconds to clear duplicate entry window
    console.log('\n[15] Sleeping 11 seconds...');
    await sleep(11000);

    // 16. Scan 6: Used Pass Scan
    console.log('\n[16] Scanning after 11 seconds of entry (Should return PASS ALREADY USED)...');
    const scanEntry3 = await request('/passes/scan', 'POST', { token: encryptedToken, lateReason: '' }, guardToken);
    console.log('Used pass scan status:', scanEntry3.status);
    console.log('Used pass scan response message:', scanEntry3.data.message);
    if (scanEntry3.status !== 400 || !scanEntry3.data.message.includes('PASS ALREADY USED')) {
      throw new Error('Used pass check failed: ' + JSON.stringify(scanEntry3.data));
    }

    console.log('\n*** ALL TESTS PASSED SUCCESSFULLY! ***');
    db.close();

  } catch (err) {
    console.error('\n!!! TEST FAILED !!!');
    console.error(err);
    process.exit(1);
  }
}

runTest();
