/**
 * ระบบเข้าสู่ระบบ — ผู้ใช้เก็บใน Sheet Users, session ใน Script Cache
 */
var AuthService = (function () {
  var USER_HEADERS = ['id', 'username', 'passwordHash', 'displayName', 'role', 'active', 'createdAt', 'updatedAt'];
  var SESSION_PREFIX = 'sess_';
  var SESSION_TTL_SEC = 21600; // 6 ชม.
  var SEED_KEY = 'USERS_ADMIN_SEEDED';

  function usersSheet_() {
    return CONFIG.SHEETS.USERS;
  }

  function hashPassword_(password) {
    var props = PropertiesService.getScriptProperties();
    var salt = props.getProperty('AUTH_SALT');
    if (!salt) {
      salt = Utilities.getUuid();
      props.setProperty('AUTH_SALT', salt);
    }
    var digest = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      String(password) + ':' + salt
    );
    return Utilities.base64Encode(digest);
  }

  function ensureUsersSheet_() {
    var ss = getSpreadsheet_();
    var sheet = ss.getSheetByName(usersSheet_());
    if (!sheet) {
      SheetService.ensureSheet_(ss, usersSheet_(), USER_HEADERS);
    }
    seedAdminIfEmpty_();
  }

  function seedAdminIfEmpty_() {
    var props = PropertiesService.getScriptProperties();
    var rows = SheetService.readTable_(usersSheet_());
    if (rows.length > 0) {
      props.setProperty(SEED_KEY, '1');
      return;
    }

    var adminUser = CONFIG.DEFAULT_ADMIN || {};
    SheetService.appendRow_(usersSheet_(), {
      id: Date.now(),
      username: adminUser.username || 'admin',
      passwordHash: hashPassword_(adminUser.password || '1234'),
      displayName: adminUser.displayName || 'ผู้ดูแลระบบ',
      role: 'admin',
      active: 'true'
    }, USER_HEADERS);
    props.setProperty(SEED_KEY, '1');
  }

  function readUsers_() {
    ensureUsersSheet_();
    return SheetService.readTable_(usersSheet_());
  }

  function findUserByUsername_(username) {
    var u = String(username || '').trim().toLowerCase();
    if (!u) return null;
    var rows = readUsers_();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].username).toLowerCase() === u) return rows[i];
    }
    return null;
  }

  function findUserById_(id) {
    var rows = readUsers_();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].id) === String(id)) return rows[i];
    }
    return null;
  }

  function toPublicUser_(row) {
    if (!row) return null;
    return {
      id: Number(row.id),
      username: String(row.username),
      displayName: String(row.displayName || row.username),
      role: String(row.role || 'user'),
      active: row.active === true || row.active === 'true' || row.active === 1 || row.active === '1'
    };
  }

  function createSession_(user) {
    var token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
    var payload = JSON.stringify({
      userId: Number(user.id),
      username: String(user.username),
      role: String(user.role || 'user'),
      displayName: String(user.displayName || user.username)
    });
    CacheService.getScriptCache().put(SESSION_PREFIX + token, payload, SESSION_TTL_SEC);
    var expiresAt = new Date(Date.now() + SESSION_TTL_SEC * 1000).toISOString();
    return { token: token, expiresAt: expiresAt };
  }

  function validateSession_(token) {
    if (!token) return null;
    var raw = CacheService.getScriptCache().get(SESSION_PREFIX + String(token));
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      var user = findUserById_(data.userId);
      if (!user) return null;
      if (!(user.active === true || user.active === 'true' || user.active === 1 || user.active === '1')) {
        return null;
      }
      return toPublicUser_(user);
    } catch (e) {
      return null;
    }
  }

  function requireAuth_(token) {
    var user = validateSession_(token);
    if (!user) throw new Error('กรุณาเข้าสู่ระบบ');
    return user;
  }

  function requireAdmin_(token) {
    var user = requireAuth_(token);
    if (user.role !== 'admin') throw new Error('เฉพาะผู้ดูแลระบบเท่านั้น');
    return user;
  }

  function login(data) {
    ensureUsersSheet_();
    var username = (data.username || '').trim();
    var password = data.password || '';
    if (!username || !password) throw new Error('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');

    var row = findUserByUsername_(username);
    if (!row) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    if (!(row.active === true || row.active === 'true' || row.active === 1 || row.active === '1')) {
      throw new Error('บัญชีนี้ถูกปิดใช้งาน');
    }
    var expected = hashPassword_(password);
    var stored = String(row.passwordHash || '').trim();
    if (stored !== expected) {
      throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    var session = createSession_(row);
    return {
      success: true,
      token: session.token,
      expiresAt: session.expiresAt,
      user: toPublicUser_(row)
    };
  }

  function logout(data) {
    var token = data && data.sessionToken;
    if (token) CacheService.getScriptCache().remove(SESSION_PREFIX + String(token));
    return { success: true };
  }

  function validateSession(data) {
    var user = validateSession_(data && data.sessionToken);
    if (!user) throw new Error('เซสชันหมดอายุ — กรุณาเข้าสู่ระบบใหม่');
    return { success: true, user: user };
  }

  function listUsers(data) {
    requireAdmin_(data.sessionToken);
    return {
      success: true,
      users: readUsers_().map(function (r) {
        return toPublicUser_(r);
      })
    };
  }

  function saveUser(data) {
    requireAdmin_(data.sessionToken);

    var username = (data.username || '').trim();
    var displayName = (data.displayName || '').trim() || username;
    var role = data.role === 'admin' ? 'admin' : 'user';
    var active = data.active === false || data.active === 'false' ? 'false' : 'true';
    var id = data.id ? Number(data.id) : null;
    var password = data.password || '';

    if (!username) throw new Error('กรุณาระบุชื่อผู้ใช้');
    if (username.length < 2) throw new Error('ชื่อผู้ใช้สั้นเกินไป');

    var rows = readUsers_();
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].username).toLowerCase() === username.toLowerCase() &&
          String(rows[i].id) !== String(id || '')) {
        throw new Error('มีชื่อผู้ใช้นี้อยู่แล้ว');
      }
    }

    var rowObj = {
      id: id || '',
      username: username,
      displayName: displayName,
      role: role,
      active: active,
      createdAt: ''
    };

    if (id) {
      var existing = findUserById_(id);
      if (!existing) throw new Error('ไม่พบผู้ใช้');
      rowObj.passwordHash = existing.passwordHash;
      if (password) rowObj.passwordHash = hashPassword_(password);
    } else {
      if (!password) throw new Error('กรุณาตั้งรหัสผ่านสำหรับผู้ใช้ใหม่');
      rowObj.passwordHash = hashPassword_(password);
    }

    var newId = SheetService.upsertRow_(usersSheet_(), id, rowObj, USER_HEADERS);
    return { success: true, id: newId, user: toPublicUser_(findUserById_(newId)) };
  }

  function deleteUser(data) {
    var admin = requireAdmin_(data.sessionToken);
    var id = Number(data.id);
    if (!id) throw new Error('ไม่พบผู้ใช้');
    if (Number(admin.id) === id) throw new Error('ไม่สามารถลบบัญชีของตัวเองได้');

    var rows = readUsers_();
    var target = null;
    for (var i = 0; i < rows.length; i++) {
      if (Number(rows[i].id) === id) {
        target = rows[i];
        break;
      }
    }
    if (!target) throw new Error('ไม่พบผู้ใช้');

    if (target.role === 'admin') {
      var adminCount = 0;
      rows.forEach(function (r) {
        if (r.role === 'admin' && (r.active === true || r.active === 'true' || r.active === 1 || r.active === '1')) {
          adminCount++;
        }
      });
      if (adminCount <= 1) throw new Error('ต้องมีผู้ดูแลระบบอย่างน้อย 1 คน');
    }

    var ss = SheetService.ensureInitialized();
    var sheet = ss.getSheetByName(usersSheet_());
    var dataRange = sheet.getDataRange().getValues();
    for (var r = 1; r < dataRange.length; r++) {
      if (Number(dataRange[r][0]) === id) {
        sheet.deleteRow(r + 1);
        break;
      }
    }
    return { success: true, id: id };
  }

  return {
    hashPassword_: hashPassword_,
    ensureUsersSheet_: ensureUsersSheet_,
    validateSession_: validateSession_,
    requireAuth_: requireAuth_,
    login: login,
    logout: logout,
    validateSession: validateSession,
    listUsers: listUsers,
    saveUser: saveUser,
    deleteUser: deleteUser
  };
})();
