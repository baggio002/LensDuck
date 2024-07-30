// go/mtl-feedback sheet id
const SHEET_ID_MTL_FEEDBACK = '149bm0tMQlJd2cdc-C69yjWCqUWa-mt80LjuX8XF9a9U';
const SHEET_ID_MULTI_LENS_TRACKER = '1hMCXsjCHvNTfkhe9Cz4RPDAEadwQMXmeQAmwuydu2fM';
const SHEET_ID_LENS_DUCK = '1DU4oW30zJ8gVtnWPUKwnVHCImF5hMpx2UNVnXGmEleA';

const SHEET_NAME_MTL_FEEDBACK_FORM_RESPONSES_1 = 'Form Responses 1';
const SHEET_NAME_COACH_FORM = 'Coach Form';
const SHEET_NAME_LENS_DUCK = 'Lens Duck';

const RANGE_MTL_FEEDBACK_FORM_RESPONSES_1 = 'A1:AP';
const RANGE_COACH_FORM = 'A1:H';
const RANGE_LENS_DUCK = 'A1:L';
const RANGE_OLD_MEMEBER = 'B5:K';
const RANGE_MULTI_LENS_TRACKER = 'D5:P';
const RANGE_LENS_DUCK_NEW_COACH = 'L1:N';
const RANGE_LENS_DUCK_ENTIRE = 'A1:P';
const RANGE_LENS_DUCK_SINGLE_ROW = 'A{row}:P{row}';
const RANGE_TRACKER_SINGLE_ROW = 'D{row}:P{row}';
const RANGE_L_COLUMNS = 'Q1:S';

const RANGE_ENTIRE_ROW = 'A{row}:S{row}';

const STR_L1 = 'L1';
const STR_L2 = 'L2';
const STR_L3 = 'L3';

// mtl-feedback base header																																														
const HEAD_LENS_DUCK = ['event_id', 'shard', 'report_timestamp', 'reporter', 'case_number', 'case_owner', 'classification', 'comment_and_feedback', 'feedback_type', 'coach_date', 'coach', 'coach_comment'];
// multilens tracker base header
const HEAD_LENS_DUCK_OLD_COACH = ['meeting_plan', 'manager_confirmation', 'completed', 'coach_link'];
// extra column for statistics
const HEAD_LENS_DUCK_STATISTICS = [STR_L1, STR_L2, STR_L3];

const OLD_COACH_SHEET = new Map();
const NEW_COACH_RAWS = new Map();
const MEMBER_MAP = new Map();

const SHARD_DATA = 'Data';
const SHARD_INFRA = 'Infra';
const SHARD_NETWORKING = 'Networking';
const SHARD_PLATFORM = 'Platform';

const SHEET_NAME_TRACKER_DATA = 'Big Data';
const SHEET_NAME_TRACKER_INFRA = 'Infra';
const SHEET_NAME_TRACKER_NETWORKING = 'Networking';
const SHEET_NAME_TRACKER_PLATFORM = 'Platform';

const ROW_LENGTH = HEAD_LENS_DUCK.length + HEAD_LENS_DUCK_OLD_COACH.length + HEAD_LENS_DUCK_STATISTICS.length;

// entry.750495529 entry.1318818734 entry.647770488 entry.888148255
const LINK_FORM = 'https://docs.google.com/forms/d/e/1FAIpQLSfNRHFd0Oq3LmTEeUPDTZ-EWZ9BgFHHyJs3J9LfPwTncEMfSg/viewform?entry.750495529={entry_id}&entry.1318818734={case_number}'
                      + '&entry.647770488={feedback_type}&entry.84541254={completed}';

/**
 * sync data from go/mtl-feedback
 */
function syncMtlFeedbackSheet_() {
  let raws = Utils.getRemoteValueWithNonLastRowRange(SHEET_ID_MTL_FEEDBACK, SHEET_NAME_MTL_FEEDBACK_FORM_RESPONSES_1, RANGE_MTL_FEEDBACK_FORM_RESPONSES_1);
  Utils.clear(SHEET_NAME_LENS_DUCK, RANGE_LENS_DUCK + Utils.getLastRow(SHEET_NAME_LENS_DUCK));
  // Logger.log('raws = ' + raws.length + ' raw = ' + raws[0].length);
  let newRaws = [];
  newRaws.push(HEAD_LENS_DUCK);
  let head = raws.shift();
  makeMembersMap_();
  raws.forEach(
    raw => {
      let arr = convertOldRaw_(raw, head, true)

      if (arr.length < 10) {
        arr.push(...getOldCoachData_(raw));
        // Logger.log('arr length = ' + arr.length);
      }
      // syncOldCoachData_(sheetName, raw)
      if (arr.length == HEAD_LENS_DUCK.length) {  
        newRaws.push(arr);
      }
    }
  );
  // Logger.log('newRaws = ' + newRaws[1].length);
  Utils.exportRawDataToSheet(SHEET_NAME_LENS_DUCK, RANGE_LENS_DUCK + newRaws.length, newRaws);
}

function getHeader_() {
  return Utils.getRemoteValueWithNonLastRowRange(SHEET_ID_MTL_FEEDBACK, SHEET_NAME_MTL_FEEDBACK_FORM_RESPONSES_1, 'A1:AP1')[0];
}

function convertOldRaw_(raw, head, checkOldCoachData=false) {
  if (!head) {
    head = getHeader_();
  }
  // Logger.log('new id = ' + newId + " check old = " + checkOldCoachData);
  let arr = [getNewId_(raw)];

  // .split('-')[0].trim()
  arr.push(getShard_(raw[3]));
  arr.push(new Date(raw[0]));
  // Logger.log("timestamp = " + raw[0] + " " + arr[1]);
  arr.push(getLdapFromEmail_(raw[1]));
  arr.push(raw[2]);
  arr.push(raw[3]);
  arr.push(makeLevelInfo_(levelIndexes_(head), raw));
  arr.push(raw[34]);
  arr.push(raw[40]);

  if (arr.length < 10) {
    arr.push(...getOldCoachData_(raw, checkOldCoachData));
    // Logger.log('arr length = ' + arr.length);
  }
  return arr;
}

function getLdapFromEmail_(email) {
  let ldap = email;
  if (isNull_(email)) {
    ldap = '';
  } else if (typeof email  == 'string' ) {
    ldap = email.split('@')[0];
  } else {
    ldap = email.toString().substring(0,4);
  }
  return ldap;
}

function getNewId_(raw) {
  let ldap = getLdapFromEmail_(raw[1]);
  let timestamp = new Date(raw[0]).getTime();
  return ldap + timestamp;
}

function makeMembersMap_() {
  let members = SchedulesProvider.getAllMembers('tel-mon');
  members.forEach(
    member => {
      MEMBER_MAP.set(member.name, member);
    }
  );
}

function getShard_(name) {
  let shard = '';
  if (MEMBER_MAP.size == 0) {
    makeMembersMap_();
  }
  if (MEMBER_MAP.has(name)) {
    shard = MEMBER_MAP.get(name).shard;
  } else {
    // Logger.log('getShard_ = ' + name + ' has = ' + MEMBER_MAP.has(name) + " " + MEMBER_MAP.size);
  }
  return shard;
}

function getShortedShard_(longName) {
  return longName.split('-')[0].strim();
}

function levelIndexes_(head) {
  let levelIndexes = {};
  levelIndexes.l1indexes = new Set();
  levelIndexes.l2indexes = new Set();
  levelIndexes.l3indexes = new Set();
  for(let i = 0; i < head.length - 1; i++) {
    if (head[i].startsWith(STR_L1)) {
      levelIndexes.l1indexes.add(i);
    } else if (head[i].startsWith(STR_L2)) {
      levelIndexes.l2indexes.add(i);
    } else if (head[i].startsWith(STR_L3)) {
      levelIndexes.l3indexes.add(i);
    }
  }
  // Logger.log('level == ' + JSON.stringify(levelIndexes));
  return levelIndexes;
}

function makeLevelInfo_(levelIndexes, raw) {
  let levelStr = '';
  levelStr = makeInfo_(levelStr, STR_L1, levelIndexes.l1indexes, raw);
  levelStr = makeInfo_(levelStr, STR_L2, levelIndexes.l2indexes, raw);
  levelStr = makeInfo_(levelStr, STR_L3, levelIndexes.l3indexes, raw);
  // Logger.log(levelStr);
  return levelStr;
}

function makeInfo_(str, level, indexSet, raw) {
  for(let index of indexSet) {
    // Logger.log('index = ' + index);
    if (!Utils.isNull(raw[index])) {
      str = str + level + ' ' + raw[index] + '\n';
    }
  }
  return str;
}

function getOldCoachData_(raw, checkOldCoachData=true) {
  let coachRaws = [];
  // Logger.log('raw 3 = ' + raw[3]);
  let coach = ['', '', ''];
  if (!checkOldCoachData || SpreadsheetApp.openById(SHEET_ID_MTL_FEEDBACK).getSheetByName(raw[3]) == null) {
    return coach;
  }
  if (!OLD_COACH_SHEET.has(raw[3])) {
    coachRaws = Utils.getRemoteValueWithNonLastRowRange(SHEET_ID_MTL_FEEDBACK, raw[3], RANGE_OLD_MEMEBER);
    OLD_COACH_SHEET.set(raw[3], coachRaws);
  } else {
    coachRaws = OLD_COACH_SHEET.get(raw[3]);
  }
  for (let i = 0; i < coachRaws.length; i++) {
    if (isOldCoachResult_(coachRaws[i], raw)) {
      coach[0] = coachRaws[i][0];
      coach[1] = getLdapFromEmail_(coachRaws[i][1]);
      coach[2] = coachRaws[i][2];
      return coach;
    }
  }
  return coach;
}

function isOldCoachResult_(coachRecord, raw) {
  return (new Date(raw[0]).getTime() == new Date(coachRecord[4]).getTime() && raw[1] == coachRecord[5] && raw[2] == coachRecord[6]);
}

//=================sync multilens tracker=======================
/**
 * Time tigger every 5 mins
 * entry.1391236998={entry_id}&entry.1564777715={case_number}'
                      + '&entry.1901437745={feedback_type}&entry.1513307715={completed}
 */
function syncMultilensTracker() {
  let coachRaws = getMultilensTrackerRaws_();
  let raws = Utils.getValuesWithNonLastRow(SHEET_NAME_LENS_DUCK, RANGE_LENS_DUCK);
  let newRaws = [];
  for (let i = 0; i < raws.length; i++) {
    if (i == 0) {
      raws[i].push(...HEAD_LENS_DUCK_OLD_COACH);
    } else {
      raws[i].push(...['', '', '', '']);
      raws[i] = getNewCoachRow_(raws[i], coachRaws);
      raws[i][14] = isCompleted_(raws[i]); 
      // raws[i][14] = isCompleted_(raws[i]);
    }
    if (Utils.isNull(raws[i][15])) {
      raws[i][15] = LINK_FORM.replaceAll('{entry_id}', raws[i][0]).replaceAll('{case_number}', raws[i][4]).replaceAll('{feedback_type}', raws[i][8]).replaceAll('{completed}', 'Yes');
    }
    newRaws.push(raws[i]);
  }
  Utils.exportRawDataToSheet(SHEET_NAME_LENS_DUCK, RANGE_LENS_DUCK_ENTIRE + newRaws.length, newRaws);
}

function getNewCoachRow_(lensDuckRaw, coachRaws) {
  coachRaws.forEach(
    coach => {
      if (new Date(lensDuckRaw[2]).getTime() == new Date(coach[1]).getTime() && lensDuckRaw[3] == coach[2].split('@')[0] && lensDuckRaw[4] == coach[4] && lensDuckRaw[5] == coach[3]) {
        lensDuckRaw[10] = coach[9].split('@')[0];
        if (!isNull_(coach[5])) {
          lensDuckRaw[8] = coach[5];
        }
        lensDuckRaw[12] = coach[6];
        lensDuckRaw[13] = coach[0];
        lensDuckRaw[14] = coach[7];
        return lensDuckRaw;
      }
    }
  );
  return lensDuckRaw;
}

function isCompleted_(lensDuckRaw, coachRaw) {
  let flag = false;
  if (!isNull_(lensDuckRaw[9]) || !isNull_(lensDuckRaw[10]) || !isNull_(lensDuckRaw[11]) || lensDuckRaw[12] || lensDuckRaw[14]) {
    flag = true;
  }
  return flag;
}

function isNull_(value) {
  return Utils.isNull(value) || value == 'N/A' || value == '-' || value == 'na';
}

function getMultilensTrackerRaws_() {
  let coachRaws = [];
  coachRaws.push(...filterEmptyRaws_(getRecordsByShard_(makeMultiLensTrackerSheetName_(SHEET_NAME_TRACKER_DATA))));
  coachRaws.push(...filterEmptyRaws_(getRecordsByShard_(makeMultiLensTrackerSheetName_(SHEET_NAME_TRACKER_INFRA))));
  coachRaws.push(...filterEmptyRaws_(getRecordsByShard_(makeMultiLensTrackerSheetName_(SHEET_NAME_TRACKER_NETWORKING))));
  coachRaws.push(...filterEmptyRaws_(getRecordsByShard_(makeMultiLensTrackerSheetName_(SHEET_NAME_TRACKER_PLATFORM))));
  return coachRaws;
}

function makeMultiLensTrackerSheetName_(name) {
  return name + " " + new Date().getFullYear();
}

function getRecordsByShard_(sheetName) {
  return Utils.getRemoteValueWithNonLastRowRange(SHEET_ID_MULTI_LENS_TRACKER, sheetName, RANGE_MULTI_LENS_TRACKER);
}

function filterEmptyRaws_(raws) {
  return raws.filter(
    function (element) {
      return !Utils.isNull(element[1]);
    }
  )
}

//============sync coach form============
function syncForm() {
  let lastRow = Utils.getLastRow(SHEET_NAME_COACH_FORM);
  let raw = Utils.getValues(SHEET_NAME_COACH_FORM, 'A' + lastRow + ':H' + lastRow)[0];
  Logger.log('last raw === ' + raw);
  let record = syncFormToLensDuck_(raw);
  syncNewTraker_(record);
}

function isNotDuplicate_(record) {
  let flag = true;
  let formRaws = Utils.getValuesWithNonLastRow(SHEET_NAME_COACH_FORM, RANGE_COACH_FORM);
  formRaws.forEach(
    raw => {
      if (raw[3] == record[3]) {
        Logger.log('flag = ' + flag);
        flag = false;
      }
    }
  );
  return flag;
}

function syncFormToLensDuck_(form) {
  let raws = Utils.getValuesWithNonLastRow(SHEET_NAME_LENS_DUCK, RANGE_LENS_DUCK_ENTIRE);
  let range = RANGE_LENS_DUCK_SINGLE_ROW;
  let value;
  for (let i = 0; i < raws.length; i++) {
    if (raws[i][0] == form[3]) {
      Logger.log(raws[i][0] + " form == " + form[3]);
      range = range.replaceAll('{row}', i + 1);
      raws[i][9] = form[0];
      raws[i][10] = getLdapFromEmail_(form[1]);
      raws[i][12] = getMeetingPlanBool_(form[2]);
      raws[i][14] = true;
      raws[i][11] = form[5];
      raws[i][8] = form[6];
      raws[i][4] = form[7];     
      Utils.exportRawDataToSheet(SHEET_NAME_LENS_DUCK, range, [raws[i]]);
      return raws[i];
    }
  }
  return null;
}

function getMeetingPlanBool_(plan) {
  return plan == 'yes';
}

//set new tracker========
function syncNewTraker_(record) {
  Logger.log('syncNewTraker_ raw = ' + record);
  let raws = Utils.getRemoteValueWithNonLastRowRange(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), RANGE_MULTI_LENS_TRACKER);

  for(let i = 0; i < raws.length; i++) {
    if ((getLdapFromEmail_(raws[i][2]) + new Date(raws[i][1]).getTime()) == record[0]) {
      Logger.log('==============' + i);
      raws[i][5] = record[8];
      raws[i][6] = record[12];
      raws[i][7] = record[14];
      raws[i][8] = record[11];
      raws[i][9] = record[10] + '@google.com';
      Logger.log('raw = ' + raws[i]);
      Utils.setRemoteCellValue(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), 'I' + (i + 4), record[8]);
      Utils.setRemoteCellValue(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), 'J' + (i + 4), record[12]);
      Utils.setRemoteCellValue(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), 'K' + (i + 4), record[14]);
      Utils.setRemoteCellValue(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), 'L' + (i + 4), record[11]);
      Utils.setRemoteCellValue(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), 'M' + (i + 4), record[10] + '@google.com');
      // Utils.setRemoteValues(SHEET_ID_MULTI_LENS_TRACKER, getTrakerSheetName_(record[1]), RANGE_TRACKER_SINGLE_ROW.replaceAll('{row}', i), [raws[i]]);
    }
  }
}

function getTrakerSheetName_(shardName) {
  let name = '';
  if (shardName.startsWith(SHARD_DATA)) {
    name = SHEET_NAME_TRACKER_DATA;
  } else if (shardName.startsWith(SHARD_INFRA)) {
    name = SHEET_NAME_TRACKER_INFRA;
  } else if (shardName.startsWith(SHARD_NETWORKING)) {
    name = SHEET_NAME_TRACKER_NETWORKING;
  } else if (shardName.startsWith(SHARD_PLATFORM)) {
    name = SHEET_NAME_TRACKER_PLATFORM;
  }
  if (!Utils.isNull(name)) {
    name = makeMultiLensTrackerSheetName_(name);
  }
  return name;
}

/**
 * generate L data
 */
function generateLColumns_() {
  let raws = Utils.getValues(SHEET_NAME_LENS_DUCK, RANGE_LENS_DUCK_ENTIRE);
  let lRaws = [];
  for (let i = 0; i < raws.length; i++) {
    if (i == 0) {
      lRaws.push(HEAD_LENS_DUCK_STATISTICS);
    } else {
      lRaws.push(makeLs_(raws[i][6]));
    } 
  }
  Utils.exportRawDataToSheet(SHEET_NAME_LENS_DUCK, RANGE_L_COLUMNS + lRaws.length, lRaws);
}

function makeLs_(lStr) {
  let ls = lStr.split('\n');
  let lRaw = ['', '', ''];
  ls.forEach(
    l => {
      if (l.includes(STR_L1)) {
        lRaw[0] = l;
      } else if (l.includes(STR_L2)) {
        lRaw[1] = l;
      } else if (l.includes(STR_L3)) {
        lRaw[2] = l;
      }
    }
  );
  return lRaw;
}

function getRowLength_() {

}

function testSync() {
  // generateLColumns_();
  syncMtlFeedbackSheet_();
  syncMultilensTracker();
  syncForm();
  generateLColumns_();
  // Logger.log('id = ' + getNewId_());
  // getShard_('');
}
