const SHEET_NAME = "Responses";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No POST body received.");
    }

    const payload = JSON.parse(e.postData.contents);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
    const rows = buildRows(payload);

    ensureHeader(sheet);

    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }

    return jsonResponse({ ok: true, rows: rows.length });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error && error.message ? error.message : error) });
  }
}

function buildRows(payload) {
  const trials = Array.isArray(payload.trials) ? payload.trials : [];

  return trials.map(function(trial, index) {
    return [
      payload.participant_id || "",
      payload.submitted_at || "",
      payload.participant_type || "",
      payload.user_agent || "",
      index + 1,
      trial.task || "",
      trial.scale || "",
      trial.set || "",
      trial.condition || "",
      trial.stimulus || "",
      trial.stim_class || "",
      trial.correct_response || "",
      trial.response === undefined ? "" : JSON.stringify(trial.response),
      trial.correct === undefined ? "" : trial.correct,
      trial.rt === undefined ? "" : trial.rt,
      trial.rt_initial === undefined ? "" : trial.rt_initial,
      trial.trial_type || "",
      trial.time_elapsed === undefined ? "" : trial.time_elapsed,
      JSON.stringify(trial)
    ];
  });
}

function ensureHeader(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.appendRow([
    "participant_id",
    "submitted_at",
    "participant_type",
    "user_agent",
    "trial_index",
    "task",
    "scale",
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
    "time_elapsed",
    "raw_trial_json"
  ]);
}

function jsonResponse(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
