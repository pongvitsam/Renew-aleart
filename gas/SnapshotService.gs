/**
 * อัปเดต docs/data/payload.json บน GitHub เพื่อโหลดครั้งแรก < 3 วินาที (GitHub Pages)
 * ตั้ง Script Properties: GITHUB_TOKEN (PAT repo scope), GITHUB_REPO (เช่น pongvitsam/Renew-aleart)
 */
var SnapshotService = (function () {
  var FILE_PATH = 'docs/data/payload.json';
  var DEBOUNCE_SEC = 45;

  function buildJson_(payload) {
    return JSON.stringify({
      version: 1,
      updatedAt: Date.now(),
      projects: payload.projects || [],
      departments: payload.departments || []
    });
  }

  function scheduleUpdate_() {
    try {
      var cache = CacheService.getScriptCache();
      cache.put('snapshot_pending', '1', 120);
      var exists = ScriptApp.getProjectTriggers().some(function (t) {
        return t.getHandlerFunction() === 'runSnapshotExport_';
      });
      if (exists) return;
      ScriptApp.newTrigger('runSnapshotExport_')
        .timeBased()
        .after(DEBOUNCE_SEC * 1000)
        .create();
    } catch (e) {
      Logger.log('scheduleUpdate_: ' + e.message);
    }
  }

  function runSnapshotExport_() {
    ScriptApp.getProjectTriggers().forEach(function (t) {
      if (t.getHandlerFunction() === 'runSnapshotExport_') {
        ScriptApp.deleteTrigger(t);
      }
    });
    try {
      exportSnapshotNow_();
    } catch (e) {
      Logger.log('runSnapshotExport_: ' + e.message);
    }
  }

  function exportSnapshotNow_() {
    PayloadCache.clear();
    var payload = SheetService.getPayload();
    var json = buildJson_(payload);
    var gh = publishToGithub_(json);
    return {
      success: true,
      updatedAt: Date.now(),
      github: gh,
      projects: payload.projects.length
    };
  }

  function publishToGithub_(json) {
    var props = PropertiesService.getScriptProperties();
    var token = props.getProperty('GITHUB_TOKEN');
    if (!token) return { skipped: true, reason: 'no GITHUB_TOKEN' };

    var repo = props.getProperty('GITHUB_REPO') || 'pongvitsam/Renew-aleart';
    var apiBase = 'https://api.github.com/repos/' + repo + '/contents/' + FILE_PATH;
    var sha = '';

    var getRes = UrlFetchApp.fetch(apiBase, {
      method: 'get',
      muteHttpExceptions: true,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json'
      }
    });
    if (getRes.getResponseCode() === 200) {
      var existing = JSON.parse(getRes.getContentText());
      sha = existing.sha || '';
    }

    var body = {
      message: 'chore: sync payload snapshot',
      content: Utilities.base64Encode(json, Utilities.Charset.UTF_8),
      committer: {
        name: 'Renew Aleart Bot',
        email: 'renew-aleart-bot@users.noreply.github.com'
      }
    };
    if (sha) body.sha = sha;

    var putRes = UrlFetchApp.fetch(apiBase, {
      method: 'put',
      muteHttpExceptions: true,
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(body)
    });

    var code = putRes.getResponseCode();
    if (code >= 200 && code < 300) {
      return { ok: true, repo: repo };
    }
    return { ok: false, code: code, body: putRes.getContentText().slice(0, 500) };
  }

  return {
    scheduleUpdate_: scheduleUpdate_,
    exportSnapshotNow: exportSnapshotNow_
  };
})();

function runSnapshotExport_() {
  SnapshotService.exportSnapshotNow();
}

function exportSnapshot() {
  return SnapshotService.exportSnapshotNow();
}
