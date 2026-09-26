import { Percent, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type FeeEditorProps = {
  value: string;
  currentValue: string;
  isSaving: boolean;
  errorMessage: string | null;
  onChange: (value: string) => void;
  onSave: () => void;
};

export function FeeEditor({
  value,
  currentValue,
  isSaving,
  errorMessage,
  onChange,
  onSave,
}: FeeEditorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-display-sm">
          <Percent className="h-5 w-5 text-foreground" />
          Platform Fee
        </CardTitle>
        <CardDescription>
          Update the percentage the platform keeps from new bookings. Completed
          bookings retain their stored earnings split.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-xl bg-soft p-4">
          <p className="text-sm text-muted-foreground">Current fee</p>
          <p className="mt-1 font-display text-display-md">{currentValue}%</p>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium">New fee percentage</span>
          <Input
            type="number"
            min="0"
            step="0.1"
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="10"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            This setting is used for new booking calculations and earnings
            snapshots.
          </p>
          <Button onClick={onSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? "Saving..." : "Save Fee"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
