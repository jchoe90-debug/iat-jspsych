const PARTICIPANTS_SHEET_NAME = "Participants";
const TRIALS_SHEET_NAME = "Trials";

const PARTICIPANT_BASE_COLUMNS = [
  "participant_id",
  "submitted_at",
  "participant_type",
  "user_agent",
  "total_trials"
];

const TRIAL_COLUMNS = [
  "participant_id",
  "submitted_at",
  "participant_type",
  "trial_index",
  "task",
  "set",
  "condition",
  "stimulus",
  "stim_class",
  "correct_response",
  "response",
  "correct",
  "rt",
  "rt_initial",
  "trial_type",
  "time_elapsed"
];

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No POST body received.");
    }

    const payload = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const participantSheet = spreadsheet.getSheetByName(PARTICIPANTS_SHEET_NAME) ||
      spreadsheet.insertSheet(PARTICIPANTS_SHEET_NAME);
    const trialsSheet = spreadsheet.getSheetByName(TRIALS_SHEET_NAME) ||
      spreadsheet.insertSheet(TRIALS_SHEET_NAME);

    appendParticipantRow(participantSheet, payload);
    appendTrialRows(trialsSheet, payload);

    return jsonResponse({ ok: true });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function appendParticipantRow(sheet, payload) {
  const rowObject = buildParticipantRow(payload);
  const headers = ensureHeaders(sheet, Object.keys(rowObject), PARTICIPANT_BASE_COLUMNS);
  const row = headers.map(function(header) {
    return rowObject[header] === undefined ? "" : rowObject[header];
  });

  sheet.appendRow(row);
}

function buildParticipantRow(payload) {
  const trials = Array.isArray(payload.trials) ? payload.trials : [];
  const row = {
    participant_id: payload.participant_id || "",
    submitted_at: payload.submitted_at || "",
    participant_type: payload.participant_type || "",
    user_agent: payload.user_agent || "",
    total_trials: trials.length
  };

  trials.forEach(function(trial) {
    if (!trial.response || typeof trial.response !== "object") {
      return;
    }

    Object.keys(trial.response).forEach(function(questionName) {
      row[questionName] = normalizeResponseValue(trial.response[questionName]);
    });
  });

  return row;
}

function appendTrialRows(sheet, payload) {
  ensureHeaders(sheet, TRIAL_COLUMNS, TRIAL_COLUMNS);

  const trials = Array.isArray(payload.trials) ? payload.trials : [];
  const iatRows = trials
    .map(function(trial, index) {
      return { trial: trial, index: index };
    })
    .filter(function(item) {
      return item.trial.task === "IAT" || item.trial.task === "IAT_error_correction";
    })
    .map(function(item) {
      const trial = item.trial;
      return [
        payload.participant_id || "",
        payload.submitted_at || "",
        payload.participant_type || "",
        item.index + 1,
        trial.task || "",
        trial.set || "",
        trial.condition || "",
        trial.stimulus || "",
        trial.stim_class || "",
        trial.correct_response || "",
        normalizeResponseValue(trial.response),
        trial.correct === undefined ? "" : trial.correct,
        trial.rt === undefined ? "" : trial.rt,
        trial.rt_initial === undefined ? "" : trial.rt_initial,
        trial.trial_type || "",
        trial.time_elapsed === undefined ? "" : trial.time_elapsed
      ];
    });

  if (iatRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, iatRows.length, TRIAL_COLUMNS.length).setValues(iatRows);
  }
}

function normalizeResponseValue(value) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  return value;
}

function ensureHeaders(sheet, newColumns, baseColumns) {
  const existingHeaders = getExistingHeaders(sheet);
  const headers = existingHeaders.length > 0 ? existingHeaders.slice() : baseColumns.slice();

  newColumns.forEach(function(column) {
    if (headers.indexOf(column) === -1) {
      headers.push(column);
    }
  });

  if (existingHeaders.length === 0) {
    sheet.appendRow(headers);
    return headers;
  }

  if (headers.length !== existingHeaders.length) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return headers;
}

function getExistingHeaders(sheet) {
  if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
    return [];
  }

  return sheet
    .getRange(1, 1, 1, sheet.getLastColumn())
    .getValues()[0]
    .filter(function(header) {
      return header !== "";
    });
}

function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
