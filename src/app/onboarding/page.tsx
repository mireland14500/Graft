import { SPORTS, type Sport } from "@/lib/sports";
import { OnboardingWizard } from "./OnboardingWizard";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const { sport } = await searchParams;
  const initialSport = SPORTS.includes(sport as Sport) ? (sport as Sport) : undefined;
  return <OnboardingWizard initialSport={initialSport} />;
}
