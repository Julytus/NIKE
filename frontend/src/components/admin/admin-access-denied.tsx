import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@tanstack/react-router";
import { AlertCircle, Home } from "lucide-react";

export function AdminAccessDenied() {
  return (
    <div className="bg-muted/30 flex min-h-[60vh] items-center justify-center rounded-xl p-6">
      <Card className="bg-background shadow-foreground/5 w-full max-w-lg rounded-3xl border-0 shadow-xl">
        <CardContent className="flex flex-col items-center gap-8 py-12 text-center">
          <div className="bg-destructive/10 text-destructive flex h-20 w-20 items-center justify-center rounded-full">
            <AlertCircle className="h-10 w-10" />
          </div>
          <div className="space-y-3">
            <h1 className="text-foreground text-4xl font-bold tracking-tight">
              Access Denied
            </h1>
            <div className="text-muted-foreground text-lg">
              <p>You don&apos;t have permission to view this page.</p>
              <p>Please contact support if you think this is a mistake.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="rounded-full px-8">
              <Link to="/">
                <Home className="mr-2 h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
