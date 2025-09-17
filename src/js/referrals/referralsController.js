(function (global) {
  const TMS = global.TMS = global.TMS || {};
  const Referrals = TMS.Referrals = TMS.Referrals || {};
  const Store = TMS.Store;

  // Cached DOM refs (populated on init)
  let referralsListBody = null;
  let referralChildrenDatalist = null;
  let referralAssignSelect = null;
  let addNewReferralButton = null;

  // Public: initialize DOM references (no event wiring yet to avoid double-binding with app.js)
  function init() {
    referralsListBody = document.getElementById('referrals-list-body');
    referralChildrenDatalist = document.getElementById('referral-children-list');
    referralAssignSelect = document.getElementById('referral-assign-select');
    addNewReferralButton = document.getElementById('add-new-referral-button');
  }

  // Public: remove any unsaved draft rows (mirrors current app.js behavior)
  function cleanupDraft() {
    if (!referralsListBody) return;
    referralsListBody.querySelectorAll('tr.new-referral-row').forEach((draftRow) => {
      const next = draftRow.nextElementSibling;
      try { referralsListBody.removeChild(draftRow); } catch (e) {}
      if (next && next.classList.contains('referral-edit-row')) {
        try { referralsListBody.removeChild(next); } catch (e) {}
      }
    });
  }

  // Public: rebuild the child datalist (Child Name — #ID)
  function buildChildDatalist() {
    if (!referralChildrenDatalist) return;
    const refs = Store.getReferrals() || [];
    referralChildrenDatalist.innerHTML = '';
    const sorted = [...refs].sort((a, b) => {
      const an = (a.childName || '').toLowerCase();
      const bn = (b.childName || '').toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      const aid = (a.childId || '').toLowerCase();
      const bid = (b.childId || '').toLowerCase();
      return aid.localeCompare(bid);
    });
    sorted.forEach((r) => {
      const name = (r.childName || '').trim();
      const cid = (r.childId || '').trim();
      if (!name && !cid) return;
      const display = cid ? `${name} — #${cid}` : name;
      const opt = document.createElement('option');
      opt.value = display;
      referralChildrenDatalist.appendChild(opt);
    });
  }

  // Public: rebuild assignment options for Edit Booking -> Assign from Referral
  function buildAssignOptions() {
    referralAssignSelect = referralAssignSelect || document.getElementById('referral-assign-select');
    if (!referralAssignSelect) return;
    const refs = Store.getReferrals() || [];
    const prev = referralAssignSelect.value;
    referralAssignSelect.innerHTML = '<option value="">Select child from referrals...</option>';
    const sorted = [...refs].sort((a, b) => {
      const an = (a.childName || '').toLowerCase();
      const bn = (b.childName || '').toLowerCase();
      if (an !== bn) return an.localeCompare(bn);
      const aid = (a.childId || '').toLowerCase();
      const bid = (b.childId || '').toLowerCase();
      return aid.localeCompare(bid);
    });
    sorted.forEach((r) => {
      const name = (r.childName || '').trim();
      const cid = (r.childId || '').trim();
      if (!name && !cid) return;
      const opt = document.createElement('option');
      opt.value = r.id;
      opt.textContent = cid ? `${name} — #${cid}` : name;
      referralAssignSelect.appendChild(opt);
    });
    if ([...referralAssignSelect.options].some(o => o.value === prev)) {
      referralAssignSelect.value = prev;
    }
  }

  // Public: render referrals table (placeholder; app.js currently owns full render)
  function renderList() {
    // Intentionally left minimal to avoid double ownership with app.js.
    // This module will take over rendering when app.js is refactored to delegate.
  }

  // Public: add-new-inline handler (placeholder; app.js currently owns this flow)
  function addNewReferralInline() {
    // Intentionally left minimal for now; app.js binds and implements this logic.
    // This will be fully moved here in a later refactor step.
  }

  Referrals.init = init;
  Referrals.cleanupDraft = cleanupDraft;
  Referrals.buildChildDatalist = buildChildDatalist;
  Referrals.buildAssignOptions = buildAssignOptions;
  Referrals.renderList = renderList;
  Referrals.addNewReferralInline = addNewReferralInline;

})(window);
