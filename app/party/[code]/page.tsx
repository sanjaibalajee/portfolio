import { notFound } from 'next/navigation';
import { partyConnection } from '@/lib/party/config';
import { PartyRoomClient } from '@/components/party/room';
export const metadata = {
  title: 'private party | sanjai balajee',
  robots: { index: false, follow: false },
  referrer: 'no-referrer' as const,
};
export const dynamic = 'force-dynamic';
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ display?: string }>;
}) {
  const { code } = await params;
  const { display } = await searchParams;
  if (!/^[A-Z2-9]{6}$/.test(code)) notFound();
  return <PartyRoomClient code={code} display={display === '1'} {...partyConnection()} />;
}
