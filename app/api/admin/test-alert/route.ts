import { json } from '@/lib/http';
import { sendTestAlert } from '@/lib/notify';

export async function POST() {
  return json(await sendTestAlert());
}
