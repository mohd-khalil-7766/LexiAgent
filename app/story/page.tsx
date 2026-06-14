import { AppShell } from "@/components/AppShell";
import { StoryClient } from "./StoryClient";

export default function StoryPage() {
  return (
    <AppShell
      eyebrow="AI STORY BUILDER"
      title="AI vocabulary paragraph practice"
      description="Enter one word or many words. LexiAgent will generate a clean learner paragraph using all selected words, translate it, and provide audio review."
    >
      <StoryClient />
    </AppShell>
  );
}