/**
 * Backend ผ่าน Supabase RPC — ใช้เมื่อ CONFIG.DATA_PROVIDER === 'supabase'
 */
const SupabaseApi = {
  async rpc(fn, params) {
    const { data, error } = await SupabaseClient.get().rpc(fn, params);
    if (error) {
      throw new Error(error.message || 'Supabase RPC ล้มเหลว');
    }
    if (data && data.success === false) {
      throw new Error(data.error || 'คำขอล้มเหลว');
    }
    return data;
  },

  tokenFrom(data) {
    return (typeof AuthStore !== 'undefined' ? AuthStore.getToken() : null) ||
      data.sessionToken || null;
  },

  async invoke(action, data = {}, opts = {}) {
    const token = this.tokenFrom(data);

    if (action === 'getProjects' && !opts.skipCache) {
      const cached = DataCache.get();
      if (cached) return { success: true, ...cached };
    }

    let res;
    switch (action) {
      case 'ping':
        res = { success: true, message: 'Renew Aleart Supabase', version: '2.0.0' };
        break;
      case 'login':
        res = await this.rpc('api_login', {
          p_username: data.username,
          p_password: data.password
        });
        break;
      case 'logout':
        res = await this.rpc('api_logout', { p_token: token });
        break;
      case 'validateSession':
        res = await this.rpc('api_validate_session', { p_token: token });
        break;
      case 'listUsers':
        res = await this.rpc('api_list_users', { p_token: token });
        break;
      case 'saveUser':
        res = await this.rpc('api_save_user', { p_token: token, p_data: data });
        break;
      case 'deleteUser':
        res = await this.rpc('api_delete_user', {
          p_token: token,
          p_user_id: Number(data.id)
        });
        break;
      case 'getProjects':
        res = await this.rpc('api_get_projects', { p_token: token });
        res._fromApi = true;
        if (res.projects) {
          DataCache.set({ projects: res.projects, departments: res.departments });
        }
        break;
      case 'getLicenseDetail':
        res = await this.rpc('api_get_license_detail', {
          p_token: token,
          p_license_id: Number(data.licenseId)
        });
        break;
      case 'saveProject':
        res = await this.rpc('api_save_project', { p_token: token, p_data: data });
        break;
      case 'deleteProject':
        res = await this.rpc('api_delete_project', {
          p_token: token,
          p_project_id: Number(data.id)
        });
        break;
      case 'saveLicense': {
        const payload = { ...data };
        if (typeof payload.steps === 'string') {
          payload.steps = payload.steps.split('\n').map(s => s.trim()).filter(Boolean);
        } else if (!payload.steps) {
          payload.steps = [
            'แจ้งผู้รับเหมา/ทีมงานที่เกี่ยวข้อง',
            'ขอเอกสารสนับสนุนจากลูกค้า',
            'ได้รับเอกสารครบถ้วน',
            'ยื่นดำเนินการต่อใบอนุญาตกับหน่วยงานรัฐ',
            'แจ้งผลให้ลูกค้าทราบ',
            'เสร็จสิ้นสมบูรณ์'
          ];
        }
        res = await this.rpc('api_save_license', { p_token: token, p_data: payload });
        break;
      }
      case 'saveLicenseSteps':
        res = await this.rpc('api_save_license_steps', { p_token: token, p_data: data });
        break;
      case 'saveTimelineUpdate':
        res = await this.rpc('api_save_timeline_update', { p_token: token, p_data: data });
        break;
      case 'completeRenewal':
        res = await this.rpc('api_complete_renewal', { p_token: token, p_data: data });
        break;
      case 'saveDepartment':
        res = await this.rpc('api_save_department', { p_token: token, p_data: data });
        break;
      case 'deleteDepartment':
        res = await this.rpc('api_delete_department', {
          p_token: token,
          p_dept_id: Number(data.id)
        });
        break;
      case 'sendTestEmail':
        throw new Error('การส่งอีเมลยังไม่รองรับในโหมด Supabase — ใช้ DATA_PROVIDER: "gas" หรือตั้งค่า SMTP แยก');
      case 'setupSpreadsheet':
        throw new Error('setupSpreadsheet ใช้กับ Google Sheets เท่านั้น');
      default:
        throw new Error('Unknown action: ' + action);
    }

    if (action === 'login' && /เข้าสู่ระบบ|Unauthorized|เซสชัน/i.test(String(res?.error || ''))) {
      /* handled by rpc throw */
    }
    return res;
  },

  ping() {
    return Promise.resolve({ success: true, message: 'Renew Aleart Supabase', version: '2.0.0' });
  }
};
