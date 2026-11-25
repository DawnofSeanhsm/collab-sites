/* ------------------------------------------------------------------
   Seoul Sweets x Notre Don: the only file you need to edit.
   Save, then redeploy (vercel --prod). Nothing else has to change.
------------------------------------------------------------------- */
window.SITE = {

  /* Google Apps Script web app URL (ends in /exec).
     While this is '' the page shows "Pre-orders open soon" and takes no holds.
     Once it is set, the page reads its state from the Config tab of the
     Collab Signups sheet, so you open and close waves from the sheet, not here. */
  api: 'https://script.google.com/macros/s/AKfycbydX7Bb7yFQtnByL6bRGH1aUJPVYXlehpAGAqFgTia_kKcRmljkHyrZ2-yjauJmNNI/exec',

  /* Shown to guests before the sheet answers, and if it cannot be reached. */
  holdTime: '2:30 PM'
};
