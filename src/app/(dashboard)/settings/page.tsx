"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSettings } from "@/hooks/use-settings"
import { useToast } from "@/hooks/use-toast"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function SettingsPage() {
  const { settings, updateSettings, isLoaded } = useSettings();
  const [threshold, setThreshold] = useState(settings.disappearanceThresholdDays);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoaded) {
      setThreshold(settings.disappearanceThresholdDays);
    }
  }, [isLoaded, settings.disappearanceThresholdDays]);

  const handleSave = () => {
    updateSettings({ disappearanceThresholdDays: Number(threshold) });
    toast({
      title: "Settings Saved",
      description: "Your changes have been successfully saved.",
    });
  };

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold font-headline tracking-tight">Settings</h1>
          <p className="mt-2 text-muted-foreground">
            Tweak the application's behavior and heuristics to fit your needs.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Heuristics</CardTitle>
            <CardDescription>
              Configure the parameters used for identifying issues in your data.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoaded ? (
              <div className="space-y-2">
                <Label htmlFor="disappearance-threshold">Disappeared Machine Threshold (Days)</Label>
                <Input
                  id="disappearance-threshold"
                  type="number"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="max-w-xs"
                  min="1"
                />
                <p className="text-sm text-muted-foreground">
                  A machine will be flagged as 'disappeared' if it hasn't been seen for this many days.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 max-w-xs" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}
            <Button onClick={handleSave} disabled={!isLoaded}>Save Changes</Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
