
import MainLayout from "@/components/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

const freePerks = [
    "3 AI Generations per minute",
    "Full Inventory Management",
    "Basic Meal Planning",
    "Shopping List Generation",
];

const premiumPerks = [
    "Unlimited AI Generations",
    "Advanced Recipe Discovery",
    "AI-Powered Substitutions",
    "Detailed Nutritional Analysis",
    "Family Plan Sharing (Coming Soon)",
];

export default function SubscriptionsPage() {
  return (
    <MainLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
         <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground">
                Choose the plan that's right for you.
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <Card>
                <CardHeader>
                    <CardTitle>Free Plan</CardTitle>
                    <CardDescription>Perfect for getting started and casual use.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-3xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                    <ul className="space-y-2">
                        {freePerks.map(perk => (
                            <li key={perk} className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-500" />
                                <span className="text-muted-foreground">{perk}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button variant="outline" className="w-full" disabled>
                        Currently Active
                    </Button>
                </CardFooter>
            </Card>

             <Card className="border-primary">
                <CardHeader>
                    <div className="flex justify-between items-center">
                         <CardTitle>Premium Plan</CardTitle>
                         <span className="text-xs font-semibold bg-primary text-primary-foreground px-2 py-1 rounded-full">Coming Soon!</span>
                    </div>
                    <CardDescription>Unlock the full power of CookSmart AI.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <p className="text-3xl font-bold">$9.99<span className="text-sm font-normal text-muted-foreground">/month</span></p>
                     <ul className="space-y-2">
                        {premiumPerks.map(perk => (
                            <li key={perk} className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-green-500" />
                                <span>{perk}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" disabled>
                        Upgrade to Premium
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </MainLayout>
  );
}