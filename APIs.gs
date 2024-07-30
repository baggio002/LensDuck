function convertOldFormRowForLensDuck(raw) {
  return convertOldRaw_(raw, false);
}

function getEntireRowRange() {
  return RANGE_ENTIRE_ROW;
}

function getRowLength() {
  return ROW_LENGTH;
}

function generateLColumns(str) {
  return makeLs_(str);
}

