import { redirect } from 'next/navigation';

/**
 * /admin is no longer a landing page — every admin section lives in the
 * council sidebar. Anyone hitting /admin gets bounced to Completion Review,
 * which is the canonical default queue.
 */
export default function AdminIndexPage() {
  redirect('/admin/completions');
}
