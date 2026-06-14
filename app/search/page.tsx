import { AppShell } from "@/components/AppShell";
import { SearchClient } from "./SearchClient";

export default function SearchPage() {
  return (
    <AppShell
      eyebrow="AGENT SEARCH"
      title="AI Example Search"
      description="Add new vocabulary by searching authentic web sources, generating multilingual explanation, and saving the result to Supabase."
    >
      <SearchClient />
    </AppShell>
  );
}
