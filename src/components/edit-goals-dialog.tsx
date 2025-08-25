
"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { Settings, PersonalDetails } from "@/lib/types";
import { saveSettings } from "@/app/actions";
import { Loader2, Sparkles, Send } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { generateGoalSuggestions } from "@/ai/flows/generate-goal-suggestions";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";

const formSchema = z.object({
  calorieGoal: z.coerce.number().int().min(0, "Must be a positive number."),
  proteinGoal: z.coerce.number().int().min(0, "Must be a positive number."),
  carbsGoal: z.coerce.number().int().min(0, "Must be a positive number."),
  fatGoal: z.coerce.number().int().min(0, "Must be a positive number."),
});

type ConversationEntry = {
    role: 'user' | 'assistant';
    content: string;
};

export function EditGoalsDialog({
  isOpen,
  setIsOpen,
  settings,
  personalDetails,
  onGoalsUpdated,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  settings: Settings;
  personalDetails: PersonalDetails;
  onGoalsUpdated: (newSettings: Settings) => void;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isAiPending, startAiTransition] = useTransition();
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const [aiQuestion, setAiQuestion] = useState<string | null>(null);
  const [userResponse, setUserResponse] = useState("");
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      calorieGoal: settings.calorieGoal,
      proteinGoal: settings.proteinGoal,
      carbsGoal: settings.carbsGoal,
      fatGoal: settings.fatGoal,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        calorieGoal: settings.calorieGoal,
        proteinGoal: settings.proteinGoal,
        carbsGoal: settings.carbsGoal,
        fatGoal: settings.fatGoal,
      });
      setConversation([]);
      setAiQuestion(null);
      setUserResponse("");
    }
  }, [isOpen, settings, form]);

  const handleAskAI = () => {
    startAiTransition(async () => {
        setConversation(prev => [...prev, {role: 'user', content: userResponse}]);
        
        const result = await generateGoalSuggestions({
            personalDetails,
            history: [...conversation, {role: 'user', content: userResponse}],
        });
        
        setUserResponse("");

        if ('recommendation' in result) {
            setAiQuestion(null);
            const { recommendation, reasoning } = result;
            form.reset({
                calorieGoal: recommendation.calories,
                proteinGoal: recommendation.protein,
                carbsGoal: recommendation.carbs,
                fatGoal: recommendation.fat,
            });
            setConversation(prev => [...prev, {role: 'assistant', content: reasoning}]);
            toast({ title: "AI Recommendation", description: "The AI has provided a recommendation. Review and save." });
        } else if ('question' in result) {
            setAiQuestion(result.question);
            setConversation(prev => [...prev, {role: 'assistant', content: result.question}]);
        } else {
            toast({ variant: "destructive", title: "AI Error", description: result.error || "An unknown error occurred." });
        }
    });
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSaving(true);
    const newSettings = { ...settings, ...values };
    await saveSettings(newSettings);
    onGoalsUpdated(newSettings);
    setIsSaving(false);
    setIsOpen(false);
    toast({
      title: "Goals Updated",
      description: "Your daily nutrition goals have been saved.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Daily Nutrition Goals</DialogTitle>
          <DialogDescription>
            Set your daily targets for calories and macronutrients. You can also ask our AI for help!
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-4">
            {/* Left side: Form */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField control={form.control} name="calorieGoal" render={({ field }) => ( <FormItem><FormLabel>Calories (kcal)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="proteinGoal" render={({ field }) => ( <FormItem><FormLabel>Protein (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="carbsGoal" render={({ field }) => ( <FormItem><FormLabel>Carbohydrates (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                    <FormField control={form.control} name="fatGoal" render={({ field }) => ( <FormItem><FormLabel>Fat (g)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )}/>
                </form>
            </Form>

            {/* Right side: AI Assistant */}
            <div className="flex flex-col border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">AI Goal Assistant</h4>
                </div>
                 <ScrollArea className="flex-1 pr-3 mb-4 h-64">
                    <div className="space-y-4 text-sm">
                        {conversation.length === 0 && (
                            <div className="text-muted-foreground text-center py-10">Click "Ask AI" to start a conversation about your goals.</div>
                        )}
                        {conversation.map((entry, index) => (
                            <div key={index} className={`p-3 rounded-lg ${entry.role === 'assistant' ? 'bg-muted' : 'bg-primary/10'}`}>
                                {entry.content}
                            </div>
                        ))}
                        {isAiPending && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    </div>
                </ScrollArea>
                
                {aiQuestion ? (
                    <div className="mt-auto space-y-2">
                        <Label htmlFor="user-response">Your Answer</Label>
                        <div className="flex gap-2">
                            <Textarea id="user-response" value={userResponse} onChange={(e) => setUserResponse(e.target.value)} placeholder="Type your answer here..."/>
                            <Button type="button" size="icon" onClick={handleAskAI} disabled={isAiPending || !userResponse}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                     <Button type="button" onClick={handleAskAI} disabled={isAiPending || conversation.length > 0} className="mt-auto">
                        <Sparkles className="mr-2 h-4 w-4" /> Ask AI
                    </Button>
                )}
            </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button type="submit" onClick={form.handleSubmit(onSubmit)} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
