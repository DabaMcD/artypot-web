/**
 * Temporary platform feature flags.
 *
 * SMS_ENABLED — SMS notifications are turned OFF platform-wide for now. Sending
 * SMS requires carrier/A2P 10DLC registration we haven't completed yet, so:
 *   - the backend SmsService::send() is short-circuited
 *     (artypot-api/app/Services/SmsService.php), and
 *   - the phone-number field plus the SMS columns in both the fan and creator
 *     notification settings are hidden while this is false.
 *
 * TO RE-ENABLE SMS: follow artypot-api/docs/sms-reenable-runbook.md — flip
 * this flag and the backend SMS_ENABLED env flag together. (The backend code
 * needs no edits; everything is gated on config('artypot.sms_enabled').)
 */
export const SMS_ENABLED = false;
