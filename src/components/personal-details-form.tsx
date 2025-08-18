
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { ShieldCheck } from "lucide-react";
import { getPersonalDetails, savePersonalDetails } from "@/lib/data";
import { useEffect } from "react";

const formSchema = z.object({
  healthGoals: z.string().max(500, {
    message: "Health goals cannot exceed 500 characters.",
  }).optional(),
  dietaryRestrictions: z.string().max(500, {
    message: "Dietary restrictions cannot exceed 500 characters.",
  }).optional(),
  allergies: z.string().max(500, {
    message: "Allergies cannot exceed 500 characters.",
  }).optional(),
  favoriteFoods: z.string().max(500, {
    message: "Favorite foods cannot exceed 500 characters.",
  }).optional(),
    dislikedFoods: z.string().max(500, {
    message: "Disliked foods cannot exceed 500 characters.",
    }).optional(),
    healthConditions: z.string().max(500, {
    message: "Health conditions cannot exceed 500 characters.",
    }).optional(),
    medications: z.string().max(500, {
    message: "Medications cannot exceed 500 characters.",
    }).optional(),
    specializedEquipment: z.string().max(500, {
        message: "Equipment list cannot exceed 500 characters.",
    }).optional(),
});

export function PersonalDetailsForm() {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      healthGoals: "",
      dietaryRestrictions: "",
      allergies: "",
      favoriteFoods: "",
      dislikedFoods: "",
      healthConditions: "",
      medications: "",
      specializedEquipment: "",
    },
  });

  useEffect(() => {
    async function loadDetails() {
      const details = await getPersonalDetails();
      form.reset(details);
    }
    loadDetails();
  }, [form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await savePersonalDetails(values);
    toast({
      title: "Details Saved",
      description: "Your personal information has been updated.",
    });
  }

  return (
    <div className="space-y-6">
       <Card className="bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-900/80">
        <CardHeader className="flex-row gap-4 items-center">
            <ShieldCheck className="w-8 h-8 text-green-600 dark:text-green-400" />
            <div>
                <CardTitle className="text-green-900 dark:text-green-300">End-to-End Encrypted</CardTitle>
                <CardDescription className="text-green-800 dark:text-green-400/80">
                    Your personal information is encrypted and secure. Only you can see it.
                </CardDescription>
            </div>
        </CardHeader>
      </Card>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle>Diet & Goals</CardTitle>
                    <CardDescription>This information is optional, but the more details you provide, the more tailored your meal suggestions will be.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="healthGoals"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Health Goals</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., lose 10 pounds, build muscle, maintain a healthy weight"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    <FormField
                        control={form.control}
                        name="dietaryRestrictions"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Dietary Restrictions</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., vegetarian, gluten-free, no dairy"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />

                    <FormField
                        control={form.control}
                        name="allergies"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Allergies</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., peanuts, shellfish, soy"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Food Preferences</CardTitle>
                    <CardDescription>Tell us what you love and what you don't to get better meal suggestions.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="favoriteFoods"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Favorite Foods</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., salmon, avocado, dark chocolate, spicy food"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="dislikedFoods"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Disliked Foods</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., mushrooms, olives, cilantro"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Health</CardTitle>
                    <CardDescription>Providing health details helps us recommend foods that are safe and beneficial for your specific needs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="healthConditions"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Health Conditions</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., Diabetes, high blood pressure, fatty liver disease"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                     <FormField
                        control={form.control}
                        name="medications"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Medications</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., Metformin, Lisinopril. Please note any food interactions."
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Kitchen Equipment</CardTitle>
                    <CardDescription>Let us know about any special cooking supplies you have.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="specializedEquipment"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Special Cooking Supplies</FormLabel>
                            <FormControl>
                                <Textarea
                                placeholder="e.g., Air Fryer, Slow Cooker, Instant Pot, Rice Cooker"
                                className="resize-none"
                                {...field}
                                />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                </CardContent>
            </Card>


            <div className="flex justify-end">
                <Button type="submit">Save All Changes</Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
