"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Logo } from "./icons";
import { seedUserData } from "@/app/actions";
import { getAuth, createUserWithEmailAndPassword, AuthErrorCodes } from "firebase/auth";
import { app } from "@/lib/firebase";


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  signUpCode: z.string().min(1, { message: "Sign-up code is required." }),
});

export function SignupForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      signUpCode: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsPending(true);
    const SIGNUP_CODE = "testing123";
    if (values.signUpCode !== SIGNUP_CODE) {
        toast({
            variant: "destructive",
            title: "Sign-up Failed",
            description: "Invalid sign-up code.",
        });
        setIsPending(false);
        return;
    }

    try {
        const auth = getAuth(app);
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const userId = userCredential.user.uid;

        // After successful user creation, seed the database with initial data for that user.
        await seedUserData(userId);
        
        const idToken = await userCredential.user.getIdToken(true);

        const response = await fetch('/api/auth/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Session creation failed after sign-up.");
        }

        toast({
            title: "Account Created!",
            description: "Welcome to CookSmart! You've been logged in.",
        });
        
        router.push("/");

    } catch (error: any) {
         let errorMessage = "An unexpected error occurred. Please try again.";
        switch (error.code) {
            case AuthErrorCodes.EMAIL_EXISTS:
                errorMessage = "This email is already in use. Please try another.";
                break;
            case AuthErrorCodes.INVALID_EMAIL:
                errorMessage = "The email address is not valid. Please check and try again.";
                break;
            case AuthErrorCodes.WEAK_PASSWORD:
                errorMessage = "The password is too weak. It must be at least 6 characters long.";
                break;
            default:
                console.error("Firebase SignUp Error:", error.code, error.message);
        }
        toast({
            variant: "destructive",
            title: "Sign-up Failed",
            description: errorMessage,
        });
    } finally {
        setIsPending(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
            <Logo className="w-12 h-12 text-primary" />
        </div>
        <CardTitle>Create an Account</CardTitle>
        <CardDescription>Enter your details to get started.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="signUpCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sign-up Code</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="Your invite code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign Up
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}