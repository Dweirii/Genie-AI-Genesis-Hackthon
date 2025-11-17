import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { InboxIcon, LibraryBigIcon, PaletteIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";

export const DashboardView = () => {
  return (
    <div className="flex h-full flex-1 flex-col gap-y-6 bg-muted p-6">
      <div className="flex flex-col gap-y-2">
        <h1 className="text-3xl font-bold">Welcome to your Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your conversations, customize your widget, and configure your settings.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InboxIcon className="h-5 w-5" />
              Conversations
            </CardTitle>
            <CardDescription>
              View and manage all your customer conversations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/conversations">View Conversations</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LibraryBigIcon className="h-5 w-5" />
              Knowledge Base
            </CardTitle>
            <CardDescription>
              Upload and manage your knowledge base files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/files">Manage Files</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PaletteIcon className="h-5 w-5" />
              Customization
            </CardTitle>
            <CardDescription>
              Customize your widget appearance and settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/customization">Customize Widget</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

