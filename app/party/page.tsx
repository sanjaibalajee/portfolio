import { pageMetadata } from "@/lib/site";
import { partyConnection } from "@/lib/party/config";
import { PartyHome } from "@/components/party/home";
import { contentStock } from "@/lib/party/content";
export const metadata = pageMetadata(
  "/party",
  "party",
  "A little multiplayer chaos. Imposter, Psych, drawing relays and games for your group chat.",
);
export const dynamic = "force-dynamic";
export default function Page() {
  return (
    <PartyHome
      {...partyConnection()}
      stock={contentStock({ custom: [], history: [] })}
    />
  );
}
