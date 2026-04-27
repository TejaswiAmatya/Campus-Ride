import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { apiClient } from "@/api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AnnouncementResponse = {
  data: {
    id: string;
    subject: string;
    message: string;
    createdAt: string;
  };
};

export function SendAnnouncementPage() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const sendAnnouncementMutation = useMutation({
    mutationFn: async (payload: { subject: string; message: string }) => {
      const response = await apiClient.post<AnnouncementResponse>(
        "/api/admin/announcements",
        payload,
      );
      return response.data.data;
    },
    onSuccess: () => {
      setSubject("");
      setMessage("");
      setFormError(null);
      setSuccessMessage("Announcement sent to all users");
    },
    onError: () => {
      setSuccessMessage(null);
      setFormError("Unable to send announcement right now. Please try again.");
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedSubject || !trimmedMessage) {
      setSuccessMessage(null);
      setFormError("Subject and message are required.");
      return;
    }

    setFormError(null);
    setSuccessMessage(null);
    sendAnnouncementMutation.mutate({
      subject: trimmedSubject,
      message: trimmedMessage,
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Send Announcement</h1>
          <p className="text-sm text-muted-foreground">
            Broadcast a message to connected users now and queue it for anyone
            who logs in later.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Announcement Details</CardTitle>
          <CardDescription>
            All logged-in users will receive this as a popup notification.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label htmlFor="announcement-subject" className="text-sm font-medium">
                Subject
              </label>
              <Input
                id="announcement-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ride service update"
                disabled={sendAnnouncementMutation.isPending}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="announcement-message" className="text-sm font-medium">
                Message
              </label>
              <textarea
                id="announcement-message"
                rows={4}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Enter the announcement message all users should see."
                disabled={sendAnnouncementMutation.isPending}
                className="flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {successMessage ? (
              <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {successMessage}
              </p>
            ) : null}

            {formError ? (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              disabled={sendAnnouncementMutation.isPending}
              className="w-full sm:w-auto"
            >
              {sendAnnouncementMutation.isPending
                ? "Sending..."
                : "Send to All Users"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
