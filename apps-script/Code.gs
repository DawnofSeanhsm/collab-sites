/**
 * COLLAB SIGNUPS: backend for the two collab pages.
 *   Seoul Sweets x Notre Don  -> dessert holds (wave caps), alert list, daily game leaderboard
 *   Barbam x Le Chamber       -> who is coming (name, party, cocktails, night, time), "can't make it" list,
 *                                automatic block on parties of 3 or 4 once the larger tables of a seating are taken
 *
 * Lives inside the Google Sheet named "Collab Signups" (Extensions > Apps Script).
 * Run setup() once (safe to run again after an update), then deploy as a web app
 * (Execute as: Me, Who has access: Anyone).
 *
 * Tabs this script creates and uses:
 *   Config        A = Setting, B = Value, C = What it does
 *   Holds         Timestamp | Day | Dessert | First Name | Email | Mobile | SMS Consent | Wave | Code | Src | Picked Up | Qty
 *   Signups       Timestamp | Site | First Name | Email | Mobile | SMS Consent | Src | State
 *   Barbam Picks  Timestamp | Name | Party Size | Cocktails | Night | Seating | Src
 *   Leaderboard   Timestamp | Day | Name | Mobile | Score | Boxed | Seconds | Marketing Consent | Src | Flag
 *   Winners       Day | Place | Name | Mobile | Score | Flag      (built from the menu: Collab > Update winners)
 */

var ITEMS = {
  sig: 'Signature Mousse Cake',
  rice: 'Rice Mousse Cake',
  pistachio: 'Pistachio Festival',
  mascarberry: 'Mascarberry',
  ssal_sesame: 'Black Sesame Ssal Cake',
  ssal_mugwort: 'Mugwort Ssal Cake',
  ssal_mango: 'Mango Ssal Cake',
  ssal_biscoff: 'Biscoff Ssal Cake'
};
var DAYS = { sat: 'Sat Dec 5', sun: 'Sun Dec 6' };
var STATES = ['opening_soon', 'wave1_open', 'wave1_soldout', 'wave2_open', 'presale_closed'];
var TZ = 'America/New_York';
var HEADERS = {
  'Holds': ['Timestamp', 'Day', 'Dessert', 'First Name', 'Email', 'Mobile', 'SMS Consent', 'Wave', 'Code', 'Src', 'Picked Up', 'Qty'],
  'Signups': ['Timestamp', 'Site', 'First Name', 'Email', 'Mobile', 'SMS Consent', 'Src', 'State'],
  'Barbam Picks': ['Timestamp', 'Name', 'Party Size', 'Cocktails', 'Night', 'Seating', 'Src'],
  'Leaderboard': ['Timestamp', 'Day', 'Name', 'Mobile', 'Score', 'Boxed', 'Seconds', 'Marketing Consent', 'Src', 'Flag'],
  'Winners': ['Day', 'Place', 'Name', 'Mobile', 'Score', 'Flag']
};
var CONFIG_ROWS = [
  ['sb_state', 'opening_soon', 'What the Seoul Sweets page shows. One of: opening_soon, wave1_open, wave1_soldout, wave2_open, presale_closed. The page picks up a change on its next load.'],
  ['wave_cap', 5, 'Desserts that can be pre-ordered per dessert, per day, per wave. Counts pieces, so an order of 2 uses 2.'],
  ['max_per_order', 2, 'Most pieces of one dessert a guest can pre-order in one order. One order per mobile number.'],
  ['hold_time', '2:30 PM', 'Shown to guests: their dessert is held until this time.'],
  ['send_confirmation_email', true, 'TRUE = a guest who gives an email gets their hold code by email, sent from this Google account as "Seoul Sweets".'],
  ['auto_close', true, 'TRUE = when every dessert on both days reaches the cap, wave1_open flips to wave1_soldout and wave2_open flips to presale_closed by itself.'],
  ['lb_enabled', true, 'TRUE = the game shows the daily leaderboard and takes scores.'],
  ['lb_last_day', '2026-12-05', 'Last day the leaderboard runs (New York time), written as YYYY-MM-DD. After it, the board is hidden.'],
  ['lb_max_score', 6000, 'Scores above this are still saved but flagged "check" and kept off the public board.'],
  ['bb_big_tables', 2, 'Barbam: tables per seating that seat 3 or 4. Once this many parties of 3 or 4 are in the Barbam Picks tab for a night and seating, the page only offers tables for two there. To free one, delete that row or change its Party Size to 2.']
];
var BB_BIG_PARTY = 3;   // a party this size or larger needs one of the larger tables

/** Run once from the Apps Script editor, and again after pasting in a new version. It never deletes rows. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cfg = ss.getSheetByName('Config') || ss.insertSheet('Config');
  if (cfg.getLastRow() === 0) { cfg.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'What it does']]); cfg.setFrozenRows(1); cfg.setColumnWidth(1, 210); cfg.setColumnWidth(2, 150); cfg.setColumnWidth(3, 760); }
  var have = {}, n = cfg.getLastRow(), keys = n > 1 ? cfg.getRange(2, 1, n - 1, 1).getValues() : [];
  for (var i = 0; i < keys.length; i++) have[String(keys[i][0]).trim()] = true;
  for (var r = 0; r < CONFIG_ROWS.length; r++) {
    if (have[CONFIG_ROWS[r][0]]) continue;
    cfg.appendRow(CONFIG_ROWS[r]);
    var row = cfg.getLastRow();
    if (CONFIG_ROWS[r][0] === 'sb_state') cfg.getRange(row, 2).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATES, true).setAllowInvalid(false).build());
    if (typeof CONFIG_ROWS[r][1] === 'boolean') cfg.getRange(row, 2).insertCheckboxes();
    if (CONFIG_ROWS[r][0] === 'lb_last_day') cfg.getRange(row, 2).setNumberFormat('@');
  }
  for (var name in HEADERS) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);       // (re)writes the header row only
    sh.setFrozenRows(1);
  }
  ss.getSheetByName('Leaderboard').getRange('D:D').setNumberFormat('@');          // keep phone numbers as text
  ss.getSheetByName('Holds').getRange('F:F').setNumberFormat('@');
  ss.getSheetByName('Signups').getRange('E:E').setNumberFormat('@');
  ss.getSheetByName('Holds').getRange('B:B').setNumberFormat('@');                // keep "Sat Dec 5" as text, not a date
  ss.getSheetByName('Barbam Picks').getRange('E:F').setNumberFormat('@');         // keep "Mon Dec 7" and the seating as text
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Collab').addItem('Update winners', 'updateWinners').addToUi();
}

/** Rebuilds the Winners tab: top 3 of every day, flagged scores skipped, nobody wins twice. */
function updateWinners() {
  var ss = SpreadsheetApp.getActiveSpreadsheet(), rows = readBoard_(), byDay = {}, won = {}, out = [];
  for (var i = 0; i < rows.length; i++) (byDay[rows[i].day] = byDay[rows[i].day] || []).push(rows[i]);
  var days = Object.keys(byDay).sort();
  for (var d = 0; d < days.length; d++) {
    var list = byDay[days[d]].filter(function (r) { return !r.flag; }).sort(byScore_), place = 0;
    for (var k = 0; k < list.length && place < 3; k++) {
      if (won[list[k].mobile]) continue;
      won[list[k].mobile] = true; place++;
      out.push([days[d], place, list[k].name, list[k].mobile, list[k].score, '']);
    }
  }
  var sh = ss.getSheetByName('Winners'), n = sh.getLastRow();
  if (n > 1) sh.getRange(2, 1, n - 1, HEADERS['Winners'].length).clearContent();
  if (out.length) { sh.getRange(2, 4, out.length, 1).setNumberFormat('@'); sh.getRange(2, 1, out.length, HEADERS['Winners'].length).setValues(out); }
}

function doGet(e) {
  try {
    var cfg = readConfig_();
    if (e && e.parameter && e.parameter.action === 'board') return json_(boardFor_(cfg, readBoard_(), ''));
    if (e && e.parameter && e.parameter.action === 'barbam') return json_({ ok: true, limit: cfg.bbBigTables, big: bigCounts_('') });
    return json_(stateFor_(cfg, readHolds_()));
  } catch (err) { return json_({ ok: false, reason: 'error', detail: String(err) }); }
}

function doPost(e) {
  var d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, reason: 'bad_request' }); }
  if (!d || d.company) return json_({ ok: true });                       // honeypot field filled in: pretend it worked
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (d.type === 'pick') {                                               // Barbam: who is coming, logged as the guest leaves for Resy
    var size = Math.max(1, Math.min(12, parseInt(d.partySize, 10) || 1));
    var who = clean_(d.name, 60), night = clean_(d.night, 40), seating = clean_(d.seating, 40);
    var pickLock = LockService.getScriptLock(), locked = true;
    try { pickLock.waitLock(15000); } catch (err) { locked = false; }
    try {
      // a party of 3 or 4 only goes through while one of the larger tables is still free for that night and seating
      if (size >= BB_BIG_PARTY && locked && (bigCounts_(who)[night + '|' + seating] || 0) >= readConfig_().bbBigTables) return json_({ ok: false, reason: 'big_full' });
      ss.getSheetByName('Barbam Picks').appendRow([new Date(), who, size, clean_(d.cocktails, 120), night, seating, clean_(d.src, 40)]);
    } catch (err) {
    } finally { if (locked) pickLock.releaseLock(); }
    return json_({ ok: true });
  }

  var firstName = clean_(d.firstName, 60), email = clean_(d.email, 120).toLowerCase(), mobile = phone_(d.mobile);
  var emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (!firstName) return json_({ ok: false, reason: 'invalid' });
  if (email && !emailOk) return json_({ ok: false, reason: 'invalid' });
  var sms = d.sms === true && mobile !== '';
  var lock = LockService.getScriptLock();
  try { lock.waitLock(25000); } catch (err) { return json_({ ok: false, reason: 'busy' }); }
  try {
    var cfg = readConfig_();

    if (d.type === 'signup') {
      if (!mobile && !emailOk) return json_({ ok: false, reason: 'invalid' });
      ss.getSheetByName('Signups').appendRow([new Date(), clean_(d.site, 40), firstName, email, mobile, sms, clean_(d.src, 40), clean_(d.state, 40)]);
      return json_({ ok: true });
    }

    if (d.type === 'score') {
      if (!mobile) return json_({ ok: false, reason: 'invalid' });
      var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
      if (!cfg.lbEnabled || today > cfg.lbLastDay) return json_({ ok: false, reason: 'closed' });
      var score = Math.max(0, Math.round(Number(d.score) || 0)), boxed = Math.max(0, Math.round(Number(d.caught) || 0)), secs = Math.max(0, Number(d.seconds) || 0);
      var flag = (score > cfg.lbMaxScore || secs > 46 || score > boxed * 70 + 600) ? 'check' : '';
      var name = clean_(firstName, 14), sh = ss.getSheetByName('Leaderboard'), rows = readBoard_(), mine = null;
      for (var i = 0; i < rows.length; i++) if (rows[i].day === today && rows[i].mobile === mobile) { mine = rows[i]; break; }
      if (!mine) {
        sh.appendRow([new Date(), today, name, mobile, score, boxed, secs, sms, clean_(d.src, 40), flag]);
        rows.push({ day: today, name: name, mobile: mobile, score: score, flag: flag, ts: Date.now() });
      } else if (score > mine.score) {
        sh.getRange(mine.row, 1, 1, 10).setValues([[new Date(), today, name, mobile, score, boxed, secs, sms || mine.sms, clean_(d.src, 40), flag]]);
        mine.score = score; mine.name = name; mine.flag = flag; mine.ts = Date.now();
      }
      return json_(boardFor_(cfg, rows, mobile));
    }

    if (d.type !== 'hold') return json_({ ok: false, reason: 'bad_request' });
    if (!mobile) return json_({ ok: false, reason: 'invalid' });
    var wave = waveOf_(cfg.state);
    if (!wave) return json_({ ok: false, reason: 'closed' });
    if (!ITEMS[d.item] || !DAYS[d.day]) return json_({ ok: false, reason: 'invalid' });
    var holds = readHolds_();
    for (var h = 0; h < holds.length; h++) if (holds[h].mobile === mobile || (email && holds[h].email === email)) return json_({ ok: false, reason: 'duplicate' });
    var qty = Math.max(1, Math.min(cfg.maxQty, parseInt(d.qty, 10) || 1)), left = cfg.cap - count_(holds, d.day, d.item, wave);
    if (left <= 0) return json_({ ok: false, reason: 'sold_out' });
    if (qty > left) return json_({ ok: false, reason: 'only_left', left: left });
    var code = newCode_(holds);
    ss.getSheetByName('Holds').appendRow([new Date(), DAYS[d.day], ITEMS[d.item], firstName, email, mobile, sms, wave, code, clean_(d.src, 40), false, qty]);
    holds.push({ day: d.day, item: d.item, wave: wave, email: email, mobile: mobile, code: code, qty: qty });
    if (cfg.autoClose && allFull_(holds, wave, cfg.cap)) setConfig_('sb_state', wave === 1 ? 'wave1_soldout' : 'presale_closed');
    var emailed = false;
    if (cfg.sendEmail && email) {
      try {
        MailApp.sendEmail({
          to: email, name: 'Seoul Sweets', subject: 'Held: ' + (qty > 1 ? qty + ' x ' : '') + ITEMS[d.item] + ', ' + DAYS[d.day] + ' (' + code + ')',
          htmlBody: '<p>Hi ' + esc_(firstName) + ',</p>' +
            '<p>Your <b>' + (qty > 1 ? qty + ' x ' : '') + ITEMS[d.item] + '</b> ' + (qty > 1 ? 'are' : 'is') + ' on hold for <b>' + DAYS[d.day] + '</b> at Seoul Sweets, 308 5th Ave, New York.</p>' +
            '<p>Your code: <b>' + code + '</b></p>' +
            '<p>Join the line from 1:00 PM. Your dessert is held until ' + esc_(cfg.holdTime) + '. Show this email at the counter and pay there. One order per person.</p>' +
            '<p>Seoul Sweets x Notre Don, the pastry boutique from Seongsu-dong, Seoul.</p>'
        });
        emailed = true;
      } catch (err) { emailed = false; }
    }
    return json_({ ok: true, code: code, emailed: emailed, qty: qty });
  } catch (err) {
    return json_({ ok: false, reason: 'error', detail: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* ----------------------------- helpers ----------------------------- */

function configMap_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config'), n = sh.getLastRow(), map = {};
  if (n < 2) return map;
  var v = sh.getRange(2, 1, n - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) map[String(v[i][0]).trim()] = { value: v[i][1], row: i + 2 };
  return map;
}
function readConfig_() {
  var m = configMap_();
  function val(k, dflt) { return m[k] && m[k].value !== '' ? m[k].value : dflt; }
  function yes(k, dflt) { var x = val(k, dflt); return x === true || String(x).toUpperCase() === 'TRUE'; }
  var state = String(val('sb_state', 'opening_soon')).trim(), last = val('lb_last_day', '2026-12-05');
  if (last instanceof Date) last = Utilities.formatDate(last, TZ, 'yyyy-MM-dd');
  return {
    state: STATES.indexOf(state) >= 0 ? state : 'opening_soon',
    cap: Math.max(0, parseInt(val('wave_cap', 5), 10) || 0),
    maxQty: Math.max(1, Math.min(4, parseInt(val('max_per_order', 2), 10) || 1)),
    holdTime: String(val('hold_time', '2:30 PM')),
    sendEmail: yes('send_confirmation_email', true),
    autoClose: yes('auto_close', true),
    lbEnabled: yes('lb_enabled', true),
    lbLastDay: String(last).trim(),
    lbMaxScore: Math.max(0, parseInt(val('lb_max_score', 6000), 10) || 6000),
    bbBigTables: (function (x) { x = parseInt(x, 10); return isNaN(x) ? 2 : Math.max(0, x); })(val('bb_big_tables', 2))
  };
}
function setConfig_(key, value) { var m = configMap_(); if (m[key]) SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config').getRange(m[key].row, 2).setValue(value); }

function readHolds_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Holds'), n = sh.getLastRow();
  if (n < 2) return [];
  var rows = sh.getRange(2, 1, n - 1, HEADERS['Holds'].length).getValues(), out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (!r[5] && !r[4]) continue;                                       // mobile and email both cleared by hand: it frees the spot
    out.push({ day: keyOf_(DAYS, label_(r[1])), item: keyOf_(ITEMS, r[2]), email: String(r[4]).trim().toLowerCase(), mobile: phone_(r[5]), wave: parseInt(r[7], 10) || 0, code: String(r[8]), qty: Math.max(1, parseInt(r[11], 10) || 1) });
  }
  return out;
}
function readBoard_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Leaderboard'), n = sh.getLastRow();
  if (n < 2) return [];
  var rows = sh.getRange(2, 1, n - 1, HEADERS['Leaderboard'].length).getValues(), out = [];
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i], day = r[1] instanceof Date ? Utilities.formatDate(r[1], TZ, 'yyyy-MM-dd') : String(r[1]).trim();
    if (!r[3]) continue;
    out.push({ row: i + 2, ts: r[0] instanceof Date ? r[0].getTime() : 0, day: day, name: String(r[2]), mobile: phone_(r[3]), score: Number(r[4]) || 0, sms: r[7] === true, flag: String(r[9] || '') });
  }
  return out;
}
/**
 * Barbam: how many parties of 3 or 4 are logged for each night and seating, as { 'Mon Dec 7|6:00 PM to 7:30 PM': 2 }.
 * One name counts once per seating (their latest tap wins), and skipName is left out so a guest is never blocked by their own earlier tap.
 */
function bigCounts_(skipName) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Barbam Picks'), n = sh.getLastRow(), out = {};
  if (n < 2) return out;
  var rows = sh.getRange(2, 1, n - 1, HEADERS['Barbam Picks'].length).getValues(), latest = {}, skip = String(skipName || '').trim().toLowerCase();
  for (var i = 0; i < rows.length; i++) {
    var name = String(rows[i][1]).trim().toLowerCase(), key = label_(rows[i][4]) + '|' + String(rows[i][5]).trim();
    if (!name || name === skip) continue;
    latest[key + '|' + name] = { key: key, size: parseInt(rows[i][2], 10) || 0 };
  }
  for (var k in latest) if (latest[k].size >= BB_BIG_PARTY) out[latest[k].key] = (out[latest[k].key] || 0) + 1;
  return out;
}
function byScore_(a, b) { return b.score - a.score || a.ts - b.ts; }
function boardFor_(cfg, rows, mobile) {
  var today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'), open = cfg.lbEnabled && today <= cfg.lbLastDay;
  var p = cfg.lbLastDay.split('-'), months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var out = { ok: true, open: open, day: today, lastDay: p.length === 3 ? months[parseInt(p[1], 10) - 1] + ' ' + parseInt(p[2], 10) : cfg.lbLastDay, top: [] };
  if (!open) return out;
  var list = rows.filter(function (r) { return r.day === today && !r.flag; }).sort(byScore_);
  for (var i = 0; i < list.length; i++) {
    if (i < 10) out.top.push({ name: list[i].name, score: list[i].score });
    if (mobile && list[i].mobile === mobile) { out.rank = i + 1; out.best = list[i].score; }
  }
  return out;
}
function stateFor_(cfg, holds) {
  var wave = waveOf_(cfg.state), sold = { sat: [], sun: [] }, left = { sat: {}, sun: {} };
  if (wave) for (var day in DAYS) for (var item in ITEMS) {
    var n = Math.max(0, cfg.cap - count_(holds, day, item, wave));
    left[day][item] = n;
    if (n <= 0) sold[day].push(item);
  }
  return { ok: true, state: cfg.state, sold: sold, left: left, maxQty: cfg.maxQty, holdTime: cfg.holdTime };
}

function waveOf_(state) { return state === 'wave1_open' ? 1 : state === 'wave2_open' ? 2 : 0; }
function count_(holds, day, item, wave) { var n = 0; for (var i = 0; i < holds.length; i++) if (holds[i].day === day && holds[i].item === item && holds[i].wave === wave) n += holds[i].qty || 1; return n; }
function allFull_(holds, wave, cap) { for (var day in DAYS) for (var item in ITEMS) if (count_(holds, day, item, wave) < cap) return false; return true; }
/** A day label as text, even if Sheets turned "Mon Dec 7" into a date. */
function label_(v) { return v instanceof Date ? Utilities.formatDate(v, TZ, 'EEE MMM d') : String(v).trim(); }
function keyOf_(map, label) { for (var k in map) if (map[k] === String(label).trim()) return k; return ''; }
function newCode_(holds) {
  var abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', used = {}, code, i;
  for (i = 0; i < holds.length; i++) used[holds[i].code] = true;
  do { code = 'SS-'; for (i = 0; i < 4; i++) code += abc.charAt(Math.floor(Math.random() * abc.length)); } while (used[code]);
  return code;
}
/** Digits only, US numbers stored as 10 digits. Returns '' when it is not a usable number. */
function phone_(v) {
  var d = String(v === undefined || v === null ? '' : v).replace(/\D/g, '');
  if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
  return d.length >= 10 && d.length <= 15 ? d : '';
}
function clean_(v, max) {
  var s = String(v === undefined || v === null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;                              // never let a guest's text run as a formula
}
function esc_(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
