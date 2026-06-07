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
 * TO RE-ENABLE SMS: set this to true and remove the early return in the
 * backend SmsService::send().
 */
export const SMS_ENABLED = false;
